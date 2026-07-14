import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import mysql from 'mysql2/promise';

// Load .env file programmatically if not already loaded in the environment
if (!process.env.VITE_SUPABASE_URL && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use service role key to have write access to update URLs in Supabase tables
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_ROOT = '/var/www/kesortopup.cam/storage';
const LOCAL_IMAGES_DIR = path.join(STORAGE_ROOT, 'local-images');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  { name: 'games', columns: ['image', 'cover_image', 'default_package_icon'] },
  { name: 'packages', columns: ['icon', 'label_icon'] },
  { name: 'special_packages', columns: ['icon', 'label_icon'] },
  { name: 'preorder_packages', columns: ['icon', 'label_icon'] },
  { name: 'events', columns: ['image'] },
  { name: 'payment_qr_settings', columns: ['qr_code_image'] },
];

function isImageUrl(urlStr) {
  if (typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    const ext = path.extname(parsed.pathname).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext);
  } catch (e) {
    return /\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i.test(urlStr);
  }
}

let pool;

async function initMySQL() {
  pool = mysql.createPool({
    user: 'root',
    password: '',
    socketPath: '/var/run/mysqld/mysqld.sock',
    database: 'game_icon_manager',
    waitForConnections: true,
    connectionLimit: 5,
  });

  // Create table downloaded_images if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS downloaded_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      original_url VARCHAR(768) UNIQUE NOT NULL,
      local_path VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('MySQL connection pool and downloaded_images table verified.');
}

async function downloadImage(url, hash) {
  const tempPath = path.join(LOCAL_IMAGES_DIR, `${hash}.tmp`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 400) {
        throw new Error(`Object not found in storage (404/400)`);
      }
      throw new Error(`Failed to fetch ${url}: ${res.statusText} (Status: ${res.status})`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.warn(`Skipping non-image (${contentType}): ${url}`);
      return null;
    }

    if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
      fs.mkdirSync(LOCAL_IMAGES_DIR, { recursive: true });
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size
    if (buffer.length < 20) {
      console.warn(`Skipping tiny file (${buffer.length} bytes): ${url}`);
      return null;
    }

    // Validate image magic bytes
    const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50;
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isWebP = buffer.length > 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
    const isGIF = buffer[0] === 0x47 && buffer[1] === 0x49;
    const isSVG = buffer.slice(0, 4).toString().includes('<') || contentType.includes('svg');

    if (!isPNG && !isJPEG && !isWebP && !isGIF && !isSVG) {
      console.warn(`Skipping invalid image (bad magic bytes): ${url}`);
      return null;
    }

    if (isSVG) {
      const destPath = path.join(LOCAL_IMAGES_DIR, `${hash}.svg`);
      fs.writeFileSync(destPath, buffer);
      console.log(`Saved SVG: ${hash}.svg`);
      return `/storage/local-images/${hash}.svg`;
    }

    // Write temp file
    fs.writeFileSync(tempPath, buffer);

    const destPath = path.join(LOCAL_IMAGES_DIR, `${hash}.webp`);
    try {
      execSync(`convert "${tempPath}" -resize "1000x>" -quality 80 -strip "${destPath}"`);
      console.log(`Converted and Optimized: ${hash}.webp`);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return `/storage/local-images/${hash}.webp`;
    } catch (optErr) {
      console.warn(`Failed to convert ${hash} to WebP: ${optErr.message.split('\n')[0]}`);
      
      // Fallback: save original with original extension if WebP conversion fails
      let ext = 'png';
      if (isJPEG) ext = 'jpg';
      else if (isWebP) ext = 'webp';
      else if (isGIF) ext = 'gif';
      
      const fallbackDest = path.join(LOCAL_IMAGES_DIR, `${hash}.${ext}`);
      fs.writeFileSync(fallbackDest, buffer);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      
      return `/storage/local-images/${hash}.${ext}`;
    }
  } catch (err) {
    console.error(`Error downloading ${url}:`, err.message);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
    return null;
  }
}

async function processUrl(url) {
  if (!url || !url.startsWith('http')) return url;

  try {
    // 1. Check local MySQL cache first
    const [rows] = await pool.query('SELECT local_path FROM downloaded_images WHERE original_url = ?', [url]);
    if (rows.length > 0) {
      const cachedPath = rows[0].local_path;
      if (cachedPath === 'FAILED') {
        return url; // Skip downloading, keep original URL
      }
      const fullDestPath = path.join(STORAGE_ROOT, cachedPath.replace(/^\/storage\//, ''));
      if (fs.existsSync(fullDestPath)) {
        return cachedPath;
      }
    }

    // 2. Generate unique hash
    const hash = crypto.createHash('md5').update(url).digest('hex');

    // 3. Download and process the image (converting non-SVG to WebP)
    const localPathValue = await downloadImage(url, hash);
    
    if (localPathValue) {
      // 4. Save to local MySQL cache
      await pool.query(
        'INSERT INTO downloaded_images (original_url, local_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE local_path = ?',
        [url, localPathValue, localPathValue]
      );
      return localPathValue;
    } else {
      // Record failure in MySQL to prevent infinite retry loops
      await pool.query(
        'INSERT INTO downloaded_images (original_url, local_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE local_path = ?',
        [url, 'FAILED', 'FAILED']
      );
    }
  } catch (err) {
    console.error(`Failed to process URL ${url}:`, err.message);
  }
  
  return url;
}

async function main() {
  console.log('Starting image download daemon (WebP conversion + Self-healing)...');
  
  try {
    await initMySQL();
  } catch (dbErr) {
    console.error('Failed to initialize MySQL:', dbErr.message);
    process.exit(1);
  }

  const once = process.argv.includes('--once');
  do {
    try {
      console.log(`[${new Date().toISOString()}] Scanning database for unsynced or missing images...`);
      
      // 1. Process Standard Tables
      for (const table of TABLES) {
        const { data, error } = await supabase.from(table.name).select(`id, ${table.columns.join(',')}`);
        
        if (error) {
          console.error(`Error fetching ${table.name}:`, error.message);
          continue;
        }
        
        for (const row of data) {
          let needsUpdate = false;
          const updatedFields = {};
          
          for (const col of table.columns) {
            const currentUrl = row[col];
            if (!currentUrl) continue;

            if (currentUrl.startsWith('/storage/')) {
              // Self-healing check: verify if file exists on disk
              const fullDestPath = path.join(STORAGE_ROOT, currentUrl.replace(/^\/storage\//, ''));
              if (!fs.existsSync(fullDestPath)) {
                console.warn(`File missing from disk: ${currentUrl}. Attempting recovery...`);
                // Look up original URL from MySQL cache
                const [cachedRows] = await pool.query('SELECT original_url FROM downloaded_images WHERE local_path = ?', [currentUrl]);
                if (cachedRows.length > 0) {
                  const originalUrl = cachedRows[0].original_url;
                  console.log(`Recovered original URL: ${originalUrl}. Re-downloading...`);
                  // Remove from MySQL cache to force fresh download
                  await pool.query('DELETE FROM downloaded_images WHERE local_path = ?', [currentUrl]);
                  const newLocalPath = await processUrl(originalUrl);
                  if (newLocalPath && newLocalPath !== currentUrl) {
                    updatedFields[col] = newLocalPath;
                    needsUpdate = true;
                  }
                } else {
                  console.error(`Could not recover original URL for missing file ${currentUrl} (not in MySQL)`);
                }
              }
            } else if (currentUrl.startsWith('http')) {
              const localPath = await processUrl(currentUrl);
              if (localPath && localPath !== currentUrl) {
                updatedFields[col] = localPath;
                needsUpdate = true;
              }
            }
          }
          
          if (needsUpdate) {
            console.log(`Updating ${table.name} ID ${row.id}:`, updatedFields);
            const { error: updateErr } = await supabase.from(table.name).update(updatedFields).eq('id', row.id);
            if (updateErr) {
              console.error(`Error updating ${table.name} ID ${row.id}:`, updateErr.message);
            }
          }
        }
      }

      // 2. Process site_settings (Key-Value pairs)
      const { data: settings, error: settingsError } = await supabase.from('site_settings').select('id, key, value');
      if (!settingsError && settings) {
        for (const s of settings) {
          if (!s.value) continue;
          
          let needsUpdate = false;
          let newValue = s.value;
          
          if (typeof s.value === 'string') {
            const trimmed = s.value.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              try {
                const urls = JSON.parse(trimmed);
                if (Array.isArray(urls)) {
                  const localUrls = [];
                  for (const url of urls) {
                    if (!url) {
                      localUrls.push(url);
                      continue;
                    }
                    if (url.startsWith('/storage/local-images/')) {
                      // Self-healing check
                      const fullDestPath = path.join(STORAGE_ROOT, url.replace(/^\/storage\//, ''));
                      if (!fs.existsSync(fullDestPath)) {
                        console.warn(`Setting image missing from disk: ${url}. Attempting recovery...`);
                        const [cachedRows] = await pool.query('SELECT original_url FROM downloaded_images WHERE local_path = ?', [url]);
                        if (cachedRows.length > 0) {
                          const originalUrl = cachedRows[0].original_url;
                          await pool.query('DELETE FROM downloaded_images WHERE local_path = ?', [url]);
                          const newLocalPath = await processUrl(originalUrl);
                          localUrls.push(newLocalPath);
                          if (newLocalPath !== url) needsUpdate = true;
                        } else {
                          console.error(`Could not recover setting image: ${url}`);
                          localUrls.push(url);
                        }
                      } else {
                        localUrls.push(url);
                      }
                    } else if (url.startsWith('http')) {
                      if (!isImageUrl(url)) {
                        localUrls.push(url);
                        continue;
                      }
                      const localUrl = await processUrl(url);
                      localUrls.push(localUrl);
                      if (localUrl !== url) needsUpdate = true;
                    } else {
                      localUrls.push(url);
                    }
                  }
                  if (needsUpdate) {
                    newValue = JSON.stringify(localUrls);
                  }
                }
              } catch (e) {
                if (s.value.startsWith('http')) {
                  if (isImageUrl(s.value)) {
                    const localUrl = await processUrl(s.value);
                    if (localUrl !== s.value) {
                      newValue = localUrl;
                      needsUpdate = true;
                    }
                  }
                }
              }
            } else if (s.value.startsWith('/storage/local-images/')) {
              // Self-healing check
              const fullDestPath = path.join(STORAGE_ROOT, s.value.replace(/^\/storage\//, ''));
              if (!fs.existsSync(fullDestPath)) {
                console.warn(`Setting image missing from disk: ${s.value}. Attempting recovery...`);
                const [cachedRows] = await pool.query('SELECT original_url FROM downloaded_images WHERE local_path = ?', [s.value]);
                if (cachedRows.length > 0) {
                  const originalUrl = cachedRows[0].original_url;
                  await pool.query('DELETE FROM downloaded_images WHERE local_path = ?', [s.value]);
                  const newLocalPath = await processUrl(originalUrl);
                  newValue = newLocalPath;
                  needsUpdate = true;
                } else {
                  console.error(`Could not recover setting image: ${s.value}`);
                }
              }
            } else if (s.value.startsWith('http')) {
              if (isImageUrl(s.value)) {
                const localUrl = await processUrl(s.value);
                if (localUrl !== s.value) {
                  newValue = localUrl;
                  needsUpdate = true;
                }
              }
            }
          } else if (Array.isArray(s.value)) {
            const localUrls = [];
            for (const url of s.value) {
              if (!url) {
                localUrls.push(url);
                continue;
              }
            if (url.startsWith('/storage/')) {
                // Self-healing check
                const fullDestPath = path.join(STORAGE_ROOT, url.replace(/^\/storage\//, ''));
                if (!fs.existsSync(fullDestPath)) {
                  console.warn(`Setting image missing from disk: ${url}. Attempting recovery...`);
                  const [cachedRows] = await pool.query('SELECT original_url FROM downloaded_images WHERE local_path = ?', [url]);
                  if (cachedRows.length > 0) {
                    const originalUrl = cachedRows[0].original_url;
                    await pool.query('DELETE FROM downloaded_images WHERE local_path = ?', [url]);
                    const newLocalPath = await processUrl(originalUrl);
                    localUrls.push(newLocalPath);
                    if (newLocalPath !== url) needsUpdate = true;
                  } else {
                    console.error(`Could not recover setting image: ${url}`);
                    localUrls.push(url);
                  }
                } else {
                  localUrls.push(url);
                }
              } else if (url.startsWith('http')) {
                if (isImageUrl(url)) {
                  const localUrl = await processUrl(url);
                  localUrls.push(localUrl);
                  if (localUrl !== url) needsUpdate = true;
                } else {
                  localUrls.push(url);
                }
              } else {
                localUrls.push(url);
              }
            }
            if (needsUpdate) {
              newValue = localUrls;
            }
          }
          
          if (needsUpdate) {
            console.log(`Updating site_settings key "${s.key}":`, newValue);
            const { error: updateErr } = await supabase.from('site_settings').update({ value: newValue }).eq('id', s.id);
            if (updateErr) {
              console.error(`Error updating site_settings key "${s.key}":`, updateErr.message);
            }
          }
        }
      }
    } catch (loopErr) {
      console.error('Error in check cycle:', loopErr.message);
    }
    
    if (once) {
      console.log('Single scan and download completed successfully.');
      break;
    }
    // Check for updates every 15 seconds
    await new Promise(resolve => setTimeout(resolve, 15000));
  } while (true);

  if (pool) {
    await pool.end();
  }
  process.exit(0);
}

main();
