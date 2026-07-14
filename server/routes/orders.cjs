/**
 * routes/orders.cjs — topup_orders CRUD + polling endpoint (replaces Supabase Realtime)
 */
const express = require('express');
const { query, queryOne, uuid } = require('../db.cjs');
const { requireAuth, requireAdmin, optionalAuth } = require('../auth.cjs');

const router = express.Router();

// List orders — admin gets all, user gets their own
router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = await requireAdminCheck(req.user.id);
    let rows;
    if (isAdmin) {
      [rows] = await query('SELECT * FROM topup_orders ORDER BY created_at DESC LIMIT 500');
    } else {
      [rows] = await query('SELECT * FROM topup_orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Polling endpoint for the realtime order widget (admin only)
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const isAdmin = await requireAdminCheck(req.user.id);
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const [rows] = await query(
      'SELECT id, game_name, package_name, player_id, amount, currency, status, created_at, updated_at FROM topup_orders ORDER BY created_at DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order by id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await queryOne('SELECT * FROM topup_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const isAdmin = await requireAdminCheck(req.user.id);
    if (!isAdmin && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order (anyone — guest checkout allowed, status forced to 'pending')
router.post('/', optionalAuth, async (req, res) => {
  const b = req.body;
  const id = uuid();
  try {
    // Pricing protection: Retrieve actual price from the database to prevent pricing tampering
    let dbPrice = null;
    let pkg = null;
    
    if (b.g2bulk_product_id) {
      pkg = await queryOne('SELECT price FROM packages WHERE g2bulk_product_id = ?', [b.g2bulk_product_id]);
      if (!pkg) {
        pkg = await queryOne('SELECT price FROM special_packages WHERE g2bulk_product_id = ?', [b.g2bulk_product_id]);
      }
    }
    
    if (!pkg && b.game_name && b.package_name) {
      const game = await queryOne('SELECT id FROM games WHERE name = ?', [b.game_name]);
      if (game) {
        pkg = await queryOne('SELECT price FROM packages WHERE game_id = ? AND name = ?', [game.id, b.package_name]);
        if (!pkg) {
          pkg = await queryOne('SELECT price FROM special_packages WHERE game_id = ? AND name = ?', [game.id, b.package_name]);
        }
      }
    }
    
    if (pkg) {
      dbPrice = parseFloat(pkg.price);
    }
    
    const finalAmount = dbPrice !== null ? dbPrice : b.amount;

    await query(
      `INSERT INTO topup_orders (id, user_id, game_name, package_name, player_id, server_id, player_name, amount, currency, payment_method, g2bulk_product_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, req.user?.id || null, b.game_name, b.package_name, b.player_id, b.server_id || null, b.player_name || null, finalAmount, b.currency || 'USD', b.payment_method || null, b.g2bulk_product_id || null]
    );
    const order = await queryOne('SELECT * FROM topup_orders WHERE id = ?', [id]);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const allowed = ['status', 'status_message', 'g2bulk_order_id', 'card_codes', 'payment_method'];
  const sets = [], values = [];
  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      values.push(f === 'card_codes' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (sets.length === 0) return res.json({ success: true });
  values.push(id);
  try {
    await query(`UPDATE topup_orders SET ${sets.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Internal helper (not exported as route)
async function requireAdminCheck(userId) {
  const { hasRole } = require('../auth.cjs');
  return hasRole(userId, 'admin');
}

module.exports = router;
