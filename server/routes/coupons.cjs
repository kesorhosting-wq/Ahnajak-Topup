/**
 * routes/coupons.cjs — coupon validation + apply (replaces RPC apply_coupon)
 * POST /api/coupons/apply  { code, order_amount }  → { success, discount_amount }
 * GET  /api/coupons         — list user's coupons (auth)
 */
const express = require('express');
const { query, queryOne, uuid } = require('../db.cjs');
const { requireAuth } = require('../auth.cjs');

const router = express.Router();

// Apply coupon (auth — needs user_id to validate ownership)
router.post('/apply', requireAuth, async (req, res) => {
  const { code, order_amount } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Coupon code required' });

  try {
    const coupon = await queryOne(
      `SELECT * FROM coupons WHERE code = ? AND user_id = ? AND is_used = 0
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [code.trim().toUpperCase(), req.user.id]
    );

    if (!coupon) {
      return res.json({ success: false, message: 'Invalid, expired, or already used coupon' });
    }

    let discount = 0;
    if (coupon.discount_type === 'fixed') {
      discount = parseFloat(coupon.discount_value);
    } else if (coupon.discount_type === 'percent') {
      discount = (parseFloat(order_amount) * parseFloat(coupon.discount_value)) / 100;
    }

    if (discount > parseFloat(order_amount)) {
      discount = parseFloat(order_amount);
    }

    // Mark coupon as used
    await query('UPDATE coupons SET is_used = 1, used_at = NOW() WHERE id = ?', [coupon.id]);

    res.json({ success: true, discount_amount: discount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// List user's coupons (auth)
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM coupons WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
