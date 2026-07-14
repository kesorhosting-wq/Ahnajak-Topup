const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = process.env.PORT || 3010;

app.use(express.json());

// Load .env file programmatically if not already loaded in the environment
if (!process.env.VITE_SUPABASE_URL && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

let gatewayConfig = null;

// Structured logging helper
function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: 'api-server',
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// Fetch gateway config from DB
async function fetchConfig() {
  try {
    log('INFO', 'Fetching gateway configuration');
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('config')
      .eq('slug', 'khqrcc')
      .single();

    if (data && data.config) {
      gatewayConfig = data.config;
      log('INFO', 'Gateway configuration updated');
    } else if (error) {
      log('ERROR', 'Error fetching gateway config', { error: error.message });
    }
  } catch (err) {
    log('ERROR', 'Unexpected error fetching config', { error: err.message });
  }
}

// Initial fetch and periodic refresh
fetchConfig();
setInterval(fetchConfig, 300000);

app.post('/api/create-payment', async (req, res) => {
  const { orderId, amount, remark } = req.body;

  if (!gatewayConfig || !gatewayConfig.secret_key || !gatewayConfig.profile_id) {
    await fetchConfig();
    if (!gatewayConfig || !gatewayConfig.secret_key)
      return res.status(500).json({ error: 'Gateway not configured' });
  }

  const success_url = `https://kesortopup.cam/success`;

  const plainHash = gatewayConfig.secret_key + orderId + amount + success_url + remark;
  const hash = crypto.createHash('sha1').update(plainHash).digest('hex');

  const params = new URLSearchParams({
    transaction_id: orderId,
    amount: String(amount),
    success_url: success_url,
    remark: remark,
    hash: hash
  });

  log('INFO', 'Generating payment URL', { orderId });
  res.json({ url: `${gatewayConfig.checkout_url}/${gatewayConfig.profile_id}?${params.toString()}` });
});

app.post('/api/khqrcc-webhook', async (req, res) => {
  const { transaction_id, amount, status, req_time, hash: received_hash } = req.body;

  if (!gatewayConfig || !gatewayConfig.secret_key) {
    await fetchConfig();
    if (!gatewayConfig || !gatewayConfig.secret_key) return res.status(500).send('Config missing');
  }

  const dataToHash = gatewayConfig.secret_key + req_time + transaction_id + amount + status;
  const expectedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  if (expectedHash !== received_hash) {
    log('WARN', 'Invalid webhook hash', { transaction_id });
    return res.status(403).send('Invalid hash');
  }

  if (status === 'SUCCESS') {
    // Verify the amount paid matches the database order amount to prevent price tampering
    const { data: order, error: orderError } = await supabase
      .from('topup_orders')
      .select('amount')
      .eq('id', transaction_id)
      .single();

    if (orderError || !order) {
      log('ERROR', 'Order not found in database for webhook verification', { transaction_id });
      return res.status(404).json({ error: 'Order not found' });
    }

    const paidAmount = parseFloat(amount);
    const expectedAmount = parseFloat(order.amount);

    if (isNaN(paidAmount) || isNaN(expectedAmount) || Math.abs(paidAmount - expectedAmount) > 0.01) {
      log('WARN', 'Price mismatch detected in payment webhook', { transaction_id, paidAmount, expectedAmount });
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }

    const { error } = await supabase
      .from('topup_orders')
      .update({ status: 'processing' })
      .eq('id', transaction_id);

    if (error) {
      log('ERROR', 'Supabase update error', { error: error.message, transaction_id });
      return res.status(500).json({ error: 'Failed to update order' });
    }

    log('INFO', 'Order processed successfully', { transaction_id });
    return res.status(200).json({ received: true });
  }

  res.status(400).send('Not success');
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

    console.log(`Optimized search query: "${q}" -> "${query}"`);

    const results = [];
    let success = false;

    // Try Google CSE (cx=c1bb7535fbf0d46a1) first
    try {
      console.log(`Trying Google CSE for query: "${query}"`);
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
              console.log(`Google CSE returned ${results.length} results.`);
            }
          }
        }
      }
    } catch (cseErr) {
      console.error('Google CSE search failed, falling back to Bing:', cseErr.message);
    }

    // Fallback to Bing Search if Google CSE failed or returned 0 results
    if (!success || results.length === 0) {
      console.log(`Falling back to Bing search for: "${query}"`);
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
        console.error('Web Search image fetch error:', e);
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  log('INFO', `Payment API running on port ${port}`);
});
