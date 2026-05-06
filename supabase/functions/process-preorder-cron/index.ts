import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[Preorder-Cron] Checking for due preorders...');

    // Find paid preorders where scheduled_fulfill_at has passed
    const now = new Date().toISOString();
    const { data: dueOrders, error } = await supabase
      .from('preorder_orders')
      .select('id, game_name, package_name, player_id, scheduled_fulfill_at')
      .eq('status', 'paid')
      .not('scheduled_fulfill_at', 'is', null)
      .lte('scheduled_fulfill_at', now)
      .limit(20);

    if (error) {
      console.error('[Preorder-Cron] Query error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dueOrders || dueOrders.length === 0) {
      console.log('[Preorder-Cron] No due preorders found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Preorder-Cron] Found ${dueOrders.length} due preorder(s)`);

    let processed = 0;
    let failed = 0;

    for (const order of dueOrders) {
      console.log(`[Preorder-Cron] Processing order ${order.id} (scheduled: ${order.scheduled_fulfill_at})`);

      try {
        // Call process-topup with fulfill action
        const response = await fetch(`${supabaseUrl}/functions/v1/process-topup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            action: 'fulfill',
            orderId: order.id,
            isPreorder: true,
          }),
        });

        const result = await response.json();
        console.log(`[Preorder-Cron] Result for ${order.id}:`, JSON.stringify(result));

        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error(`[Preorder-Cron] Error processing ${order.id}:`, err);
        failed++;
      }
    }

    console.log(`[Preorder-Cron] Done. Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ processed, failed, total: dueOrders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[Preorder-Cron] Fatal error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
