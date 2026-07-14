import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env manually
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/);

const supabase = createSupabaseClient(
  urlMatch ? urlMatch[1] : '',
  keyMatch ? keyMatch[1] : ''
);

async function run() {
  try {
    const { data, error } = await supabase.from('site_settings').select('*').limit(1);
    if (error) throw error;
    console.log('Columns in site_settings:', Object.keys(data[0] || {}));
  } catch (e) {
    console.error(e);
  }
}
run();
