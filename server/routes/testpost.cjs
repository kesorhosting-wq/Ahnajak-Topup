const express = require("express");
const r = express.Router();
r.post("/test", (req, res) => {
  try {
    res.json({ ok: true });
  } catch (err) {
    console.error('Test POST error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = r;
