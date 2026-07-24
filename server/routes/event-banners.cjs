const express = require('express');
const { query, queryOne, uuid } = require('../db.cjs');
const { requireAdmin } = require('../auth.cjs');
const { sendError } = require('../helpers/errors.cjs');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM event_banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC');
    res.json(rows);
  } catch (err) { sendError(res, err, 'GET /event-banners'); }
});

router.get('/all', requireAdmin, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM event_banners ORDER BY sort_order ASC, created_at DESC');
    res.json(rows);
  } catch (err) { sendError(res, err, 'GET /event-banners/all'); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, image, link, is_active, sort_order } = req.body;
  if (!image) return res.status(400).json({ error: 'image is required' });
  const id = uuid();
  try {
    await query('INSERT INTO event_banners (id, title, image, link, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [id, title || null, image, link || null, is_active ?? 1, sort_order ?? 0]);
    res.json(await queryOne('SELECT * FROM event_banners WHERE id = ?', [id]));
  } catch (err) { sendError(res, err, 'POST /event-banners'); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const sets = [], values = [];
  for (const f of ['title', 'image', 'link', 'is_active', 'sort_order']) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (!sets.length) return res.json({ success: true });
  values.push(id);
  try { await query(`UPDATE event_banners SET ${sets.join(', ')} WHERE id = ?`, values); res.json({ success: true }); }
  catch (err) { sendError(res, err, 'PUT /event-banners/:id'); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM event_banners WHERE id = ?', [req.params.id]); res.json({ success: true }); }
  catch (err) { sendError(res, err, 'DELETE /event-banners/:id'); }
});

module.exports = router;
