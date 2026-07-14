/**
 * routes/prices.cjs — Price update from G2Bulk catalogue
 * Ports the Supabase edge function `update-prices`.
 * POST /api/update-prices
 */
const express = require('express');
const { query } = require('../db.cjs');
const { requireAdmin } = require('../auth.cjs');

const router = express.Router();
const G2BULK_API_URL = 'https://api.g2bulk.com/v1';

router.post('/', requireAdmin, async (req, res) => {
  try {
    const apiConfig = (await require('../db.cjs').queryOne("SELECT * FROM api_configurations WHERE api_name = 'g2bulk'"));
    if (!apiConfig?.is_enabled || !apiConfig?.api_secret) {
      return res.status(400).json({ success: false, error: 'G2Bulk API not configured' });
    }
    const apiKey = apiConfig.api_secret;

    // Fetch all game catalogues and update package prices
    const headers = { 'Accept': 'application/json', 'X-API-Key': apiKey };
    const gamesRes = await fetch(`${G2BULK_API_URL}/games`, { headers });
    const gamesData = await gamesRes.json();

    if (!gamesData.success || !gamesData.games) {
      return res.json({ success: false, error: 'Failed to fetch games from G2Bulk' });
    }

    let updated = 0;
    let errors = 0;

    for (const game of gamesData.games) {
      try {
        const catRes = await fetch(`${G2BULK_API_URL}/games/${game.code}/catalogue`, { headers });
        const catData = await catRes.json();
        if (!catData.success || !catData.catalogues) continue;

        for (const cat of catData.catalogues) {
          const newPrice = parseFloat(cat.amount) || 0;
          const productId = `game_${game.code}_${cat.id}`;

          // Update packages
          const [pkgRes] = await query(
            'UPDATE packages SET price = ? WHERE g2bulk_product_id = ?',
            [newPrice, productId]
          );
          // Update special_packages
          const [spRes] = await query(
            'UPDATE special_packages SET price = ? WHERE g2bulk_product_id = ?',
            [newPrice, productId]
          );
          // Update preorder_packages
          const [poRes] = await query(
            'UPDATE preorder_packages SET price = ? WHERE g2bulk_product_id = ?',
            [newPrice, productId]
          );

          updated += pkgRes.affectedRows + spRes.affectedRows + poRes.affectedRows;
        }
      } catch (err) {
        errors++;
        console.error(`[UpdatePrices] Error for game ${game.code}:`, err.message);
      }
    }

    return res.json({ success: true, updated, errors });
  } catch (err) {
    console.error('[UpdatePrices] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;