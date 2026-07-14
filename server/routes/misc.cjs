/**
 * routes/misc.cjs — Proxy image + search icons + edge function aliases
 * GET /api/proxy-image?url=...
 * GET /api/search-icons?q=...
 * POST /api/get-ikhode-public-config
 * POST /api/khqrcc-payment
 * POST /api/khqrcc-webhook
 * POST /api/g2bulk-webhook
 */
const express = require('express');

const router = express.Router();
const { queryOne } = require('../db.cjs');

// ── Edge function aliases (for compatibility shim) ────────────────────────
// get-ikhode-public-config (was edge function)
router.post('/get-ikhode-public-config', async (req, res) => {
  try {
    const row = await queryOne(`SELECT enabled, config FROM payment_gateways WHERE slug = 'ikhode-bakong'`);
    if (!row) return res.json({ success: true, enabled: false });
    const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {};
    res.json({ success: true, enabled: !!row.enabled, websocket_url: config.websocket_url || null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Unexpected error' });
  }
});

// khqrcc-payment (forward to payments create-payment handler)
router.post('/khqrcc-payment', async (req, res) => {
  const crypto = require('crypto');
  const { orderId, amount, remark, returnUrl } = req.body;
  try {
    const gw = await queryOne(`SELECT config, enabled FROM payment_gateways WHERE slug = 'khqrcc'`);
    if (!gw || !gw.enabled) return res.status(400).json({ error: 'Gateway disabled or not found' });
    const cfg = typeof gw.config === 'string' ? JSON.parse(gw.config) : gw.config || {};
    if (!cfg.secret_key || !cfg.profile_id || !cfg.checkout_url) {
      return res.status(400).json({ error: 'Gateway not configured' });
    }
    const success_url = returnUrl || `${process.env.PUBLIC_BASE_URL || 'http://localhost:3010'}/api/khqrcc-webhook?transaction_id=${orderId}`;
    const plainHash = cfg.secret_key + orderId + amount + success_url + (remark || '');
    const hash = crypto.createHash('sha1').update(plainHash).digest('hex');
    const params = new URLSearchParams({ transaction_id: String(orderId), amount: String(amount), success_url, remark: remark || '', hash });
    res.json({ url: `${cfg.checkout_url}/${cfg.profile_id}?${params.toString()}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// khqrcc-webhook (external callback)
router.post('/khqrcc-webhook', async (req, res) => {
  const crypto = require('crypto');
  const { transaction_id, amount, status, req_time, hash: received_hash } = req.body;
  try {
    const gw = await queryOne(`SELECT config FROM payment_gateways WHERE slug = 'khqrcc'`);
    const cfg = typeof gw?.config === 'string' ? JSON.parse(gw.config) : gw?.config || {};
    if (!cfg.secret_key) return res.status(500).send('Config missing');
    const dataToHash = cfg.secret_key + (req_time || '') + (transaction_id || '') + (amount || '') + (status || '');
    const expectedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    if (expectedHash !== received_hash) return res.status(403).send('Invalid hash');
    if (status === 'SUCCESS') {
      const order = await queryOne('SELECT amount FROM topup_orders WHERE id = ?', [transaction_id]);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (Math.abs(parseFloat(amount) - parseFloat(order.amount)) > 0.01) {
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }
      const { query } = require('../db.cjs');
      await query('UPDATE topup_orders SET status = ? WHERE id = ?', ['processing', transaction_id]);
      try { const pt = require('./process-topup.cjs'); if (pt.fulfillOrder) await pt.fulfillOrder(transaction_id); } catch (e) { console.error('Fulfill error:', e.message); }
      return res.json({ received: true });
    }
    res.status(400).send('Not success');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// g2bulk-webhook (G2Bulk callback)
router.post('/g2bulk-webhook', async (req, res) => {
  const body = req.body || {};
  const remark = body.remark || '';
  const orderMatch = remark.match(/order_id:([a-f0-9-]+)/);
  if (!orderMatch) return res.json({ received: true, note: 'No order_id in remark' });
  const orderId = orderMatch[1];
  const g2bulkStatus = body.status || '';
  const { query } = require('../db.cjs');
  let order = await queryOne('SELECT * FROM topup_orders WHERE id = ?', [orderId]);
  let table = 'topup_orders';
  if (!order) { order = await queryOne('SELECT * FROM preorder_orders WHERE id = ?', [orderId]); table = 'preorder_orders'; }
  if (!order) return res.json({ received: true, note: 'Order not found' });
  let newStatus = order.status;
  if (['COMPLETED', 'completed'].includes(g2bulkStatus)) newStatus = 'completed';
  else if (['FAILED', 'failed', 'CANCELLED'].includes(g2bulkStatus)) newStatus = 'failed';
  await query(`UPDATE ${table} SET status = ?, status_message = ? WHERE id = ?`, [newStatus, `G2Bulk callback: ${g2bulkStatus}`, orderId]);
  res.json({ received: true, orderId, newStatus });
});

// Proxy image
router.get('/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Failed to proxy image:', url, err.message);
    res.status(500).send('Failed to fetch image');
  }
});

// Search icons (Google CSE + Bing fallback)
router.get('/search-icons', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    let query = String(q).trim();

    // Strip Khmer chars if mixed with English
    const khmerRegex = /[\u1780-\u17FF]+/g;
    if (khmerRegex.test(query) && /[a-zA-Z0-9]/.test(query)) {
      query = query.replace(khmerRegex, '').replace(/\s+/g, ' ').trim();
    }

    let modifier = ' png transparent';
    if (/png/i.test(query)) modifier = modifier.replace(' png', '');
    if (/transparent/i.test(query)) modifier = modifier.replace(' transparent', '');
    query += modifier;

    const results = [];
    let success = false;

    // Try Google CSE
    try {
      const cx = 'c1bb7535fbf0d46a1';
      const cseJsRes = await fetch(`https://cse.google.com/cse.js?cx=${cx}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }
      });
      const js = await cseJsRes.text();
      const tokenMatch = js.match(/"cse_token":\s*"([^"]+)"/);
      if (tokenMatch) {
        const cse_token = tokenMatch[1];
        const apiUrl = `https://cse.google.com/cse/element/v1?cx=${cx}&q=${encodeURIComponent(query)}&num=15&cse_tok=${cse_token}&searchType=image&safe=off`;
        const apiRes = await fetch(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://cse.google.com/' }
        });
        if (apiRes.status === 200) {
          const apiText = await apiRes.text();
          const jsonMatch = apiText.match(/\/\*x\*\/\(([\s\S]*)\);/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            if (data.results?.length) {
              data.results.forEach((item, i) => {
                results.push({ title: item.titleNoFormatting || `Image ${i + 1}`, url: item.url, source: 'Google CSE' });
              });
              success = true;
            }
          }
        }
      }
    } catch {}

    // Bing fallback
    if (!success || results.length === 0) {
      try {
        const resBing = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = await resBing.text();
        const regex = /(?:"|&quot;)murl(?:"|&quot;):(?:"|&quot;)(https?:\/\/[^"&]+)/g;
        const blacklist = ['facebook.com', 'fbcdn.net', 'pinterest.com', 'pinimg.com', 'instagram.com',
          'shutterstock.com', 'alamy.com', 'dreamstime.com', 'gettyimages.com', '123rf.com', 'istockphoto.com'];
        let match, count = 0;
        while ((match = regex.exec(html)) !== null && count < 30) {
          const imgUrl = match[1];
          if (!blacklist.some(d => imgUrl.toLowerCase().includes(d)) && !results.some(r => r.url === imgUrl)) {
            results.push({ title: `Image ${count + 1}`, url: imgUrl, source: 'Web Search' });
            count++;
          }
        }
      } catch {}
    }

    res.json({ results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;