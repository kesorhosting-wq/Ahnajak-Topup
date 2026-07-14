/**
 * routes/events.cjs — events CRUD (public read, admin write)
 */
const express = require('express');
const { query, queryOne, uuid } = require('../db.cjs');
const { requireAdmin } = require('../auth.cjs');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM events ORDER BY sort_order ASC, created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, description, image, content, is_active, sort_order } = req.body;
  const id = uuid();
  try {
    await query('INSERT INTO events (id, title, description, image, content, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, title, description || null, image || null, content || null, is_active ?? 1, sort_order ?? 0]);
    res.json(await queryOne('SELECT * FROM events WHERE id = ?', [id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const sets = [], values = [];
  for (const f of ['title', 'description', 'image', 'content', 'is_active', 'sort_order']) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (!sets.length) return res.json({ success: true });
  values.push(id);
  try { await query(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`, values); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try { await query('DELETE FROM events WHERE id = ?', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
