import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sha1 } from "https://deno.land/x/sha1@v1.0.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { orderId, amount, remark } = await req.json();

  const { data: gateway } = await supabase
    .from("payment_gateways")
    .select("config")
    .eq("slug", "khqrcc")
    .single();

  const config = gateway?.config;
  if (!config) return new Response(JSON.stringify({ error: "Gateway not configured" }), { status: 500, headers: corsHeaders });

  const success_url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/khqrcc-webhook`;
  const plainHash = config.secret_key + orderId + amount + success_url + remark;
  const hash = sha1(plainHash);

  const params = new URLSearchParams({
    transaction_id: orderId,
    amount: String(amount),
    success_url: success_url,
    remark: remark,
    hash: hash
  });

  return new Response(JSON.stringify({ url: `${config.checkout_url}/${config.profile_id}?${params.toString()}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
