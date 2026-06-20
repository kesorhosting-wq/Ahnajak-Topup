import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return toHex(buf);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orderId, amount, remark, returnUrl } = await req.json();
    if (!orderId || amount == null) {
      return new Response(JSON.stringify({ error: "Missing orderId or amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: gateway, error: gErr } = await supabase
      .from("payment_gateways")
      .select("config, enabled")
      .eq("slug", "khqrcc")
      .maybeSingle();

    if (gErr || !gateway?.enabled) {
      return new Response(JSON.stringify({ error: "Gateway disabled or not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config: any = gateway.config || {};
    if (!config.secret_key || !config.profile_id || !config.checkout_url) {
      return new Response(JSON.stringify({ error: "Gateway not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const success_url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/khqrcc-webhook?transaction_id=${orderId}`;
    const safeRemark = String(remark ?? "");
    const plainHash = config.secret_key + orderId + amount + success_url + safeRemark;
    const hash = await sha1Hex(plainHash);

    const params = new URLSearchParams({
      transaction_id: String(orderId),
      amount: String(amount),
      success_url,
      remark: safeRemark,
      hash,
    });

    const url = `${String(config.checkout_url).replace(/\/$/, "")}/${config.profile_id}?${params.toString()}`;
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("khqrcc-payment error", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
