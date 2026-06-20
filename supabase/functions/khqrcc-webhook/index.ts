import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(buf);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "KesorTopup Webhook Handler (POST only)" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const { transaction_id, status, req_time, hash: received_hash } = body;

    // Extract exact raw amount string to prevent decimal truncation issues (e.g. 5.00 parsing to 5)
    let amountStr = "";
    const amountMatch = rawBody.match(/"amount"\s*:\s*([0-9.]+)/);
    if (amountMatch) {
      amountStr = amountMatch[1];
    } else {
      amountStr = String(body.amount ?? "");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: gateway } = await supabase
      .from("payment_gateways")
      .select("config")
      .eq("slug", "khqrcc")
      .maybeSingle();

    const secret = (gateway?.config as any)?.secret_key;
    if (!secret) return new Response("Gateway config missing", { status: 500, headers: corsHeaders });

    const expectedHash = await sha256Hex(secret + req_time + transaction_id + amountStr + status);
    if (expectedHash !== received_hash) {
      return new Response("Invalid hash", { status: 403, headers: corsHeaders });
    }

    if (status === "SUCCESS") {
      await supabase.from("topup_orders").update({ status: "paid" }).eq("id", transaction_id);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not success", { status: 400, headers: corsHeaders });
  } catch (err: any) {
    console.error("khqrcc-webhook error", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
