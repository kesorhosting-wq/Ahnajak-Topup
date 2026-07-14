const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.ICON_API_PORT || 3002;
const apiKey = process.env.ICON_API_KEY || '';

app.use(express.json({ limit: '10mb' }));

// ── Load .env if values not already set ──
if (!process.env.VITE_SUPABASE_URL && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m) {
      let v = m[2] || '';
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
}

// ── Supabase client ──
// Read endpoints use the anon key (RLS allows public SELECT).
// Write endpoints require SUPABASE_SERVICE_ROLE_KEY to be set.
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mqkfobfwatpzcmksrkrr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_BUCKET = 'site-assets';
const ICON_FOLDER = 'package-icons';

// ── Logging ──
function log(level, msg, data = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, fn: 'icon-api', msg, ...data }));
}

// ── Auth middleware ──
function requireApiKey(req, res, next) {
  if (!hasServiceRole) return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set — upload endpoints disabled. Add it to .env to enable.' });
  const key = req.headers['x-api-key'] || req.headers['x-apikey'];
  if (!apiKey) return res.status(500).json({ error: 'ICON_API_KEY not configured on server' });
  if (!key || key !== apiKey) return res.status(401).json({ error: 'Invalid or missing API key' });
  next();
}

// ═══════════════════════════════════════════════════════════
//  READ-ONLY: List all games with packages
//  No auth required — safe for public/AI consumption
// ═══════════════════════════════════════════════════════════
app.get('/api/icon-api/games', async (_req, res) => {
  try {
    // Fetch games
    const { data: games, error: gamesErr } = await supabase
      .from('games')
      .select('id, name, slug, image, g2bulk_category_id, default_package_icon, sort_order')
      .order('sort_order', { ascending: true });

    if (gamesErr) throw gamesErr;
    if (!games) return res.json({ games: [] });

    // Fetch packages for all games
    const gameIds = games.map(g => g.id);
    const { data: packages, error: pkgErr } = await supabase
      .from('packages')
      .select('id, game_id, name, amount, price, icon, sort_order, g2bulk_product_id')
      .in('game_id', gameIds)
      .order('sort_order', { ascending: true });

    if (pkgErr) throw pkgErr;

    // Fetch special packages for all games
    const { data: specialPackages, error: spErr } = await supabase
      .from('special_packages')
      .select('id, game_id, name, amount, price, icon, sort_order, g2bulk_product_id')
      .in('game_id', gameIds)
      .order('sort_order', { ascending: true });

    if (spErr) throw spErr;

    // Assemble response
    const result = games.map(game => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      image: game.image,
      defaultPackageIcon: game.default_package_icon,
      packages: (packages || [])
        .filter(p => p.game_id === game.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          amount: p.amount,
          price: Number(p.price),
          icon: p.icon,
          type: 'regular',
        })),
      specialPackages: (specialPackages || [])
        .filter(p => p.game_id === game.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          amount: p.amount,
          price: Number(p.price),
          icon: p.icon,
          type: 'special',
        })),
    }));

    res.json({ games: result });
  } catch (err) {
    log('ERROR', 'Failed to list games', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// ── READ-ONLY: Get single game with packages ──
app.get('/api/icon-api/games/:gameId', async (req, res) => {
  try {
    const { data: game, error } = await supabase
      .from('games')
      .select('id, name, slug, image, g2bulk_category_id, default_package_icon, sort_order')
      .eq('id', req.params.gameId)
      .single();

    if (error || !game) return res.status(404).json({ error: 'Game not found' });

    const { data: packages } = await supabase
      .from('packages')
      .select('id, name, amount, price, icon, sort_order')
      .eq('game_id', game.id)
      .order('sort_order', { ascending: true });

    const { data: specialPackages } = await supabase
      .from('special_packages')
      .select('id, name, amount, price, icon, sort_order')
      .eq('game_id', game.id)
      .order('sort_order', { ascending: true });

    res.json({
      game: {
        id: game.id,
        name: game.name,
        slug: game.slug,
        image: game.image,
        defaultPackageIcon: game.default_package_icon,
        packages: (packages || []).map(p => ({
          id: p.id, name: p.name, amount: p.amount, price: Number(p.price), icon: p.icon, type: 'regular',
        })),
        specialPackages: (specialPackages || []).map(p => ({
          id: p.id, name: p.name, amount: p.amount, price: Number(p.price), icon: p.icon, type: 'special',
        })),
      },
    });
  } catch (err) {
    log('ERROR', 'Failed to get game', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// ═══════════════════════════════════════════════════════════
//  WRITE: Upload icon endpoints (require API key)
// ═══════════════════════════════════════════════════════════

/**
 * Upload an icon image.
 * Expects JSON body: { "image": "data:image/png;base64,..." }
 * or { "image": "<base64 string>" }
 * Uploads to Supabase storage and returns the public URL.
 */
async function handleIconUpload(req, res, updateFn) {
  if (!apiKey) return res.status(500).json({ error: 'ICON_API_KEY not configured' });

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Missing "image" in body. Send base64 or data URI.' });

  try {
    // Parse base64 / data URI
    let buffer, ext = 'png';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: 'Invalid data URI format. Expected: data:image/png;base64,...' });
      ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Max 5MB.' });
    }

    // Generate unique filename
    const filename = `${ICON_FOLDER}/${crypto.randomUUID()}.${ext}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, { contentType: `image/${ext}`, upsert: false });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);
    const publicUrl = urlData.publicUrl;

    // Update database record
    await updateFn(publicUrl);

    log('INFO', 'Icon uploaded', { file: filename, url: publicUrl });
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    log('ERROR', 'Icon upload failed', { error: err.message });
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
}

// ── Upload icon for a regular package ──
app.post('/api/icon-api/packages/:packageId/icon', requireApiKey, async (req, res) => {
  await handleIconUpload(req, res, async (url) => {
    const { error } = await supabase
      .from('packages')
      .update({ icon: url })
      .eq('id', req.params.packageId);
    if (error) throw new Error(`DB update failed: ${error.message}`);
  });
});

// ── Upload icon for a special package ──
app.post('/api/icon-api/special-packages/:packageId/icon', requireApiKey, async (req, res) => {
  await handleIconUpload(req, res, async (url) => {
    const { error } = await supabase
      .from('special_packages')
      .update({ icon: url })
      .eq('id', req.params.packageId);
    if (error) throw new Error(`DB update failed: ${error.message}`);
  });
});

// ── Upload default icon for a game ──
app.post('/api/icon-api/games/:gameId/default-icon', requireApiKey, async (req, res) => {
  await handleIconUpload(req, res, async (url) => {
    const { error } = await supabase
      .from('games')
      .update({ default_package_icon: url })
      .eq('id', req.params.gameId);
    if (error) throw new Error(`DB update failed: ${error.message}`);
  });
});

// ── Health check ──
app.get('/api/icon-api/health', (_req, res) => {
  res.json({
    status: 'ok', port,
    serviceRoleConfigured: hasServiceRole,
    endpoints: [
      'GET  /api/icon-api/games',
      'GET  /api/icon-api/games/:gameId',
      'POST /api/icon-api/packages/:id/icon       (requires X-Api-Key + service_role)',
      'POST /api/icon-api/special-packages/:id/icon (requires X-Api-Key + service_role)',
      'POST /api/icon-api/games/:id/default-icon    (requires X-Api-Key + service_role)',
    ]
  });
});

app.get('/api/proxy-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error('Failed to proxy image:', url, err.message);
    res.status(500).send('Failed to fetch image');
  }
});

app.get('/api/search-icons', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    let query = String(q).trim();

    // 1. Smart preprocessing: Remove Khmer characters if mixed with English/Alphanumeric to prevent garbage Bing search results
    const khmerRegex = /[\u1780-\u17FF]+/g;
    if (khmerRegex.test(query)) {
      if (/[a-zA-Z0-9]/.test(query)) {
        query = query.replace(khmerRegex, '').replace(/\s+/g, ' ').trim();
      }
    }

    // 2. Add smart search modifiers to get transparent game logos/package icons
    let modifier = "";
    if (/logo/i.test(query)) {
      modifier = " logo png transparent";
    } else if (/icon/i.test(query)) {
      modifier = " png transparent";
    } else if (/diamonds|gem|coin|gold|point|uc|vp|vbucks|package/i.test(query)) {
      modifier = " png transparent"; // Do NOT append "icon" here because it forces game logos
    } else {
      modifier = " png transparent";
    }

    if (/png/i.test(query)) modifier = modifier.replace(" png", "");
    if (/transparent/i.test(query)) modifier = modifier.replace(" transparent", "");
    
    query += modifier;

    log('INFO', `Optimized search query: "${q}" -> "${query}"`);

    const results = [];
    let success = false;

    // Try Google CSE (cx=c1bb7535fbf0d46a1) first
    try {
      log('INFO', `Trying Google CSE for query: "${query}"`);
      const cx = 'c1bb7535fbf0d46a1';
      
      const cseJsRes = await fetch(`https://cse.google.com/cse.js?cx=${cx}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const js = await cseJsRes.text();
      const tokenMatch = js.match(/"cse_token":\s*"([^"]+)"/);
      
      if (tokenMatch) {
        const cse_token = tokenMatch[1];
        const apiUrl = `https://cse.google.com/cse/element/v1?cx=${cx}&q=${encodeURIComponent(query)}&num=15&cse_tok=${cse_token}&searchType=image&safe=off`;
        
        const apiRes = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://cse.google.com/'
          }
        });
        
        if (apiRes.status === 200) {
          const apiText = await apiRes.text();
          const jsonMatch = apiText.match(/\/\*x\*\/\(([\s\S]*)\);/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            if (data.results && data.results.length > 0) {
              data.results.forEach((item, i) => {
                results.push({
                  title: item.titleNoFormatting || item.title || `Image ${i + 1}`,
                  url: item.url,
                  source: 'Google CSE'
                });
              });
              success = true;
              log('INFO', `Google CSE returned ${results.length} results.`);
            }
          }
        }
      }
    } catch (cseErr) {
      log('ERROR', `Google CSE search failed, falling back to Bing: ${cseErr.message}`);
    }

    // Fallback to Bing Search if Google CSE failed or returned 0 results
    if (!success || results.length === 0) {
      log('INFO', `Falling back to Bing search for: "${query}"`);
      try {
        const resBing = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = await resBing.text();
        const regex = /(?:"|&quot;)murl(?:"|&quot;):(?:"|&quot;)(https?:\/\/[^"&]+)/g;
        
        const blacklist = [
          'facebook.com', 'fbcdn.net', 'fbsbx.com',
          'pinterest.com', 'pinimg.com',
          'instagram.com',
          'shutterstock.com', 'alamy.com', 'dreamstime.com', 'gettyimages.com', 'vectorstock.com',
          '123rf.com', 'istockphoto.com'
        ];

        let match;
        let count = 0;
        while ((match = regex.exec(html)) !== null && count < 30) {
          const url = match[1];
          
          // Filter out domains that block hotlinking or have watermarks
          const isBlocked = blacklist.some(domain => url.toLowerCase().includes(domain));
          if (isBlocked) continue;

          if (!results.some(r => r.url === url)) {
            results.push({
              title: `Image ${count + 1}`,
              url: url,
              source: 'Web Search'
            });
            count++;
          }
        }
      } catch (e) {
        log('ERROR', `Web Search image fetch error: ${e.message}`);
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VPS Sync Status Endpoint ──
const mysql = require('mysql2/promise');
let dbPool;
function getDbPool() {
  if (!dbPool) {
    dbPool = mysql.createPool({
      user: 'root',
      password: '',
      socketPath: '/var/run/mysqld/mysqld.sock',
      database: 'game_icon_manager',
      waitForConnections: true,
      connectionLimit: 3,
    });
  }
  return dbPool;
}

app.get('/api/vps-sync/status', async (req, res) => {
  try {
    const pool = getDbPool();
    // 1. Get cached counts from local MySQL
    const [successRows] = await pool.query("SELECT COUNT(*) as count FROM downloaded_images WHERE local_path != 'FAILED'");
    const [failedRows] = await pool.query("SELECT COUNT(*) as count FROM downloaded_images WHERE local_path = 'FAILED'");
    
    const localCachedCount = successRows[0].count;
    const failedCacheCount = failedRows[0].count;

    // Get all failed URLs to filter them out of pending list
    const [failedUrlsRows] = await pool.query("SELECT original_url FROM downloaded_images WHERE local_path = 'FAILED'");
    const failedUrls = new Set(failedUrlsRows.map(r => r.original_url));

    // 2. Query Supabase to scan image columns
    const tables = [
      { name: 'games', columns: ['image', 'cover_image', 'default_package_icon'] },
      { name: 'packages', columns: ['icon', 'label_icon'] },
      { name: 'special_packages', columns: ['icon', 'label_icon'] },
      { name: 'preorder_packages', columns: ['icon', 'label_icon'] },
      { name: 'events', columns: ['image'] },
      { name: 'payment_qr_settings', columns: ['qr_code_image'] },
    ];

    let totalRefs = 0;
    let localRefs = 0;
    let remoteRefs = 0;
    const items = [];
    const failedItems = [];

    for (const { name, columns } of tables) {
      const { data, error } = await supabase.from(name).select(columns.join(','));
      if (error || !data) continue;

      for (const row of data) {
        for (const col of columns) {
          const val = row[col];
          if (!val) continue;

          totalRefs++;
          if (val.startsWith('/storage/')) {
            localRefs++;
          } else if (val.startsWith('http')) {
            if (failedUrls.has(val)) {
              failedItems.push({
                table: name,
                column: col,
                url: val,
              });
              continue; // Skip failed downloads from pending sync list
            }
            remoteRefs++;
            items.push({
              table: name,
              column: col,
              url: val,
            });
          }
        }
      }
    }

    // Also scan site_settings
    const isImageUrl = (urlStr) => {
      if (typeof urlStr !== 'string') return false;
      try {
        const parsed = new URL(urlStr);
        const ext = path.extname(parsed.pathname).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext);
      } catch (e) {
        return /\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i.test(urlStr);
      }
    };
    const { data: settings, error: settingsError } = await supabase.from('site_settings').select('key, value');
    if (!settingsError && settings) {
      for (const s of settings) {
        if (!s.value) continue;
        const parseUrls = (val) => {
          if (typeof val === 'string') {
            if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed;
              } catch (e) {}
            }
            return [val];
          }
          if (Array.isArray(val)) return val;
          return [];
        };

        const urls = parseUrls(s.value);
        for (const url of urls) {
          if (!url) continue;
          
          const isImg = isImageUrl(url) || url.startsWith('/storage/');
          if (!isImg) continue;

          totalRefs++;
          if (url.startsWith('/storage/')) {
            localRefs++;
          } else if (url.startsWith('http')) {
            if (failedUrls.has(url)) {
              failedItems.push({
                table: 'site_settings',
                column: `key:${s.key}`,
                url: url,
              });
              continue; // Skip failed
            }
            remoteRefs++;
            items.push({
              table: 'site_settings',
              column: `key:${s.key}`,
              url: url,
            });
          }
        }
      }
    }

    res.json({
      summary: {
        total_refs: totalRefs,
        local_refs: localRefs,
        remote_refs: remoteRefs,
        failed_refs: failedItems.length,
        migratable_refs: remoteRefs,
      },
      items: items,
      failedItems: failedItems,
    });
  } catch (err) {
    log('ERROR', 'Failed to get VPS sync status', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── VPS Sync Run Endpoint ──
const { exec } = require('child_process');
app.post('/api/vps-sync/run', async (req, res) => {
  log('INFO', 'Starting manual VPS image sync');
  
  exec('node download-images.js --once', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      log('ERROR', 'Manual VPS sync failed', { error: error.message, stderr });
      return res.status(500).json({ error: error.message, stderr });
    }
    
    log('INFO', 'Manual VPS sync completed successfully');
    res.json({
      success: true,
      log: stdout,
    });
  });
});

// ── VPS Clear Failure Cache Endpoint ──
app.post('/api/vps-sync/clear-failures', async (req, res) => {
  log('INFO', 'Clearing failed downloads cache');
  try {
    const pool = getDbPool();
    await pool.query("DELETE FROM downloaded_images WHERE local_path = 'FAILED'");
    
    log('INFO', 'Rerunning sync after clearing failures');
    exec('node download-images.js --once', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        log('ERROR', 'Sync after clearing failures failed', { error: error.message, stderr });
        return res.status(500).json({ error: error.message, stderr });
      }
      res.json({
        success: true,
        log: stdout,
      });
    });
  } catch (err) {
    log('ERROR', 'Failed to clear failures', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  log('INFO', `Icon API running on port ${port}`);
});