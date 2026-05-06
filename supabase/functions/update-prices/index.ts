import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get API key from api_configurations
    const { data: apiConfig } = await supabase
      .from('api_configurations')
      .select('api_secret, is_enabled')
      .eq('api_name', 'g2bulk')
      .maybeSingle();

    if (!apiConfig?.is_enabled || !apiConfig?.api_secret) {
      return new Response(
        JSON.stringify({ success: false, error: 'G2Bulk API not configured or disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = apiConfig.api_secret;

    // 2. Sync latest prices from G2Bulk API into g2bulk_products
    const allProducts: Array<{ g2bulk_product_id: string; price: number }> = [];

    // Fetch game catalogues
    const gamesRes = await fetch(`${G2BULK_API_URL}/games`, {
      headers: { 'Accept': 'application/json', 'X-API-Key': apiKey },
    });
    const gamesResult = await gamesRes.json();

    if (gamesResult.success && gamesResult.games) {
      for (const game of gamesResult.games) {
        try {
          const catRes = await fetch(`${G2BULK_API_URL}/games/${game.code}/catalogue`, {
            headers: { 'Accept': 'application/json', 'X-API-Key': apiKey },
          });
          const catResult = await catRes.json();
          if (catResult.success && catResult.catalogues) {
            for (const cat of catResult.catalogues) {
              allProducts.push({
                g2bulk_product_id: `game_${game.code}_${cat.id}`,
                price: parseFloat(cat.amount) || 0,
              });
            }
          }
        } catch (_e) { /* skip failed games */ }
      }
    }

    // Fetch card/voucher products
    const prodRes = await fetch(`${G2BULK_API_URL}/products`, {
      headers: { 'Accept': 'application/json', 'X-API-Key': apiKey },
    });
    const prodResult = await prodRes.json();
    if (prodResult.success && prodResult.products) {
      for (const p of prodResult.products) {
        allProducts.push({
          g2bulk_product_id: `card_${p.id}`,
          price: parseFloat(p.unit_price) || 0,
        });
      }
    }

    // Update g2bulk_products prices
    const priceMap = new Map<string, number>();
    for (const p of allProducts) {
      priceMap.set(p.g2bulk_product_id, p.price);
    }

    // Update g2bulk_products table with latest prices
    for (const [productId, newPrice] of priceMap) {
      await supabase
        .from('g2bulk_products')
        .update({ price: newPrice, updated_at: new Date().toISOString() })
        .eq('g2bulk_product_id', productId);
    }

    // 3. Now update all packages that have a markup % set
    const tables = ['packages', 'special_packages', 'preorder_packages'] as const;
    let totalUpdated = 0;
    const details: Array<{ table: string; name: string; old_price: number; new_price: number; cost: number; markup: number }> = [];

    for (const table of tables) {
      const { data: pkgs } = await supabase
        .from(table)
        .select('id, name, price, g2bulk_product_id, price_markup_percent')
        .not('g2bulk_product_id', 'is', null)
        .not('price_markup_percent', 'is', null);

      if (!pkgs || pkgs.length === 0) continue;

      for (const pkg of pkgs) {
        const costPrice = priceMap.get(pkg.g2bulk_product_id!);
        if (costPrice === undefined || costPrice <= 0) continue;

        const markup = Number(pkg.price_markup_percent);
        if (isNaN(markup)) continue;

        const newPrice = Math.round(costPrice * (1 + markup / 100) * 100) / 100;

        if (newPrice !== Number(pkg.price)) {
          await supabase
            .from(table)
            .update({ price: newPrice, updated_at: new Date().toISOString() })
            .eq('id', pkg.id);

          details.push({
            table,
            name: pkg.name,
            old_price: Number(pkg.price),
            new_price: newPrice,
            cost: costPrice,
            markup,
          });
          totalUpdated++;
        }
      }
    }

    console.log(`[update-prices] Updated ${totalUpdated} packages, synced ${priceMap.size} G2Bulk prices`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          g2bulk_prices_synced: priceMap.size,
          packages_updated: totalUpdated,
          details,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-prices] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
