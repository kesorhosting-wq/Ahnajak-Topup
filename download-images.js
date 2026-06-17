import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_ROOT = '/var/www/new.kesortopup.cam/storage';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
  { name: 'games', columns: ['image', 'cover_image', 'default_package_icon'] },
  { name: 'packages', columns: ['icon', 'label_icon'] },
  { name: 'special_packages', columns: ['icon', 'label_icon'] },
  { name: 'preorder_packages', columns: ['icon', 'label_icon'] },
  { name: 'events', columns: ['image'] },
  { name: 'payment_qr_settings', columns: ['qr_code_image'] },
];

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    
    // Optimize after download
    try {
      execSync(`mogrify -resize "1000x>" -quality 80 -strip "${destPath}"`);
      console.log(`Optimized: ${path.basename(destPath)}`);
    } catch (optErr) {
      console.warn(`Failed to optimize ${destPath}:`, optErr.message);
    }
    
    return true;
  } catch (err) {
    console.error(`Error downloading ${url}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Starting image download to VPS...');
  
  for (const table of TABLES) {
    console.log(`Processing table: ${table.name}`);
    const { data, error } = await supabase.from(table.name).select(table.columns.join(','));
    
    if (error) {
      console.error(`Error fetching ${table.name}:`, error.message);
      continue;
    }
    
    for (const row of data) {
      for (const col of table.columns) {
        const url = row[col];
        if (!url || !url.startsWith('http')) continue;
        
        // Only download images from our Supabase storage
        if (url.includes('mejmrckrsvvjrpmftdjo.supabase.co/storage/v1/object/public/site-assets/')) {
          const relativePath = url.split('/site-assets/')[1];
          const destPath = path.join(STORAGE_ROOT, relativePath);
          
          if (fs.existsSync(destPath)) {
            // console.log(`Skipping existing: ${relativePath}`);
            continue;
          }
          
          console.log(`Downloading: ${relativePath}`);
          await downloadImage(url, destPath);
        }
      }
    }
  }
  
  console.log('Done!');
}

main();
