/**
 * routes/points.cjs — reward points + exchange (replaces RPC exchange_points_for_coupon)
 * GET  /api/points/configs    — list active exchange configs (public)
 * POST /api/points/exchange   { config_id }  → { success, coupon_code }
 * GET  /api/points/transactions — list user's point transactions (auth)
 */
const express = require('express');
const { query, queryOne, uuid } = require('../db.cjs');
const { requireAuth, requireAdmin } = require('../auth.cjs');

const router = express.Router();

// List active exchange configs (public)
router.get('/configs', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM point_exchange_configs WHERE is_active = 1 ORDER BY points_required ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List all configs (admin — for management)
router.get('/configs/all', requireAdmin, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM point_exchange_configs ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create/update/delete config (admin)
router.post('/configs', requireAdmin, async (req, res) => {
  const b = req.body;
  const id = uuid();
  try {
    await query(
      `INSERT INTO point_exchange_configs (id, name, description, points_required, exchange_type, exchange_value, coupon_valid_days, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, b.name, b.description || null, b.points_required, b.exchange_type, b.exchange_value, b.coupon_valid_days ?? 30, b.is_active ?? 1]
    );
    res.json(await queryOne('SELECT * FROM point_exchange_configs WHERE id = ?', [id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/configs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const sets = [], values = [];
  for (const f of ['name', 'description', 'points_required', 'exchange_type', 'exchange_value', 'coupon_valid_days', 'is_active']) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (!sets.length) return res.json({ success: true });
  values.push(id);
  try { await query(`UPDATE point_exchange_configs SET ${sets.join(', ')} WHERE id = ?`, values); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/configs/:id', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM point_exchange_configs WHERE id = ?', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Exchange points for coupon (auth — replaces RPC exchange_points_for_coupon)
router.post('/exchange', requireAuth, async (req, res) => {
  const { config_id } = req.body;
  if (!config_id) return res.status(400).json({ success: false, message: 'config_id required' });

  try {
    const config = await queryOne('SELECT * FROM point_exchange_configs WHERE id = ? AND is_active = 1', [config_id]);
    if (!config) return res.json({ success: false, message: 'Exchange config not found or inactive' });

    // Use raw pool for transaction with row lock to prevent race conditions
    const conn = await require('../db.cjs').pool.getConnection();
    try {
      await conn.beginTransaction();

      const [profileRows] = await conn.query('SELECT reward_points FROM profiles WHERE user_id = ? FOR UPDATE', [req.user.id]);
      const profile = profileRows[0];
      if (!profile) {
        await conn.rollback(); conn.release();
        return res.json({ success: false, message: 'Profile not found' });
      }

      const userPoints = parseInt(profile.reward_points || 0, 10);
      if (userPoints < config.points_required) {
        await conn.rollback(); conn.release();
        return res.json({ success: false, message: 'Insufficient points' });
      }

      // Generate coupon code
      const couponCode = uuid().replace(/-/g, '').substring(0, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (config.coupon_valid_days || 30));

      // Deduct points
      await conn.query('UPDATE profiles SET reward_points = reward_points - ? WHERE user_id = ?', [config.points_required, req.user.id]);
      // Create coupon
      await conn.query(
        'INSERT INTO coupons (id, code, user_id, discount_type, discount_value, is_used, expires_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [uuid(), couponCode, req.user.id, config.exchange_type, config.exchange_value, expiresAt]
      );
      // Log transaction
      await conn.query(
        'INSERT INTO point_transactions (id, user_id, amount, transaction_type, description, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid(), req.user.id, -config.points_required, 'exchange', `Exchanged for coupon ${couponCode}`, config.id]
      );

      await conn.commit();
      conn.release();
      res.json({ success: true, coupon_code: couponCode });
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List user's point transactions (auth)
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
