import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json();
  const { transaction_id, amount, status, req_time, hash: received_hash } = body;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: gateway } = await supabase
    .from("payment_gateways")
    .select("config")
    .eq("slug", "khqrcc")
    .single();

  const secret = (gateway?.config as any)?.secret_key;
  if (!secret) return new Response("Gateway config missing", { status: 500 });

  // Verify hash: sha256(secret + req_time + transaction_id + amount + "SUCCESS")
  const dataToHash = secret + req_time + transaction_id + amount + status;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dataToHash));
  const expectedHash = encodeHex(hashBuffer);

  if (expectedHash !== received_hash) return new Response("Invalid hash", { status: 403 });

  if (status === "SUCCESS") {
    // Update order to completed
    await supabase.from("topup_orders").update({ status: "completed" }).eq("id", transaction_id);
    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response("Not success", { status: 400 });
});
