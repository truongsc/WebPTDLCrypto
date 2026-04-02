const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// Fear & Greed Index endpoint
router.get('/fear-greed', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range based on period
    let dateCondition = '';
    if (period === '7d') {
      dateCondition = 'WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === '30d') {
      dateCondition = 'WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === '90d') {
      dateCondition = 'WHERE date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    }

    const query = `
      SELECT 
        date,
        value,
        classification
      FROM fear_greed_index 
      ${dateCondition}
      ORDER BY date ASC
    `;

    const rows = await executeQuery(query);
    
    res.json({
      success: true,
      data: rows,
      period,
      count: rows.length
    });

  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch Fear & Greed Index data' 
    });
  }
});

// Market indicators summary
router.get('/summary', async (req, res) => {
  try {
    // Get latest FGI
    const fgiRows = await executeQuery(`
      SELECT fgi_value, date 
      FROM fear_greed_index 
      ORDER BY date DESC 
      LIMIT 1
    `);

    // Get total market cap trend (chỉ lấy dữ liệu trong 1 ngày)
    const marketCapRows = await executeQuery(`
      SELECT 
        date,
        SUM(market_cap_usd) as total_market_cap
      FROM market_cap_data 
      WHERE date >= CURDATE()
      GROUP BY date
      ORDER BY date ASC
      LIMIT 1
    `);

    // Get top tokens by volume
    const volumeRows = await executeQuery(`
      SELECT 
        symbol,
        name,
        close as current_price,
        volume,
        quote_asset_volume as quote_volume_24h,
        high as high_24h,
        low as low_24h
      FROM (
        SELECT 
          symbol,
          name,
          close,
          volume,
          quote_asset_volume,
          high,
          low,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM historical_prices
        WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      ) recent_data
      WHERE rn = 1
      ORDER BY quote_asset_volume DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        fear_greed_index: fgiRows[0] || null,
        market_cap_trend: marketCapRows,
        top_volume_tokens: volumeRows
      }
    });

  } catch (error) {
    console.error('Error fetching market indicators summary:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch market indicators summary' 
    });
  }
});

module.exports = router;