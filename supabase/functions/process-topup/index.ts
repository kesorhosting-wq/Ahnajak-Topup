import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAuthoritativePackage } from "../_shared/orderPricing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured logging helper
function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'process-topup',
    message,
    ...data,
  };
  if (level === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else if (level === 'WARN') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

// Telegram notification function
async function sendTelegramNotification(message: string, isError: boolean = false) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  
  if (!botToken || !chatId) {
    console.log('[Telegram] Bot token or chat ID not configured, skipping notification');
    return;
  }

  const emoji = isError ? '❌' : '✅';
  const formattedMessage = `${emoji} ${message}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] Failed to send notification:', result.description);
    } else {
      console.log('[Telegram] Notification sent successfully');
    }
  } catch (error) {
    console.error('[Telegram] Error sending notification:', error);
  }
}

// Determine if product is card/voucher type or direct game recharge
async function getProductType(supabase: any, productId: string): Promise<'card' | 'recharge'> {
  const { data: product } = await supabase
    .from('g2bulk_products')
    .select('product_type')
    .eq('g2bulk_product_id', productId)
    .maybeSingle();
  
  return product?.product_type === 'card' ? 'card' : 'recharge';
}

function extractQuantityFromPackageName(packageName?: string | null): number | null {
  if (!packageName) return null;

  const patterns = [/(?:x|×)\s*(\d+)\b/i, /\b(\d+)\s*(?:x|×)\b/i];
  for (const pattern of patterns) {
    const match = packageName.match(pattern);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    if (Number.isFinite(quantity) && quantity > 1) {
      return quantity;
    }
  }

  return null;
}

// Fulfill card/voucher order (immediate delivery of codes/keys)
async function fulfillCardOrder(
  supabase: any, 
  orderId: string,
  quantity: number, 
  order: any, 
  apiKey: string,
  tableName: string = 'topup_orders'
) {
  console.log(`[Fulfill-Card] Creating card order for: ${orderId}`);

  // Extract product_id from g2bulk_product_id (format: card_ID)
  const productId = order.g2bulk_product_id.replace('card_', '');

  const allDeliveryItems: any[] = [];
  const allOrderIds: string[] = [];
  let lastError = '';

  console.log(`[Fulfill-Card] Will trigger ${quantity} purchase(s) for order: ${orderId}`);

  for (let i = 0; i < quantity; i++) {
    console.log(`[Fulfill-Card] Purchase ${i + 1}/${quantity}`);
    
    const response = await fetch(`${G2BULK_API_URL}/products/${productId}/purchase`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ quantity: 1 })
    });

    const result = await response.json();
    console.log(`[Fulfill-Card] G2Bulk response (${i + 1}/${quantity}):`, JSON.stringify(result));

    if (result.success) {
      const g2bulkOrderId = result.order_id || result.transaction_id;
      allOrderIds.push(String(g2bulkOrderId));
      const deliveryItems = result.delivery_items || [];
      allDeliveryItems.push(...deliveryItems.map((item: string) => ({
        code: item, serial: '', expire: ''
      })));
    } else {
      lastError = result.message || result.detail?.message || 'Card purchase failed';
      console.error(`[Fulfill-Card] Purchase ${i + 1} failed: ${lastError}`);
    }
  }

  if (allOrderIds.length > 0) {
    const g2bulkOrderIdStr = allOrderIds.join(',');
    const statusMessage = `G2Bulk Card Order: ${g2bulkOrderIdStr}. ${allDeliveryItems.length} code(s) delivered (${allOrderIds.length}/${quantity} succeeded).`;

    await supabase
      .from(tableName)
      .update({ 
        g2bulk_order_id: g2bulkOrderIdStr,
        status: allOrderIds.length === quantity ? 'completed' : 'partial',
        status_message: statusMessage,
        card_codes: allDeliveryItems.length > 0 ? allDeliveryItems : null
      })
      .eq('id', orderId);

    await sendTelegramNotification(
      `<b>Card Order ${allOrderIds.length === quantity ? 'Completed' : 'Partial'}</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name} (×${quantity})\n` +
      `👤 Player: ${order.player_id}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `📋 G2Bulk Orders: ${g2bulkOrderIdStr}\n` +
      `🎫 Codes: ${allDeliveryItems.length} delivered`
    );

    return { success: true, g2bulk_order_id: g2bulkOrderIdStr, status: allOrderIds.length === quantity ? 'completed' : 'partial', cards: allDeliveryItems };
  } else {
    await supabase
      .from(tableName)
      .update({ 
        status: 'failed',
        status_message: `G2Bulk Card Error: ${lastError}`
      })
      .eq('id', orderId);

    await sendTelegramNotification(
      `<b>Card Order Failed</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name} (×${quantity})\n` +
      `👤 Player: ${order.player_id}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `⚠️ Error: ${lastError}`,
      true
    );

    return { success: false, error: lastError };
  }
}

// Fulfill direct game recharge order
async function fulfillRechargeOrder(
  supabase: any, 
  orderId: string, 
  order: any, 
  apiKey: string,
  quantity: number = 1,
  tableName: string = 'topup_orders'
) {
  console.log(`[Fulfill-Recharge] ========== START ==========`);
  console.log(`[Fulfill-Recharge] Order ID: ${orderId}`);
  console.log(`[Fulfill-Recharge] g2bulk_product_id: ${order.g2bulk_product_id}`);
  console.log(`[Fulfill-Recharge] player_id: ${order.player_id}`);
  console.log(`[Fulfill-Recharge] server_id: ${order.server_id}`);

  let gameCode = '';
  let catalogueName = '';

  // PRIORITY 1: Get from g2bulk_products table (most accurate source)
  // This table has the exact game_code and catalogue_name from G2Bulk
  const { data: g2bulkProduct } = await supabase
    .from('g2bulk_products')
    .select('fields, product_name, g2bulk_product_id')
    .eq('g2bulk_product_id', order.g2bulk_product_id)
    .maybeSingle();

  if (g2bulkProduct) {
    // fields contains { game_code: "..." }
    if (g2bulkProduct.fields?.game_code) {
      gameCode = g2bulkProduct.fields.game_code;
    }
    // product_name is the exact catalogue_name from G2Bulk
    if (g2bulkProduct.product_name) {
      catalogueName = g2bulkProduct.product_name;
    }
    console.log(`[Fulfill-Recharge] From g2bulk_products: gameCode=${gameCode}, catalogueName=${catalogueName}`);
  }

  // PRIORITY 2: Extract game_code and catalogue_id from g2bulk_product_id format: game_{CODE}_{id}
  let catalogueId = '';
  if (order.g2bulk_product_id?.startsWith('game_')) {
    const parts = order.g2bulk_product_id.split('_');
    // Format: game_CODE_id - extract CODE (can have underscores like ragnarok_idle)
    if (parts.length >= 3) {
      // Last part is the catalogue ID
      catalogueId = parts[parts.length - 1];
      // Remove 'game' prefix and last part (id) to get game code
      if (!gameCode) {
        gameCode = parts.slice(1, -1).join('_');
      }
      console.log(`[Fulfill-Recharge] Extracted gameCode: ${gameCode}, catalogueId: ${catalogueId}`);
    }
  }

  // PRIORITY 3: Fallback to packages + games table for game_code
  if (!gameCode) {
    console.log(`[Fulfill-Recharge] Looking up from packages/games tables...`);
    
    const { data: packageData } = await supabase
      .from('packages')
      .select('name, g2bulk_type_id, games!inner(g2bulk_category_id)')
      .eq('g2bulk_product_id', order.g2bulk_product_id)
      .maybeSingle();
    
    if (packageData) {
      if (!gameCode && packageData.games?.g2bulk_category_id) {
        gameCode = packageData.games.g2bulk_category_id;
        console.log(`[Fulfill-Recharge] Got gameCode from games.g2bulk_category_id: ${gameCode}`);
      }
      if (!catalogueId && packageData.g2bulk_type_id) {
        catalogueId = packageData.g2bulk_type_id;
        console.log(`[Fulfill-Recharge] Got catalogueId from package.g2bulk_type_id: ${catalogueId}`);
      }
    }
  }

  // PRIORITY 4: Fetch catalogue name from G2Bulk API using catalogueId
  if (gameCode && catalogueId && !catalogueName) {
    console.log(`[Fulfill-Recharge] Fetching catalogue from G2Bulk API for game: ${gameCode}, catalogueId: ${catalogueId}`);
    try {
      const catalogueResponse = await fetch(`${G2BULK_API_URL}/games/${gameCode}/catalogue`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey,
        },
      });
      
      const catalogueData = await catalogueResponse.json();
      if (catalogueData.success && catalogueData.catalogues && Array.isArray(catalogueData.catalogues)) {
        const matchedCatalogue = catalogueData.catalogues.find(
          (c: { id: number; name: string }) => c.id.toString() === catalogueId
        );
        if (matchedCatalogue) {
          catalogueName = matchedCatalogue.name;
          console.log(`[Fulfill-Recharge] Found catalogue from API: ${catalogueName} (id: ${catalogueId})`);

          // Also sync this to g2bulk_products for future use
          try {
            await supabase
              .from('g2bulk_products')
              .upsert({
                g2bulk_type_id: catalogueId,
                g2bulk_product_id: order.g2bulk_product_id,
                game_name: order.game_name || gameCode,
                product_name: catalogueName,
                denomination: catalogueName,
                price: parseFloat(matchedCatalogue.amount) || 0,
                currency: 'USD',
                fields: { game_code: gameCode },
                product_type: 'recharge',
              }, { onConflict: 'g2bulk_product_id' });
            console.log(`[Fulfill-Recharge] Synced product to g2bulk_products table`);
          } catch (syncErr) {
            console.log(`[Fulfill-Recharge] Could not sync product (non-critical): ${syncErr}`);
          }
        }
      }
    } catch (catalogueError) {
      console.error(`[Fulfill-Recharge] Error fetching catalogue: ${catalogueError}`);
    }
  }

  // PRIORITY 5: If still no catalogueName, try using g2bulk_type_id from packages directly
  if (!catalogueName && catalogueId) {
    // Use catalogueId as the catalogue_name if we have it (some G2Bulk games accept ID as name)
    console.log(`[Fulfill-Recharge] Fallback: Using catalogueId (${catalogueId}) as catalogue reference`);
    
    // Try to get by catalogue ID directly from the API endpoint
    try {
      const catalogueResponse = await fetch(`${G2BULK_API_URL}/games/${gameCode}/catalogue`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey,
        },
      });
      
      const catalogueData = await catalogueResponse.json();
      if (catalogueData.success && catalogueData.catalogues) {
        // Try to find by id
        for (const cat of catalogueData.catalogues) {
          if (String(cat.id) === catalogueId) {
            catalogueName = cat.name;
            console.log(`[Fulfill-Recharge] Found in second attempt: ${catalogueName}`);
            break;
          }
        }
      }
    } catch (e) {
      console.log(`[Fulfill-Recharge] Second catalogue fetch failed: ${e}`);
    }
  }

  // Validate required data
  if (!gameCode) {
    const errorMsg = `Could not determine game_code for product: ${order.g2bulk_product_id}`;
    console.error(`[Fulfill-Recharge] ERROR: ${errorMsg}`);
    await supabase
      .from(tableName)
      .update({ 
        status: 'failed',
        status_message: errorMsg
      })
      .eq('id', orderId);
    return { success: false, error: errorMsg };
  }

  if (!catalogueName) {
    const errorMsg = `Could not determine catalogue_name for product: ${order.g2bulk_product_id}`;
    console.error(`[Fulfill-Recharge] ERROR: ${errorMsg}`);
    await supabase
      .from(tableName)
      .update({ 
        status: 'failed',
        status_message: errorMsg
      })
      .eq('id', orderId);
    return { success: false, error: errorMsg };
  }

  // Build callback URL for status updates
  const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/g2bulk-webhook`;

  const allOrderIds: string[] = [];
  let failedCount = 0;
  let lastError = '';
  let lastStatus = '';

  console.log(`[Fulfill-Recharge] Will trigger ${quantity} order(s) for order: ${orderId}`);

  for (let i = 0; i < quantity; i++) {
    console.log(`[Fulfill-Recharge] Order ${i + 1}/${quantity}`);

    // Build order body for G2Bulk API
    const orderBody: Record<string, string> = {
      catalogue_name: catalogueName,
      player_id: order.player_id,
      remark: `order_id:${orderId}_${i + 1}of${quantity}`,
      callback_url: callbackUrl,
    };

    if (order.server_id) {
      orderBody.server_id = order.server_id;
    }

    console.log(`[Fulfill-Recharge] API URL: ${G2BULK_API_URL}/games/${gameCode}/order`);
    console.log(`[Fulfill-Recharge] Request body:`, JSON.stringify(orderBody));

    const response = await fetch(`${G2BULK_API_URL}/games/${gameCode}/order`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(orderBody)
    });

    const result = await response.json();
    console.log(`[Fulfill-Recharge] G2Bulk response (${i + 1}/${quantity}):`, JSON.stringify(result));

    if (result.success && result.order) {
      allOrderIds.push(String(result.order.order_id));
      lastStatus = result.order.status;
    } else {
      failedCount++;
      lastError = result.message || result.detail?.message || JSON.stringify(result);
      console.error(`[Fulfill-Recharge] Order ${i + 1} failed: ${lastError}`);
    }
  }

  if (allOrderIds.length > 0) {
    const g2bulkOrderIdStr = allOrderIds.join(',');
    const successCount = allOrderIds.length;
    
    let finalStatus = 'processing';
    let statusMessage = `G2Bulk Orders: ${g2bulkOrderIdStr}. ${successCount}/${quantity} sent.`;
    
    if (lastStatus === 'COMPLETED' && failedCount === 0) {
      finalStatus = 'completed';
      statusMessage = `Successfully delivered via G2Bulk (×${quantity}). Orders: ${g2bulkOrderIdStr}`;
    } else if (failedCount > 0 && failedCount < quantity) {
      finalStatus = 'partial';
      statusMessage = `Partial delivery: ${successCount}/${quantity} succeeded. Orders: ${g2bulkOrderIdStr}`;
    } else if (failedCount === quantity) {
      finalStatus = 'failed';
      statusMessage = `All ${quantity} G2Bulk orders failed. Error: ${lastError}`;
    }

    await supabase
      .from(tableName)
      .update({ 
        g2bulk_order_id: g2bulkOrderIdStr,
        status: finalStatus,
        status_message: statusMessage
      })
      .eq('id', orderId);

    await sendTelegramNotification(
      `<b>Recharge Order ${finalStatus === 'completed' ? 'Completed' : finalStatus === 'partial' ? 'Partial' : 'Processing'}</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name} (×${quantity})\n` +
      `👤 Player: ${order.player_id}${order.server_id ? ` (Server: ${order.server_id})` : ''}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `📋 G2Bulk Orders: ${g2bulkOrderIdStr}\n` +
      `✅ Success: ${successCount}/${quantity}`,
      failedCount > 0
    );

    console.log(`[Fulfill-Recharge] ========== ${finalStatus.toUpperCase()} ==========`);
    return { success: true, g2bulk_order_id: g2bulkOrderIdStr, status: finalStatus };
  } else {
    console.error(`[Fulfill-Recharge] All ${quantity} orders failed: ${lastError}`);
    await supabase
      .from(tableName)
      .update({ 
        status: 'failed',
        status_message: `G2Bulk Error (×${quantity}): ${lastError}`
      })
      .eq('id', orderId);

    await sendTelegramNotification(
      `<b>Recharge Order Failed</b>\n` +
      `🎮 Game: ${order.game_name}\n` +
      `📦 Package: ${order.package_name} (×${quantity})\n` +
      `👤 Player: ${order.player_id}${order.server_id ? ` (Server: ${order.server_id})` : ''}\n` +
      `💰 Amount: $${order.amount}\n` +
      `🔢 Order ID: ${orderId}\n` +
      `⚠️ Error: ${lastError}`,
      true
    );

    console.log(`[Fulfill-Recharge] ========== FAILED ==========`);
    return { success: false, error: lastError };
  }
}

async function fulfillG2BulkOrder(supabase: any, orderId: string, tableName: string = 'topup_orders') {
  console.log(`[Fulfill] ========== STARTING G2BULK FULFILLMENT ==========`);
  console.log(`[Fulfill] Order ID: ${orderId}, Table: ${tableName}`);
  
  const { data: order, error: orderError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  
  if (orderError || !order) {
    console.error('[Fulfill] Order not found:', orderError);
    return { success: false, error: 'Order not found' };
  }

  // ATOMIC GUARD: Prevent double-execution by using conditional update.
  // Only proceed if we can atomically change status from an allowed state to 'processing'.
  // This prevents race conditions where two calls both see 'paid' before either updates.
  const allowedStatuses = ['paid', 'pending', 'notpaid'];
  if (!allowedStatuses.includes(order.status)) {
    console.log(`[Fulfill] Order already ${order.status}, skipping to prevent double-execution`);
    return { success: true, status: order.status, message: 'Already processed' };
  }

  // Atomic update: only succeeds if status is still in allowed states
  console.log(`[Fulfill] Attempting atomic lock for order ${orderId} (current status: ${order.status})`);
  const { data: lockResult, error: lockError } = await supabase
    .from(tableName)
    .update({ 
      status: 'processing',
      status_message: 'Processing order with G2Bulk...'
    })
    .eq('id', orderId)
    .in('status', allowedStatuses)
    .select('id');

  if (lockError || !lockResult || lockResult.length === 0) {
    console.log(`[Fulfill] Could not lock order ${orderId} - another process already claimed it`);
    return { success: true, status: 'processing', message: 'Already being processed by another call' };
  }
  console.log(`[Fulfill] Successfully locked order ${orderId} for processing`);

  console.log(`[Fulfill] Order found:`, JSON.stringify({
    id: order.id,
    g2bulk_product_id: order.g2bulk_product_id,
    player_id: order.player_id,
    status: order.status
  }));

  let g2bulkProductId: string | null = order.g2bulk_product_id;

  // If order doesn't have g2bulk_product_id, try to resolve it from packages/special_packages
  if (!g2bulkProductId) {
    console.log('[Fulfill] No g2bulk_product_id on order; attempting to resolve from packages...');

    const { data: pkg } = await supabase
      .from('packages')
      .select('g2bulk_product_id, games!inner(name)')
      .eq('name', order.package_name)
      .eq('games.name', order.game_name)
      .maybeSingle();

    if (pkg?.g2bulk_product_id) {
      g2bulkProductId = pkg.g2bulk_product_id;
    } else {
      const { data: spkg } = await supabase
        .from('special_packages')
        .select('g2bulk_product_id, games!inner(name)')
        .eq('name', order.package_name)
        .eq('games.name', order.game_name)
        .maybeSingle();

      if (spkg?.g2bulk_product_id) {
        g2bulkProductId = spkg.g2bulk_product_id;
      }
    }

    if (g2bulkProductId) {
      console.log(`[Fulfill] Resolved g2bulk_product_id=${g2bulkProductId} for order ${orderId}`);
      await supabase
        .from(tableName)
        .update({ g2bulk_product_id: g2bulkProductId })
        .eq('id', orderId);
    }
  }

  if (!g2bulkProductId) {
    console.log('[Fulfill] No G2Bulk product linked (and could not resolve), marking as manual fulfillment');
    await supabase
      .from(tableName)
      .update({ 
        status: 'pending_manual',
        status_message: 'No G2Bulk product linked. Please link a package to a G2Bulk product in admin, then retry.'
      })
      .eq('id', orderId);
    return { success: true, status: 'pending_manual' };
  }

  const g2bulkProductIdFinal = g2bulkProductId as string;

  const { data: apiConfig } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('api_name', 'g2bulk')
    .maybeSingle();

  if (!apiConfig?.is_enabled || !apiConfig.api_secret) {
    console.log('[Fulfill] G2Bulk not configured, marking as manual fulfillment');
    await supabase
      .from(tableName)
      .update({ 
        status: 'pending_manual',
        status_message: 'G2Bulk API not configured. Manual fulfillment required.'
      })
      .eq('id', orderId);
    return { success: true, status: 'pending_manual' };
  }

  const apiKey = apiConfig.api_secret;

  try {
    // Resolve fulfillment quantity deterministically from package tables.
    // Key match order: game_name + package_name + g2bulk_product_id + amount (price).
    // If quantity is null/invalid, default to 1.
    let fulfillQuantity = 1;
    let quantitySource = 'default(1)';

    const targetAmount = Number(order.amount ?? 0);
    const amountTolerance = 0.0001;

    const resolveQuantityFromTable = async (table: 'packages' | 'special_packages' | 'preorder_packages') => {
      const { data: rows, error } = await supabase
        .from(table)
        .select('quantity, price, amount, updated_at, games!inner(name)')
        .eq('g2bulk_product_id', g2bulkProductIdFinal)
        .eq('name', order.package_name)
        .eq('games.name', order.game_name)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn(`[Fulfill] Quantity lookup error on ${table}:`, error.message);
        return null;
      }

      if (!rows || rows.length === 0) {
        return null;
      }

      const normalizedRows = rows.map((r: any) => {
        const parsedQty = Number(r?.quantity);
        const normalizedQty = Number.isFinite(parsedQty) && parsedQty > 0 ? Math.floor(parsedQty) : 1;
        const parsedPrice = Number(r?.price);
        const normalizedPrice = Number.isFinite(parsedPrice) ? parsedPrice : null;
        const diff = Number.isFinite(targetAmount) && normalizedPrice !== null
          ? Math.abs(normalizedPrice - targetAmount)
          : null;

        return {
          quantity: normalizedQty,
          price: normalizedPrice,
          amountLabel: String(r?.amount ?? ''),
          updated_at: String(r?.updated_at ?? ''),
          diff,
        };
      });

      const distinctQuantities = new Set(normalizedRows.map((r: any) => r.quantity));

      // 1) Strong match: exact/near-exact price match
      const exactPriceMatch = normalizedRows.find((r: any) => r.diff !== null && r.diff <= amountTolerance);
      if (exactPriceMatch) {
        return {
          quantity: exactPriceMatch.quantity,
          source: `${table}(price_exact)`
        };
      }

      // 2) Soft match: nearest price if unambiguous enough (handles rounding deltas)
      const nearestByPrice = normalizedRows
        .filter((r: any) => r.diff !== null)
        .sort((a: any, b: any) => (a.diff as number) - (b.diff as number))[0];

      if (nearestByPrice && (nearestByPrice.diff as number) <= 0.02) {
        return {
          quantity: nearestByPrice.quantity,
          source: `${table}(price_nearest)`
        };
      }

      // 3) If rows are ambiguous and no price confidence, fail-safe to qty=1 (prevents over-charge)
      if (distinctQuantities.size > 1) {
        console.warn(
          `[Fulfill] Ambiguous quantity rows in ${table} for game='${order.game_name}', package='${order.package_name}', product='${g2bulkProductIdFinal}', amount='${order.amount}'. ` +
          `No confident price match; fail-safe qty=1.`
        );
        return {
          quantity: 1,
          source: `${table}(ambiguous_default_1)`
        };
      }

      // 4) Non-ambiguous rows: use the only known quantity
      return {
        quantity: normalizedRows[0].quantity,
        source: `${table}(single_quantity_group)`
      };
    };

    const fromPackages = await resolveQuantityFromTable('packages');
    const fromSpecial = fromPackages ? null : await resolveQuantityFromTable('special_packages');
    const fromPreorder = (!fromPackages && !fromSpecial)
      ? await resolveQuantityFromTable('preorder_packages')
      : null;

    const resolved = fromPackages ?? fromSpecial ?? fromPreorder;
    if (resolved) {
      fulfillQuantity = resolved.quantity;
      quantitySource = resolved.source;
    }

    console.log(`[Fulfill] Package quantity: ${fulfillQuantity} (source: ${quantitySource})`);

    // Update status message with quantity info (status already set to 'processing' by atomic lock)
    await supabase
      .from(tableName)
      .update({ 
        status_message: `Sending to G2Bulk for fulfillment (×${fulfillQuantity})...`
      })
      .eq('id', orderId);

    // Determine product type and route to appropriate handler
    const orderForFulfillment = { ...order, g2bulk_product_id: g2bulkProductIdFinal };
    const productType = await getProductType(supabase, g2bulkProductIdFinal);
    console.log(`[Fulfill] Product type: ${productType}`);
    
    if (productType === 'card') {
      return await fulfillCardOrder(supabase, orderId, fulfillQuantity, orderForFulfillment, apiKey, tableName);
    } else {
      return await fulfillRechargeOrder(supabase, orderId, orderForFulfillment, apiKey, fulfillQuantity, tableName);
    }
  } catch (g2bulkError: any) {
    console.error('[Fulfill] G2Bulk processing error:', g2bulkError);
    await supabase
      .from(tableName)
      .update({ 
        status: 'failed',
        status_message: `G2Bulk error: ${g2bulkError.message || 'Unknown error'}`
      })
      .eq('id', orderId);
    return { success: false, error: g2bulkError.message };
  }
}

// Check G2Bulk order status and update our database
async function checkG2BulkOrderStatus(supabase: any, orderId: string) {
  console.log(`[CheckStatus] Checking G2Bulk status for order: ${orderId}`);
  
  const { data: order } = await supabase
    .from('topup_orders')
    .select('*')
    .eq('id', orderId)
    .single();
  
  if (!order?.g2bulk_order_id) {
    return { success: false, error: 'No G2Bulk order ID found' };
  }

  const { data: apiConfig } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('api_name', 'g2bulk')
    .single();

  if (!apiConfig?.is_enabled || !apiConfig.api_secret) {
    return { success: false, error: 'G2Bulk not configured' };
  }

  // Extract game code from g2bulk_products or product_id
  let gameCode = '';
  
  // Try g2bulk_products first
  const { data: g2bulkProduct } = await supabase
    .from('g2bulk_products')
    .select('fields')
    .eq('g2bulk_product_id', order.g2bulk_product_id)
    .maybeSingle();

  if (g2bulkProduct?.fields?.game_code) {
    gameCode = g2bulkProduct.fields.game_code;
  } else if (order.g2bulk_product_id?.startsWith('game_')) {
    // Fallback: extract from product_id
    const parts = order.g2bulk_product_id.split('_');
    if (parts.length >= 3) {
      gameCode = parts.slice(1, -1).join('_');
    }
  }

  if (!gameCode) {
    return { success: false, error: 'Could not determine game code' };
  }

  console.log(`[CheckStatus] Game code: ${gameCode}, G2Bulk order: ${order.g2bulk_order_id}`);

  const response = await fetch(`${G2BULK_API_URL}/games/order/status`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': apiConfig.api_secret,
    },
    body: JSON.stringify({
      order_id: parseInt(order.g2bulk_order_id),
      game: gameCode
    })
  });

  const result = await response.json();
  console.log(`[CheckStatus] G2Bulk response:`, JSON.stringify(result));

  if (result.success && result.order) {
    const g2bulkStatus = result.order.status;
    
    let finalStatus = order.status;
    if (g2bulkStatus === 'COMPLETED') {
      finalStatus = 'completed';
    } else if (g2bulkStatus === 'FAILED') {
      finalStatus = 'failed';
    }

    await supabase
      .from('topup_orders')
      .update({ 
        status: finalStatus,
        status_message: `G2Bulk Status: ${g2bulkStatus}`
      })
      .eq('id', orderId);

    return { success: true, g2bulk_status: g2bulkStatus, our_status: finalStatus };
  }

  return { success: false, error: result.message || 'Failed to check status' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const authHeader = req.headers.get('Authorization');
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

  try {
    const body = await req.json();
    
    // Handle fulfill action (called after payment confirmed)
    if (body.action === 'fulfill' && body.orderId) {
      const isPreorder = body.isPreorder === true;
      const tableName = isPreorder ? 'preorder_orders' : 'topup_orders';
      console.log('[Process-Topup] Fulfill action for order:', body.orderId, 'isPreorder:', isPreorder);
      
      // For preorders: check if this order has a scheduled_fulfill_at in the future
      // If so, skip fulfillment - the cron job will handle it at the right time
      if (isPreorder) {
        const { data: preorder } = await supabase
          .from('preorder_orders')
          .select('scheduled_fulfill_at, status')
          .eq('id', body.orderId)
          .maybeSingle();
        
        if (preorder?.scheduled_fulfill_at) {
          const scheduledTime = new Date(preorder.scheduled_fulfill_at).getTime();
          const now = Date.now();
          
          if (scheduledTime > now) {
            console.log(`[Process-Topup] Preorder ${body.orderId} is scheduled for ${preorder.scheduled_fulfill_at}, skipping auto-fulfill`);
            return new Response(
              JSON.stringify({ success: true, status: 'scheduled', message: `Pre-order scheduled for fulfillment at ${preorder.scheduled_fulfill_at}` }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.log(`[Process-Topup] Preorder ${body.orderId} scheduled time has passed, proceeding with fulfillment`);
        }
      }
      
      const result = await fulfillG2BulkOrder(supabase, body.orderId, tableName);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle check_status action
    if (body.action === 'check_status' && body.orderId) {
      console.log('[Process-Topup] Check status for order:', body.orderId);
      const result = await checkG2BulkOrderStatus(supabase, body.orderId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle create order action (initial order creation)
    const { 
      game_name,
      package_name,
      player_id,
      server_id,
      player_name,
      amount,
      currency,
      payment_method,
      g2bulk_product_id,
      user_id,
      is_preorder,
      scheduled_fulfill_at
    } = body;

    console.log('[Process-Topup] Creating order:', { game_name, package_name, player_id, g2bulk_product_id, is_preorder });

    const { data: { user } } = await userClient.auth.getUser();
    const userIdFromToken = user?.id ?? null;

    if (user_id && user_id !== userIdFromToken) {
      log('WARN', 'Suspicious user_id mismatch in create-order payload', {
        requestUserId: user_id,
        tokenUserId: userIdFromToken,
      });
    }

    if (is_preorder && !userIdFromToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required for pre-order checkout' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authoritativePackage = await resolveAuthoritativePackage(supabase, {
      gameName: game_name,
      packageName: package_name,
      g2bulkProductId: g2bulk_product_id,
      isPreorder: is_preorder === true,
    });

    if (!authoritativePackage) {
      log('WARN', 'Invalid package selection during order creation', {
        gameName: game_name,
        packageName: package_name,
        g2bulkProductId: g2bulk_product_id ?? null,
        isPreorder: is_preorder === true,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid package selection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authoritativeAmount = Number(authoritativePackage.price);
    const payloadAmount = Number(amount);
    if (Number.isFinite(payloadAmount) && Math.abs(payloadAmount - authoritativeAmount) > 0.0001) {
      log('WARN', 'Suspicious amount mismatch in create-order payload', {
        orderType: is_preorder ? 'preorder' : 'topup',
        gameName: game_name,
        packageName: package_name,
        payloadAmount,
        authoritativeAmount,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Amount does not match selected package price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which table to insert into
    const tableName = is_preorder ? 'preorder_orders' : 'topup_orders';
    const defaultStatus = is_preorder ? 'notpaid' : 'pending';

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from(tableName)
      .insert({
        game_name,
        package_name,
        player_id,
        server_id,
        player_name,
        amount: authoritativeAmount,
        currency: currency || 'USD',
        payment_method,
        g2bulk_product_id: authoritativePackage.g2bulkProductId || null,
        user_id: userIdFromToken,
        status: defaultStatus,
        ...(is_preorder && scheduled_fulfill_at ? { scheduled_fulfill_at } : {}),
      })
      .select()
      .single();

    if (orderError) {
      console.error('[Process-Topup] Order creation error:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Process-Topup] ${is_preorder ? 'Pre-order' : 'Order'} created:`, order.id);

    // Return order info - fulfillment will happen after payment is confirmed
    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: order.id,
        status: defaultStatus,
        has_g2bulk: !!g2bulk_product_id,
        is_preorder: !!is_preorder,
        message: is_preorder ? 'Pre-order created. Awaiting payment confirmation.' : 'Order created. Awaiting payment confirmation.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[Process-Topup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
