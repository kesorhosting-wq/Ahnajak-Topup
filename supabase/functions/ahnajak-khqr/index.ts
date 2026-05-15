import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PAID_STATES = new Set(["paid", "success", "completed", "succeeded"]);

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceKey);

interface KhqrConfig {
  api_key: string;
  webhook_secret?: string;
  base_url?: string;
  merchant_name?: string;
  merchant_id?: string;
}

async function loadConfig(): Promise<KhqrConfig | null> {
  const { data } = await supabase
    .from("payment_gateways")
    .select("config, enabled")
    .eq("slug", "ahnajak-khqr")
    .maybeSingle();
  if (!data || !data.enabled) return null;
  const cfg = (data.config || {}) as KhqrConfig;
  if (!cfg.api_key) return null;
  return cfg;
}

function baseUrl(cfg: KhqrConfig) {
  return (cfg.base_url || "https://apikhqr.kesor.cam").replace(/\/$/, "") + "/api/v1";
}

function isPaidStatus(payload: any): boolean {
  if (!payload) return false;
  const candidates = [
    payload.status,
    payload?.transaction?.status,
    payload?.data?.status,
    payload?.data?.transaction?.status,
  ];
  if (candidates.some((s) => typeof s === "string" && PAID_STATES.has(s.toLowerCase()))) return true;
  if (payload.paid === true || payload.is_paid === true) return true;
  if (payload?.data?.paid === true || payload?.data?.is_paid === true) return true;
  return false;
}

async function findOrder(orderId: string) {
  const { data: t } = await supabase
    .from("topup_orders")
    .select("id, amount, status")
    .eq("id", orderId)
    .maybeSingle();
  if (t) return { table: "topup_orders" as const, ...t };
  const { data: p } = await supabase
    .from("preorder_orders")
    .select("id, amount, status")
    .eq("id", orderId)
    .maybeSingle();
  if (p) return { table: "preorder_orders" as const, ...p };
  return null;
}

async function markPaid(table: "topup_orders" | "preorder_orders", orderId: string, txId?: string) {
  // Idempotent: only flip from non-final states
  const { data, error } = await supabase
    .from(table)
    .update({
      status: "paid",
      payment_method: "KHQR",
      ...(txId ? { g2bulk_order_id: txId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .in("status", ["pending", "notpaid", "awaiting_payment"])
    .select("id")
    .maybeSingle();
  if (error) console.error("[ahnajak-khqr] markPaid error", error);
  return !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body?.action as string;
  if (!action) return json({ error: "Missing action" }, 400);

  const cfg = await loadConfig();
  if (!cfg) return json({ error: "KHQR gateway not configured" }, 400);
  const api = baseUrl(cfg);
  const authHeader = { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" };

  try {
    if (action === "test-connection") {
      const r = await fetch(`${api}/me`, { headers: authHeader });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return json({ success: false, error: data?.message || `HTTP ${r.status}` }, 200);
      return json({ success: true, merchant: data?.merchant ?? null });
    }

    if (action === "generate-qr") {
      const { orderId } = body;
      if (!orderId) return json({ error: "orderId is required" }, 400);
      const order = await findOrder(orderId);
      if (!order) return json({ error: "Order not found" }, 404);

      const amount = Math.round(Number(order.amount) * 100) / 100;
      const billNumber = `ORD-${String(orderId).slice(0, 8)}-${Date.now().toString().slice(-6)}`.slice(0, 25);
      const idempotencyOrderId = String(orderId).slice(0, 64);

      const qrReq = await fetch(`${api}/qr`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          amount,
          currency: "USD",
          bill_number: billNumber,
          order_id: idempotencyOrderId,
          expires_in_seconds: body.expires_in_seconds ?? 900,
          ...(cfg.merchant_name ? { store_label: cfg.merchant_name.slice(0, 25) } : {}),
        }),
      });
      const qrJson: any = await qrReq.json().catch(() => ({}));
      if (!qrReq.ok || !qrJson?.qr) {
        return json({ error: qrJson?.message || `Gateway error ${qrReq.status}` }, 502);
      }

      const qrCodeData = await QRCode.toDataURL(qrJson.qr, { width: 512, margin: 1 });

      return json({
        qrCodeData,
        qrString: qrJson.qr,
        md5: qrJson.md5,
        orderId,
        amount,
        currency: qrJson.currency || "USD",
      });
    }

    if (action === "check-status") {
      const { orderId, md5, is_preorder } = body;
      if (!orderId && !md5) return json({ error: "orderId or md5 required" }, 400);

      // 1. Try by md5 first (cheaper / direct)
      let gatewayPayload: any = null;
      if (md5) {
        const r = await fetch(`${api}/transaction/check`, {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({ md5 }),
        });
        gatewayPayload = await r.json().catch(() => ({}));
      }

      // 2. Fallback by order_id
      if (!isPaidStatus(gatewayPayload) && orderId) {
        const r = await fetch(`${api}/transaction/by-order`, {
          method: "POST",
          headers: authHeader,
          body: JSON.stringify({ order_id: String(orderId).slice(0, 64) }),
        });
        const byOrder = await r.json().catch(() => ({}));
        if (isPaidStatus(byOrder)) gatewayPayload = byOrder;
      }

      const paid = isPaidStatus(gatewayPayload);

      // If gateway says paid AND DB still pending → flip atomically
      if (paid && orderId) {
        const order = await findOrder(orderId);
        if (order && !["paid", "processing", "completed", "failed"].includes(String(order.status).toLowerCase())) {
          // Verify amount matches before marking paid
          const gwAmount = Number(gatewayPayload?.amount ?? gatewayPayload?.data?.amount ?? NaN);
          if (Number.isFinite(gwAmount) && Math.abs(gwAmount - Number(order.amount)) > 0.01) {
            console.warn("[ahnajak-khqr] Amount mismatch on check", {
              orderId,
              dbAmount: order.amount,
              gwAmount,
            });
          } else {
            await markPaid(order.table, orderId, gatewayPayload?.transaction_id);
          }
        }
      }

      // Always return latest DB status as source of truth
      const order = orderId ? await findOrder(orderId) : null;
      return json({
        status: order?.status ?? (paid ? "paid" : "pending"),
        gateway_status: paid ? "paid" : "pending",
        orderId,
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[ahnajak-khqr] error", err);
    return json({ error: err?.message || "Internal error" }, 500);
  }
});
