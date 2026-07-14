/**
 * routes/wallet.cjs — wallet transactions + balance (replaces process_wallet_transaction RPC)
 */
const express = require('express');
const { query, queryOne, uuid } = require('../db.cjs');
const { requireAuth, requireAdmin } = require('../auth.cjs');

const router = express.Router();

// Get user's wallet balance + transactions (auth)
router.get('/', requireAuth, async (req, res) => {
  try {
    const profile = await queryOne('SELECT wallet_balance FROM profiles WHERE user_id = ?', [req.user.id]);
    const [transactions] = await query('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [req.user.id]);
    res.json({ balance: parseFloat(profile?.wallet_balance || 0), transactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Process a wallet transaction atomically (replaces RPC process_wallet_transaction)
// Called internally by process-topup and other backend routes, not exposed to frontend directly.
async function processWalletTransaction(userId, type, amount, description = null, referenceId = null) {
  const conn = await require('../db.cjs').pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT wallet_balance FROM profiles WHERE user_id = ? FOR UPDATE', [userId]);
    if (!rows.length) throw new Error('User profile not found');

    const currentBalance = parseFloat(rows[0].wallet_balance || 0);
    const newBalance = currentBalance + parseFloat(amount);

    if (parseFloat(amount) < 0 && newBalance < 0) {
      throw new Error('Insufficient balance');
    }

    const txId = uuid();
    await conn.query(
      `INSERT INTO wallet_transactions (id, user_id, type, amount, balance_before, balance_after, description, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, userId, type, amount, currentBalance, newBalance, description, referenceId]
    );
    await conn.query('UPDATE profiles SET wallet_balance = ?, updated_at = NOW() WHERE user_id = ?', [newBalance, userId]);

    await conn.commit();
    return { success: true, transaction_id: txId, new_balance: newBalance, balance_before: currentBalance };
  } catch (err) {
    await conn.rollback();
    return { success: false, error: err.message };
  } finally {
    conn.release();
  }
}

// Top up wallet (admin only)
router.post('/topup', requireAuth, requireAdmin, async (req, res) => {
  const { amount, description, reference_id } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  try {
    const result = await processWalletTransaction(req.user.id, 'topup', parseFloat(amount), description || 'Wallet topup', reference_id || null);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, processWalletTransaction };
