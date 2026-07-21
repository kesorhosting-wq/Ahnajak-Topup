function sendError(res, err, context = '') {
  console.error(`[ERROR]${context ? ' ' + context : ''}:`, err?.message || err);
  const msg = process.env.NODE_ENV === 'development' ? (err?.message || 'Internal error') : 'Internal server error';
  res.status(500).json({ error: msg });
}

module.exports = { sendError };
