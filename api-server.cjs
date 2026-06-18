const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const port = 3001;

app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://mejmrckrsvvjrpmftdjo.supabase.co', 
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

app.listen(port, () => {
  log('INFO', `Payment API running on port ${port}`);
});
