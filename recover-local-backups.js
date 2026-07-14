const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Load env
const envContent = fs.readFileSync('/root/angkor-topup-hub/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = (match[2] || '').replace(/['"]/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_ROOT = '/var/www/kesortopup.cam/storage';
const LOCAL_IMAGES_DIR = path.join(STORAGE_ROOT, 'local-images');

const TABLES = [
  { name: 'games', columns: ['image', 'cover_image', 'default_package_icon'] },
  { name: 'packages', columns: ['icon', 'label_icon'] },
  { name: 'special_packages', columns: ['icon', 'label_icon'] },
  { name: 'preorder_packages', columns: ['icon', 'label_icon'] },
  { name: 'events', columns: ['image'] },
  { name: 'payment_qr_settings', columns: ['qr_code_image'] },
];

async function run() {
  console.log('Scanning for local backups on VPS...');
  
  const mysql = require('mysql2/promise');
  const pool = await mysql.createPool({
    user: 'root',
    password: '',
    socketPath: '/var/run/mysqld/mysqld.sock',
    database: 'game_icon_manager',
  });

  for (const table of TABLES) {
    const { data: rows, error } = await supabase.from(table.name).select('*');
    if (error || !rows) continue;

    for (const row of rows) {
      for (const col of table.columns) {
        const val = row[col];
        if (!val || !val.startsWith('http')) continue;

        // Extract relative path from Supabase URL
        const match = val.match(/public\/site-assets\/(.*)/);
        if (match) {
          const relativePath = match[1];
          const fullLocalPath = path.join(STORAGE_ROOT, relativePath);
          
          if (fs.existsSync(fullLocalPath)) {
            console.log(`FOUND local backup for ${table.name} ID ${row.id} (${col}): ${relativePath}`);
            
            const hash = crypto.createHash('md5').update(val).digest('hex');
            const destPath = path.join(LOCAL_IMAGES_DIR, `${hash}.webp`);
            
            try {
              if (relativePath.toLowerCase().endsWith('.svg')) {
                const svgDest = path.join(LOCAL_IMAGES_DIR, `${hash}.svg`);
                fs.copyFileSync(fullLocalPath, svgDest);
                const localUrl = `/storage/local-images/${hash}.svg`;
                
                await supabase.from(table.name).update({ [col]: localUrl }).eq('id', row.id);
                await pool.query('INSERT INTO downloaded_images (original_url, local_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE local_path = ?', [val, localUrl, localUrl]);
                console.log(`  -> Successfully restored SVG locally as ${localUrl}`);
              } else {
                execSync(`convert "${fullLocalPath}" -resize "1000x>" -quality 80 -strip "${destPath}"`);
                const localUrl = `/storage/local-images/${hash}.webp`;
                
                await supabase.from(table.name).update({ [col]: localUrl }).eq('id', row.id);
                await pool.query('INSERT INTO downloaded_images (original_url, local_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE local_path = ?', [val, localUrl, localUrl]);
                console.log(`  -> Successfully optimized and restored as ${localUrl}`);
              }
            } catch (err) {
              console.error(`  -> Failed to convert/copy:`, err.message);
            }
          } else {
            console.log(`NOT found on VPS: ${relativePath}`);
          }
        }
      }
    }
  }

  // Also check site_settings
  const { data: settings } = await supabase.from('site_settings').select('*');
  if (settings) {
    for (const s of settings) {
      if (!s.value || typeof s.value !== 'string' || !s.value.startsWith('http')) continue;
      const match = s.value.match(/public\/site-assets\/(.*)/);
      if (match) {
        const relativePath = match[1];
        const fullLocalPath = path.join(STORAGE_ROOT, relativePath);
        if (fs.existsSync(fullLocalPath)) {
          console.log(`FOUND local backup for site_settings key "${s.key}": ${relativePath}`);
          const hash = crypto.createHash('md5').update(s.value).digest('hex');
          const destPath = path.join(LOCAL_IMAGES_DIR, `${hash}.webp`);
          try {
            if (relativePath.toLowerCase().endsWith('.svg')) {
              const svgDest = path.join(LOCAL_IMAGES_DIR, `${hash}.svg`);
              fs.copyFileSync(fullLocalPath, svgDest);
              const localUrl = `/storage/local-images/${hash}.svg`;
              await supabase.from('site_settings').update({ value: localUrl }).eq('id', s.id);
              await pool.query('INSERT INTO downloaded_images (original_url, local_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE local_path = ?', [s.value, localUrl, localUrl]);
              console.log(`  -> Restored key "${s.key}" to ${localUrl}`);
            } else {
              execSync(`convert "${fullLocalPath}" -resize "1000x>" -quality 80 -strip "${destPath}"`);
              const localUrl = `/storage/local-images/${hash}.webp`;
              await supabase.from('site_settings').update({ value: localUrl }).eq('id', s.id);
              await pool.query('INSERT INTO downloaded_images (original_url, local_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE local_path = ?', [s.value, localUrl, localUrl]);
              console.log(`  -> Restored key "${s.key}" to ${localUrl}`);
            }
          } catch (err) {
            console.error(`  -> Failed to convert/copy:`, err.message);
          }
        }
      }
    }
  }

  await pool.end();
  console.log('Local backups recovery run finished.');
}

run();
