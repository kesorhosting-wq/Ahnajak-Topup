import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function getWebhookSecret(): Promise<string | null> {
  const { data } = await supabase
    .from("payment_gateways")
    .select("config")
    .eq("slug", "ahnajak-khqr")
    .maybeSingle();
  return (data?.config as any)?.webhook_secret || null;
}

async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const rawBody = await req.text();
  const sigHeader = req.headers.get("x-khqr-signature") || "";
  const tsHeader = req.headers.get("x-khqr-timestamp") || "";
  const ts = Number(tsHeader);

  const secret = await getWebhookSecret();
  if (!secret) {
    console.error("[ahnajak-khqr-webhook] secret not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 500, headers: corsHeaders });
  }

  if (!sigHeader || !ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response(JSON.stringify({ error: "Invalid timestamp" }), { status: 401, headers: corsHeaders });
  }

  // Signature is "t=...,v1=..." per docs. Be lenient and also accept raw hex.
  const v1 = sigHeader.split(",").find((p) => p.trim().startsWith("v1="))?.slice(3) ?? sigHeader.trim();
  const expected = await hmacHex(secret, `${ts}.${rawBody}`);
  if (!(await constantTimeEqual(v1, expected))) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const { event, external_order_id, amount, transaction_id } = payload;
  if (event !== "transaction.paid" || !external_order_id) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), { status: 200, headers: corsHeaders });
  }

  // Look up order in either table
  const tables = ["topup_orders", "preorder_orders"] as const;
  let found: { table: typeof tables[number]; id: string; amount: number; status: string } | null = null;
  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select("id, amount, status")
      .eq("id", external_order_id)
      .maybeSingle();
    if (data) {
      found = { table, id: data.id, amount: Number(data.amount), status: String(data.status) };
      break;
    }
  }
  if (!found) {
    return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
  }

  if (Number.isFinite(Number(amount)) && Math.abs(Number(amount) - found.amount) > 0.01) {
    console.error("[ahnajak-khqr-webhook] Amount mismatch", { external_order_id, gw: amount, db: found.amount });
    return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400, headers: corsHeaders });
  }

  // Idempotent transition
  if (!["paid", "processing", "completed", "failed"].includes(found.status.toLowerCase())) {
    const { error } = await supabase
      .from(found.table)
      .update({
        status: "paid",
        payment_method: "KHQR",
        ...(transaction_id ? { g2bulk_order_id: transaction_id } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", found.id)
      .in("status", ["pending", "notpaid", "awaiting_payment"]);
    if (error) {
      console.error("[ahnajak-khqr-webhook] update error", error);
      return new Response(JSON.stringify({ error: "DB update failed" }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
