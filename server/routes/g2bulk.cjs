/**
 * routes/g2bulk.cjs — G2Bulk API proxy (replaces edge fn g2bulk-api, ~844 lines)
 * Also handles G2Bulk webhook callbacks.
 */
const express = require('express');
const { query, queryOne } = require('../db.cjs');
const { requireAuth, requireAdmin } = require('../auth.cjs');

const router = express.Router();
const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

function g2bulkHeaders(apiKey) {
  return { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-API-Key': apiKey };
}

async function getApiKey() {
  const cfg = await queryOne("SELECT * FROM api_configurations WHERE api_name = 'g2bulk'");
  if (!cfg?.is_enabled || !cfg?.api_secret) return null;
  return cfg.api_secret;
}

// ── Proxy endpoint ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { action, ...params } = req.body;
  if (!action) return res.status(400).json({ success: false, error: 'action is required' });

  // Actions requiring admin
  const adminActions = new Set([
    'get_account_balance', 'sync_products', 'bulk_import_all', 'sync_games_batch',
    'sync_game_catalogue', 'get_orders', 'get_game_orders', 'get_transactions',
    'create_game_order', 'purchase_product',
  ]);

  // Actions requiring auth
  const authActions = new Set(['check_player_id']);

  // Check auth requirements
  if (adminActions.has(action)) {
    const { requireAdmin: ra } = require('../auth.cjs');
    const isAdm = await ra.handler(req, res); // can't call middleware inline easily
    // Use a simple inline check
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { hasRole } = require('../auth.cjs');
    if (!(await hasRole(req.user.id, 'admin'))) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
  } else if (authActions.has(action)) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const apiKey = await getApiKey();
  if (!apiKey) return res.status(400).json({ success: false, error: 'G2Bulk API not configured. Set up in Admin → API tab.' });

  const headers = g2bulkHeaders(apiKey);
  let url, method = 'GET', body;

  switch (action) {
    case 'get_account_balance': url = '/getMe'; break;
    case 'get_categories': url = '/category'; break;
    case 'get_products': url = '/products'; break;
    case 'get_category_products': url = `/category/${params.category_id}`; break;
    case 'get_games': url = '/games'; break;
    case 'get_game_catalogue': url = `/games/${params.game_code}/catalogue`; break;
    case 'get_game_fields': url = '/games/fields'; method = 'POST'; body = { game: params.game_code }; break;
    case 'get_game_servers': url = '/games/servers'; method = 'POST'; body = { game: params.game_code }; break;
    case 'check_player_id': url = '/games/checkPlayerId'; method = 'POST'; body = { game: params.game_code, user_id: params.user_id, server_id: params.server_id }; break;
    case 'create_game_order': url = `/games/${params.game_code}/order`; method = 'POST'; body = { catalogue_name: params.catalogue_name, player_id: params.player_id, server_id: params.server_id, remark: params.remark, callback_url: params.callback_url }; break;
    case 'check_order_status': url = '/games/order/status'; method = 'POST'; body = { order_id: params.order_id, game: params.game_code }; break;
    case 'get_game_orders': url = '/games/orders'; break;
    case 'get_orders': url = '/orders'; break;
    case 'purchase_product': url = `/products/${params.product_id}/purchase`; method = 'POST'; body = { quantity: params.quantity || 1 }; break;
    case 'get_transactions': url = '/transactions'; break;
    case 'sync_products':
      return res.json(await syncProducts(apiKey));
    case 'sync_games_batch':
      return res.json(await syncGamesAndCatalogues(apiKey, params.gameCodes?.split(',') || []));
    default:
      return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  }

  try {
    const fetchOptions = { method, headers };
    if (body) fetchOptions.body = JSON.stringify(body);
    const response = await fetch(`${G2BULK_API_URL}${url}`, fetchOptions);
    const data = await response.json().catch(() => ({ raw: 'non-json-response' }));
    res.json(data);
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// ── Product sync ────────────────────────────────────────────────────────────
async function syncProducts(apiKey) {
  const headers = g2bulkHeaders(apiKey);
  const allProducts = [];
  let count = 0;

  try {
    // Sync games + catalogues
    const gamesRes = await fetch(`${G2BULK_API_URL}/games`, { headers });
    const gamesData = await gamesRes.json();
    if (gamesData.success && gamesData.games) {
      for (const game of gamesData.games) {
        const catRes = await fetch(`${G2BULK_API_URL}/games/${game.code}/catalogue`, { headers });
        const catData = await catRes.json();
        if (catData.success && catData.catalogues) {
          for (const cat of catData.catalogues) {
            allProducts.push({
              g2bulk_type_id: String(cat.id), g2bulk_product_id: `game_${game.code}_${cat.id}`,
              game_name: game.name, product_name: cat.name, denomination: cat.name,
              price: parseFloat(cat.amount) || 0, currency: 'USD',
              fields: JSON.stringify({ game_code: game.code }),
              product_type: 'recharge',
            });
          }
        }
      }
    }

    // Sync card products
    const prodRes = await fetch(`${G2BULK_API_URL}/products`, { headers });
    const prodData = await prodRes.json();
    if (prodData.success && prodData.products) {
      for (const prod of prodData.products) {
        allProducts.push({
          g2bulk_type_id: '', g2bulk_product_id: `card_${prod.id}`,
          game_name: prod.name, product_name: prod.name,
          denomination: prod.name, price: parseFloat(prod.amount) || 0,
          currency: 'USD', fields: JSON.stringify({}), product_type: 'card',
        });
      }
    }

    // Upsert into g2bulk_products
    for (const p of allProducts) {
      await query(
        `INSERT INTO g2bulk_products (id, g2bulk_type_id, g2bulk_product_id, game_name, product_name, denomination, price, currency, fields, is_active, product_type)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE game_name = VALUES(game_name), product_name = VALUES(product_name), denomination = VALUES(denomination), price = VALUES(price), fields = VALUES(fields), product_type = VALUES(product_type)`,
        [p.g2bulk_type_id, p.g2bulk_product_id, p.game_name, p.product_name, p.denomination, p.price, p.currency, p.fields, p.product_type]
      );
      count++;
    }

    return { success: true, synced: count };
  } catch (err) {
    console.error('Sync error:', err.message);
    return { success: false, error: err.message, synced: count };
  }
}

async function syncGamesAndCatalogues(apiKey, gameCodes) {
  return syncProducts(apiKey); // Full sync for simplicity
}

// ── G2Bulk webhook ──────────────────────────────────────────────────────────
router.post('/g2bulk-webhook', async (req, res) => {
  const body = req.body;
  const remark = body.remark || '';
  // Extract our order ID from the remark (format: "order_id:..._1ofN")
  const orderMatch = remark.match(/order_id:([a-f0-9-]+)/);
  if (!orderMatch) return res.status(200).json({ received: true, note: 'No order_id in remark' });

  const orderId = orderMatch[1];
  const g2bulkStatus = body.status || '';

  // Find the order in our tables
  let order = await queryOne('SELECT * FROM topup_orders WHERE id = ?', [orderId]);
  let table = 'topup_orders';

  if (!order) {
    order = await queryOne('SELECT * FROM preorder_orders WHERE id = ?', [orderId]);
    table = 'preorder_orders';
  }

  if (!order) return res.status(200).json({ received: true, note: 'Order not found' });

  let newStatus = order.status;
  if (g2bulkStatus === 'COMPLETED' || g2bulkStatus === 'completed') {
    newStatus = 'completed';
    // Grant points on completion
    try { await grantCompletionPoints(order, table); } catch {}
  } else if (g2bulkStatus === 'FAILED' || g2bulkStatus === 'failed' || g2bulkStatus === 'CANCELLED') {
    newStatus = 'failed';
  }

  await query(`UPDATE ${table} SET status = ?, status_message = ? WHERE id = ?`,
    [newStatus, `G2Bulk callback: ${g2bulkStatus}`, orderId]);
  res.json({ received: true, orderId, oldStatus: order.status, newStatus });
});

async function grantCompletionPoints(order, table) {
  if (!order.user_id) return;
  // Get points from package tables
  let points = 0;
  for (const pTable of ['packages', 'special_packages', 'preorder_packages']) {
    const pkg = await queryOne(
      `SELECT points FROM ${pTable} WHERE name = ? AND game_id IN (SELECT id FROM games WHERE name = ?)`,
      [order.package_name, order.game_name]
    );
    if (pkg?.points) { points = pkg.points; break; }
  }
  if (points > 0) {
    await query('UPDATE profiles SET reward_points = reward_points + ? WHERE user_id = ?', [points, order.user_id]);
    await query('INSERT INTO point_transactions (id, user_id, amount, transaction_type, description, reference_id) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [order.user_id, points, 'earn', `Earned from ${order.game_name} - ${order.package_name}`, order.id]);
  }
}

module.exports = router;