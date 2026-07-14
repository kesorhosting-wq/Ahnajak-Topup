/**
 * routes/uploads.cjs — file uploads (replaces Supabase Storage)
 * POST   /api/upload        — multipart upload (field: "file", optional "path")
 * DELETE /api/upload         — delete a file by path (body: { path })
 * Files are stored in /uploads/site-assets/ and served statically by Express.
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../auth.cjs');

const router = express.Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'site-assets');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Allow images and fonts
    const allowed = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

router.post('/', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const publicPath = `/uploads/site-assets/${req.file.filename}`;
  res.json({ path: publicPath, url: publicPath });
});

router.delete('/', requireAdmin, async (req, res) => {
  const { path: filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  // Security: only allow deleting within uploads dir
  const fullPath = path.resolve(process.cwd(), filePath.replace(/^\//, ''));
  const normalizedUpload = path.resolve(UPLOAD_DIR);
  if (!fullPath.startsWith(normalizedUpload)) {
    return res.status(403).json({ error: 'Can only delete uploaded files' });
  }
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
