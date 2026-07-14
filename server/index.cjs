/**
 * server/index.cjs — Main Express API server
 * Replaces: api-server.cjs + all 15 Supabase Edge Functions
 *
 * Serves:
 *   - Auth endpoints (JWT-based)
 *   - All CRUD operations (games, packages, orders, settings, etc.)
 *   - Edge function ports (process-topup, verify-game, g2bulk, khqr, etc.)
 *   - File uploads (replaces Supabase Storage)
 *   - Proxy image / icon search
 *
 * Run: npm run dev:server  or  node server/index.cjs
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = parseInt(process.env.PORT || '9911', 10);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.post('/api/test-post', (req, res) => res.json({ ok: true, method: 'POST works' }));

// ── Mount routes ────────────────────────────────────────────────────────────
// Each router replaces a specific Supabase feature (see route file headers for details)

// Auth (replaces Supabase Auth)
app.use('/api/auth', require('./routes/auth.cjs'));

// Settings (site_settings CRUD)
app.use('/api/settings', require('./routes/settings.cjs'));

// Games + packages + special_packages CRUD
app.use('/api/games', require('./routes/games.cjs'));

// Orders (topup_orders + polling)
app.use('/api/orders', require('./routes/orders.cjs'));

// Preorders
app.use('/api/preorders', require('./routes/preorders.cjs'));

// Events
app.use('/api/events', require('./routes/events.cjs'));

// Coupons (apply_coupon RPC replacement)
app.use('/api/coupons', require('./routes/coupons.cjs'));

// Points (exchange_points_for_coupon RPC replacement)
app.use('/api/points', require('./routes/points.cjs'));

// Wallet
const { router: walletRouter } = require('./routes/wallet.cjs');
app.use('/api/wallet', walletRouter);

// Payments (gateway config, create-payment, webhooks)
app.use('/api/payments', require('./routes/payments.cjs'));

// Uploads (replaces Supabase Storage)
app.use('/api/upload', require('./routes/uploads.cjs'));

// API configs + game verification + g2bulk products
app.use('/api/admin', require('./routes/api-configs.cjs'));

// ── Edge function ports ─────────────────────────────────────────────────────
// Each replaces a Supabase edge function with the same API contract

app.use('/api/process-topup', require('./routes/process-topup.cjs'));
app.use('/api/verify-game-id', require('./routes/verify-game.cjs'));
app.use('/api/g2bulk-api', require('./routes/g2bulk.cjs'));
app.use('/api/ahnajak-khqr', require('./routes/ahnajak-khqr.cjs'));
app.use('/api/ikhode-payment', require('./routes/ikhode.cjs'));
app.use('/api/update-prices', require('./routes/prices.cjs'));

// Misc (proxy-image, search-icons + edge function aliases like get-ikhode-public-config, khqrcc-payment, etc.)
app.use('/api', require('./routes/misc.cjs'));

// ── Start server ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║   Ahnajak Topup API Server v2 (MySQL)        ║`);
  console.log(`║   Port: ${PORT}                                   ║`);
  console.log('║   Auth: JWT + bcrypt                         ║');
  console.log('║   Uploads: /uploads/site-assets              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});