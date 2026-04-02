const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// Hàm trợ giúp để tính toán phần trăm thay đổi 24h
async function calculate24hChange(symbol, currentPrice) {
  try {
    const allPricesQuery = `
      SELECT close, timestamp 
      FROM historical_prices 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `;
    
    const allPrices = await executeQuery(allPricesQuery, [symbol]);

    if (allPrices.length < 2) {
      return 0;
    }

    const latestPrice = currentPrice;

    let price24hAgo = 0;
    for (let i = 1; i < allPrices.length; i++) {
      const timeDiff = new Date(allPrices[0].timestamp).getTime() - new Date(allPrices[i].timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      if (hoursDiff >= 20 && hoursDiff <= 28) { // Khoảng 24h
        price24hAgo = allPrices[i].close;
        break;
      }
    }
    
    if (price24hAgo === 0 && allPrices.length > 1) {
        price24hAgo = allPrices[1].close;
    }

    return price24hAgo ? ((latestPrice - price24hAgo) / price24hAgo * 100) : 0;

  } catch (error) {
    console.error(`Error calculating 24h change for ${symbol}:`, error);
    return 0;
  }
}

// Fast market overview - chỉ lấy dữ liệu cần thiết
router.get('/overview', async (req, res) => {
  try {
    // 1. FGI data
    const fgi = await executeQuery('SELECT value, classification FROM fear_greed_index ORDER BY date DESC LIMIT 1');
    
    // 2. Market cap data - lấy đầy đủ từ total_market_cap_trend
    const marketCap = await executeQuery(`
      SELECT total_market_cap, market_cap_change_24h, active_cryptocurrencies, markets 
      FROM total_market_cap_trend 
      ORDER BY date DESC 
      LIMIT 1
    `);
    
    // 3. Top 5 tokens by volume
    const topVolume = await executeQuery(`
      SELECT symbol, quote_asset_volume as volume, close as price 
      FROM historical_prices 
      WHERE timestamp = (SELECT MAX(timestamp) FROM historical_prices WHERE symbol = historical_prices.symbol)
      ORDER BY quote_asset_volume DESC 
      LIMIT 5
    `);
    
    // 4. Market dominance
    const dominance = await executeQuery(`
      SELECT symbol, dominance_percent 
      FROM market_dominance_history 
      WHERE date = (SELECT MAX(date) FROM market_dominance_history)
      ORDER BY dominance_percent DESC 
      LIMIT 10
    `);

    // 5. Tính Top Gainers và Top Losers - chỉ lấy tokens có dữ liệu giá trong ngày hôm nay
    const allTokensForChanges = await executeQuery(`
      SELECT 
        ti.symbol,
        hp.close as price,
        hp.timestamp
      FROM token_info ti
      LEFT JOIN (
        SELECT symbol, close, timestamp,
               ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM historical_prices
        WHERE close IS NOT NULL AND close > 0
          AND DATE(timestamp) = CURDATE()
      ) hp ON ti.symbol = hp.symbol AND hp.rn = 1
      WHERE hp.close IS NOT NULL AND hp.timestamp IS NOT NULL
    `);

    const tokensWith24hChange = [];
    
    for (const token of allTokensForChanges) {
      // Tính % thay đổi 24h
      const change24h = await calculate24hChange(token.symbol, parseFloat(token.price));
      
      // Lấy tên và icon từ token_info
      const tokenInfo = await executeQuery('SELECT name, icon_url FROM token_info WHERE symbol = ?', [token.symbol]);
      
      tokensWith24hChange.push({
        symbol: token.symbol,
        name: tokenInfo[0]?.name || token.symbol,
        icon_url: tokenInfo[0]?.icon_url || null,
        price: parseFloat(token.price) || 0,
        change_24h: parseFloat(change24h.toFixed(2)) || 0
      });
    }

    // Sắp xếp và lấy top 3 gainers/losers từ TẤT CẢ tokens (không chỉ top 20 by volume)
    const sortedByChange = tokensWith24hChange.sort((a, b) => b.change_24h - a.change_24h);
    const top_gainers = sortedByChange.filter(t => t.change_24h > 0).slice(0, 3);
    // Top losers: lấy 3 token giảm nhiều nhất từ tất cả tokens (sắp xếp từ âm nhiều đến âm ít)
    const losers = sortedByChange.filter(t => t.change_24h < 0).sort((a, b) => a.change_24h - b.change_24h);
    const top_losers = losers.slice(0, 3); // Lấy 3 token đầu tiên (giảm nhiều nhất)

    // 6. Tính Market RSI từ API (tính từ market cap changes)
    let avgRSI = null;
    let rsiStatus = 'Neutral';
    
    try {
      const latestRsiDate = await executeQuery(`
        SELECT DATE(MAX(date)) as latest_date
        FROM technical_indicators
      `);
      
      if (latestRsiDate[0]?.latest_date) {
        const [rsiAggregate] = await executeQuery(`
          SELECT AVG(rsi_14) as avg_rsi
          FROM technical_indicators
          WHERE DATE(date) = ?
        `, [latestRsiDate[0].latest_date]);
        
        avgRSI = parseFloat(rsiAggregate?.avg_rsi) || null;
        if (avgRSI !== null) {
          if (avgRSI > 70) rsiStatus = 'Overbought';
          else if (avgRSI < 30) rsiStatus = 'Oversold';
        }
      }
    } catch (error) {
      console.error('Error calculating Market RSI:', error);
    }

    res.json({
      success: true,
      // Market cap data structure - lấy từ total_market_cap_trend
      market_cap: {
        total: parseFloat(marketCap[0]?.total_market_cap) || 0,
        token_count: parseInt(marketCap[0]?.active_cryptocurrencies) || 0,
        change_24h: parseFloat(marketCap[0]?.market_cap_change_24h) || 0
      },
      total_market_cap: parseFloat(marketCap[0]?.total_market_cap) || 0,
      market_cap_change_24h: parseFloat(marketCap[0]?.market_cap_change_24h) || 0,
      active_cryptocurrencies: parseInt(marketCap[0]?.active_cryptocurrencies) || 0,
      markets: parseInt(marketCap[0]?.markets) || 0,
      total_volume_24h: topVolume.reduce((sum, t) => sum + (parseFloat(t.volume) || 0), 0),
      btc_dominance: parseFloat(dominance.find(d => d.symbol === 'BTC')?.dominance_percent) || 42.5,
      eth_dominance: parseFloat(dominance.find(d => d.symbol === 'ETH')?.dominance_percent) || 18.2,
      fear_greed_index: {
        value: parseInt(fgi[0]?.value) || 50,
        classification: fgi[0]?.classification || 'Neutral'
      },
      // Market RSI data - lấy từ technical_indicators (trung bình RSI của tất cả token)
      market_rsi: {
        average: avgRSI || 0,
        status: rsiStatus
      },
      market_dominance: dominance.map(item => ({
        symbol: item.symbol,
        dominance_percent: parseFloat(item.dominance_percent) || 0,
        market_cap_usd: 0 // Will be populated later
      })),
      top_gainers: top_gainers.map(t => ({
        symbol: t.symbol,
        name: t.name,
        icon_url: t.icon_url,
        price: t.price,
        change_24h: t.change_24h
      })),
      top_losers: top_losers.map(t => ({
        symbol: t.symbol,
        name: t.name,
        icon_url: t.icon_url,
        price: t.price,
        change_24h: t.change_24h
      })),
      top_volume: topVolume.map(item => ({
        symbol: item.symbol,
        volume_24h: parseFloat(item.volume) || 0,
        price: parseFloat(item.price) || 0
      })),
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Market trends endpoint - lấy dữ liệu theo period (1d, 7d, 30d, 90d, 1y)
router.get('/trends', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Tính số ngày dựa trên period
    let days = 7;
    switch (period) {
      case '1d':
        days = 1;
        break;
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      case '1y':
        days = 365;
        break;
      default:
        days = 7;
    }
    
    // Lấy dữ liệu từ database (tối đa 365 ngày)
    const rows = await executeQuery(`
      SELECT date, total_market_cap, market_cap_change_24h, active_cryptocurrencies, markets
      FROM total_market_cap_trend 
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY date ASC
    `, [Math.min(days, 365)]);

    const marketCapTrend = rows.map(row => ({
      date: row.date,
      total_market_cap: parseFloat(row.total_market_cap) || 0,
      token_count: row.active_cryptocurrencies || 8500,
      change_24h: parseFloat(row.market_cap_change_24h) || 0,
      markets: row.markets || 800
    }));

    res.json({
      success: true,
      market_cap_trend: marketCapTrend,
      period: period,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market trends error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Market dominance endpoint
router.get('/dominance', async (req, res) => {
  try {
    const rows = await executeQuery(`
      SELECT symbol, dominance_percent
      FROM market_dominance_history 
      WHERE date = (SELECT MAX(date) FROM market_dominance_history)
      ORDER BY dominance_percent DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: rows.map(item => ({
        symbol: item.symbol,
        dominance_percent: parseFloat(item.dominance_percent) || 0
      }))
    });

  } catch (error) {
    console.error('Market dominance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
