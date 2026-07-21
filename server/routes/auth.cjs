/**
 * routes/auth.cjs — Authentication endpoints (replaces Supabase Auth)
 * POST /api/auth/signin   — login, returns JWT
 * POST /api/auth/signout  — logout (client-side token removal)
 * POST /api/auth/telegram — login via Telegram
 * GET  /api/auth/session  — validate current token, return user + admin flag
 */
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, queryOne, uuid } = require('../db.cjs');
const { signToken, hashPassword, comparePassword, hasRole, requireAuth } = require('../auth.cjs');
const { sendError } = require('../helpers/errors.cjs');

const router = express.Router();

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

// Telegram login
router.post('/telegram', async (req, res) => {
  const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
  if (!id || !hash) {
    return res.status(400).json({ error: 'Invalid Telegram auth data' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: 'Telegram bot not configured' });
  }

  // Verify hash
  const dataCheckArr = [];
  for (const [k, v] of Object.entries({ id, first_name, last_name, username, photo_url, auth_date })) {
    if (v !== undefined && v !== null) dataCheckArr.push(`${k}=${v}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (computedHash !== hash) {
    return res.status(401).json({ error: 'Telegram auth verification failed' });
  }

  // Prevent replay attacks — auth_date must be within 5 minutes
  if (auth_date) {
    const authAge = Math.floor(Date.now() / 1000) - parseInt(auth_date, 10);
    if (authAge > 300) {
      return res.status(401).json({ error: 'Telegram auth expired — please log in again' });
    }
  }

  const telegramId = String(id);
  const displayName = first_name || username || 'Telegram User';
  const email = `tg_${telegramId}@telegram.local`;

  try {
    let user = await queryOne('SELECT id, email, display_name FROM users WHERE email = ?', [email]);

    if (!user) {
      const userId = uuid();
      await query('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, "", ?)',
        [userId, email, displayName]);
      await query('INSERT INTO profiles (id, user_id, email, display_name, wallet_balance, reward_points) VALUES (?, ?, ?, ?, 0, 0)',
        [uuid(), userId, email, displayName]);
      await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
        [uuid(), userId, 'user']);
      user = { id: userId, email, display_name: displayName };
    }

    const token = signToken({ id: user.id, email: user.email, display_name: user.display_name });
    return res.json({
      user: { id: user.id, email: user.email, display_name: user.display_name },
      session: { access_token: token },
    });
  } catch (err) { sendError(res, err, 'POST /auth/telegram'); }
});

// Telegram login via OIDC (new JS library, returns id_token JWT)
router.post('/telegram-oidc', async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ error: 'Missing id_token' });
  }

  try {
    // Fetch JWKS from Telegram
    const jwksRes = await fetch('https://oauth.telegram.org/.well-known/jwks.json');
    const jwks = await jwksRes.json();

    // Decode header to find key
    const header = JSON.parse(Buffer.from(id_token.split('.')[0], 'base64url').toString());
    const key = jwks.keys.find((k) => k.kid === header.kid);
    if (!key) return res.status(401).json({ error: 'Unable to verify Telegram login' });

    // Import JWK as public key
    const publicKey = crypto.createPublicKey({ format: 'jwk', key });

    // Verify the JWT
    const decoded = jwt.verify(id_token, publicKey, {
      algorithms: ['RS256', 'ES256'],
      issuer: 'https://oauth.telegram.org',
    });

    const telegramId = String(decoded.sub || decoded.id);
    const displayName = decoded.name || decoded.preferred_username || 'Telegram User';
    const email = `tg_${telegramId}@telegram.local`;

    let user = await queryOne('SELECT id, email, display_name FROM users WHERE email = ?', [email]);

    if (!user) {
      const userId = uuid();
      await query('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, "", ?)',
        [userId, email, displayName]);
      await query('INSERT INTO profiles (id, user_id, email, display_name, wallet_balance, reward_points) VALUES (?, ?, ?, ?, 0, 0)',
        [uuid(), userId, email, displayName]);
      await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
        [uuid(), userId, 'user']);
      user = { id: userId, email, display_name: displayName };
    }

    const token = signToken({ id: user.id, email: user.email, display_name: user.display_name });
    return res.json({
      user: { id: user.id, email: user.email, display_name: user.display_name },
      session: { access_token: token },
    });
  } catch (err) { sendError(res, err, 'POST /auth/telegram-oidc'); }
});

// Telegram OIDC callback — handles redirect after auth (mobile-friendly code flow)
// After user authorizes, Telegram redirects the browser here with ?code=xxx&state=yyy.
// We exchange the code for an id_token and redirect to the frontend with a JWT.
router.get('/telegram-callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.redirect((process.env.FRONTEND_URL || '') + '/auth?error=missing_code');
  }

  let clientId;
  try {
    const setting = await queryOne("SELECT `value` FROM `settings` WHERE `key` = 'telegramClientId'");
    clientId = setting?.value;
  } catch (e) {
    clientId = process.env.TELEGRAM_CLIENT_ID;
  }
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.redirect((process.env.FRONTEND_URL || '') + '/auth?error=telegram_not_configured');
  }

  // Derive the redirect_uri from the incoming request so it matches the frontend URL
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const redirectUri = `${proto}://${host}/api/auth/telegram-callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth.telegram.org/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      console.error('Token exchange failed:', tokenData);
      return res.redirect((process.env.FRONTEND_URL || '') + '/auth?error=token_exchange_failed');
    }

    const idToken = tokenData.id_token;

    // Verify the id_token using JWKS
    const jwksRes = await fetch('https://oauth.telegram.org/.well-known/jwks.json');
    const jwks = await jwksRes.json();
    const header = JSON.parse(Buffer.from(idToken.split('.')[0], 'base64url').toString());
    const key = jwks.keys.find((k) => k.kid === header.kid);
    if (!key) return res.redirect((process.env.FRONTEND_URL || '') + '/auth?error=verification_failed');

    const publicKey = crypto.createPublicKey({ format: 'jwk', key });
    const decoded = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256', 'ES256'],
      issuer: 'https://oauth.telegram.org',
    });

    // Create or find user
    const telegramId = String(decoded.sub || decoded.id);
    const displayName = decoded.name || decoded.preferred_username || 'Telegram User';
    const email = `tg_${telegramId}@telegram.local`;

    let user = await queryOne('SELECT id, email, display_name FROM users WHERE email = ?', [email]);

    if (!user) {
      const userId = uuid();
      await query('INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, "", ?)',
        [userId, email, displayName]);
      await query('INSERT INTO profiles (id, user_id, email, display_name, wallet_balance, reward_points) VALUES (?, ?, ?, ?, 0, 0)',
        [uuid(), userId, email, displayName]);
      await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
        [uuid(), userId, 'user']);
      user = { id: userId, email, display_name: displayName };
    }

    const token = signToken({ id: user.id, email: user.email, display_name: user.display_name });
    const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_BASE_URL || '';
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    return res.redirect(`${frontendUrl}/auth#token=${token}${stateParam}`);
  } catch (err) {
    console.error('Telegram callback error:', err);
    return res.redirect((process.env.FRONTEND_URL || '') + '/auth?error=server_error');
  }
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
