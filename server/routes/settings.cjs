/**
 * routes/settings.cjs — site_settings key-value CRUD
 * GET  /api/settings          — get all settings (public)
 * PUT   /api/settings         — bulk upsert settings (admin)
 * PUT   /api/settings/:key    — upsert a single setting (admin)
 * DELETE /api/settings/:key   — delete a setting (admin)
 */
const express = require('express');
const { query, queryOne } = require('../db.cjs');
const { requireAdmin, optionalAuth } = require('../auth.cjs');

const router = express.Router();

// Get all settings (public — site settings are public data)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const [rows] = await query('SELECT `key`, value FROM site_settings');
    // Return as { key: parsedValue } map
    const settings = {};
    for (const row of rows) {
      try { settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value; }
      catch { settings[row.key] = row.value; }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk upsert (admin)
router.put('/', requireAdmin, async (req, res) => {
  const entries = req.body;
  if (!entries || typeof entries !== 'object') {
    return res.status(400).json({ error: 'Expected a JSON object of key/value pairs' });
  }
  try {
    for (const [key, value] of Object.entries(entries)) {
      await query(
        'INSERT INTO site_settings (id, `key`, value) VALUES (UUID(), ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        [key, JSON.stringify(value)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert single setting (admin)
router.put('/:key', requireAdmin, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  try {
    await query(
      'INSERT INTO site_settings (id, `key`, value) VALUES (UUID(), ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key, JSON.stringify(value)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete single setting (admin)
router.delete('/:key', requireAdmin, async (req, res) => {
  const { key } = req.params;
  try {
    await query('DELETE FROM site_settings WHERE `key` = ?', [key]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
