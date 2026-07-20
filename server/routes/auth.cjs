/**
 * routes/auth.cjs — Authentication endpoints (replaces Supabase Auth)
 * POST /api/auth/signup   — register a new user
 * POST /api/auth/signin   — login, returns JWT
 * POST /api/auth/signout  — logout (client-side token removal)
 * GET  /api/auth/session  — validate current token, return user + admin flag
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { query, queryOne, uuid } = require('../db.cjs');
const { signToken, hashPassword, comparePassword, hasRole, requireAuth } = require('../auth.cjs');

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Check if email already exists
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const userId = uuid();
  const passwordHash = await hashPassword(password);
  const name = displayName || email.split('@')[0];

  try {
    await query('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, name]);

    // Create profile
    await query('INSERT INTO profiles (id, user_id, email, display_name, wallet_balance, reward_points) VALUES (?, ?, ?, ?, 0, 0)',
      [uuid(), userId, email, name]);

    // Assign default 'user' role
    await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [uuid(), userId, 'user']);

    const token = signToken({ id: userId, email, display_name: name });
    return res.json({
      user: { id: userId, email, display_name: name },
      session: { access_token: token },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

// Signin
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await queryOne('SELECT id, email, password_hash, display_name FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({ id: user.id, email: user.email, display_name: user.display_name });
  return res.json({
    user: { id: user.id, email: user.email, display_name: user.display_name },
    session: { access_token: token },
  });
});

// Signout (stateless JWT — client just removes the token)
router.post('/signout', (req, res) => {
  res.json({ success: true });
});

// Get current session
router.get('/session', requireAuth, async (req, res) => {
  const isAdmin = await hasRole(req.user.id, 'admin');
  const profile = await queryOne('SELECT reward_points, display_name, email, wallet_balance FROM profiles WHERE user_id = ?', [req.user.id]);
  return res.json({
    id: req.user.id,
    user_id: req.user.id,
    email: req.user.email,
    display_name: req.user.display_name,
    isAdmin,
    reward_points: profile?.reward_points || 0,
    wallet_balance: profile?.wallet_balance || 0,
  });
});

module.exports = router;
