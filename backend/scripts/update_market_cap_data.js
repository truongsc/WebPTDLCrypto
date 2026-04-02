const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crypto_data',
  charset: 'utf8mb4'
};

// CoinGecko API URLs
const COINGECKO_GLOBAL_API = 'https://api.coingecko.com/api/v3/global';
const COINGECKO_MARKET_CAP_API = 'https://api.coingecko.com/api/v3/global/market_cap_chart';

async function updateMarketCapData() {
  let connection;
  
  try {
    console.log('🔄 Updating Market Cap data...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Fetch global market data from CoinGecko
    const globalResponse = await axios.get(COINGECKO_GLOBAL_API, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
      }
    });

    const globalData = globalResponse.data.data;
    const totalMarketCap = globalData.total_market_cap.usd;
    const marketCapChange24h = globalData.market_cap_change_percentage_24h_usd;

    console.log(`📊 Total Market Cap: $${(totalMarketCap / 1e12).toFixed(2)}T`);
    console.log(`📈 24h Change: ${marketCapChange24h.toFixed(2)}%`);

    // Check if data already exists for today
    const [existingRows] = await connection.execute(
      'SELECT id FROM market_cap_data WHERE date = CURDATE()'
    );

    if (existingRows.length > 0) {
      // Update existing record
      await connection.execute(
        `UPDATE market_cap_data 
         SET total_market_cap = ?, market_cap_change_24h = ?, active_cryptocurrencies = ?, markets = ?, updated_at = NOW()
         WHERE date = CURDATE()`,
        [totalMarketCap, marketCapChange24h, globalData.active_cryptocurrencies, globalData.markets]
      );
      console.log('✅ Updated existing market cap record');
    } else {
      // Insert new record
      await connection.execute(
        `INSERT INTO market_cap_data (date, total_market_cap, market_cap_change_24h, active_cryptocurrencies, markets, created_at, updated_at)
         VALUES (CURDATE(), ?, ?, ?, ?, NOW(), NOW())`,
        [totalMarketCap, marketCapChange24h, globalData.active_cryptocurrencies, globalData.markets]
      );
      console.log('✅ Inserted new market cap record');
    }

    // Update individual token market cap data
    await updateTokenMarketCapData(connection);

    console.log('🎉 Market Cap data update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating market cap data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

async function updateTokenMarketCapData(connection) {
  try {
    console.log('🔄 Updating individual token market cap data...');

    // Get list of tokens from database
    const [tokens] = await connection.execute(
      'SELECT symbol, name FROM token_info ORDER BY symbol'
    );

    // Process tokens in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (token) => {
        try {
          // Use existing get_market_cap_safe.py logic or CoinGecko API
          const coinId = getCoinGeckoId(token.symbol);
          if (!coinId) {
            console.log(`⚠️ No CoinGecko ID found for ${token.symbol}`);
            return;
          }

          const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${coinId}`,
            {
              timeout: 10000,
              headers: {
                'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
              }
            }
          );

          const marketData = response.data.market_data;
          if (!marketData) return;

          const marketCap = marketData.market_cap?.usd;
          const circulatingSupply = marketData.circulating_supply;
          const totalSupply = marketData.total_supply;

          if (marketCap && marketCap > 0) {
            // Check if data exists for today
            const [existingRows] = await connection.execute(
              'SELECT id FROM market_cap_data WHERE symbol = ? AND date = CURDATE()',
              [token.symbol]
            );

            if (existingRows.length > 0) {
              await connection.execute(
                `UPDATE market_cap_data 
                 SET market_cap_usd = ?, circulating_supply = ?, total_supply = ?, updated_at = NOW()
                 WHERE symbol = ? AND date = CURDATE()`,
                [marketCap, circulatingSupply, totalSupply, token.symbol]
              );
            } else {
              await connection.execute(
                `INSERT INTO market_cap_data (symbol, date, market_cap_usd, circulating_supply, total_supply, created_at, updated_at)
                 VALUES (?, CURDATE(), ?, ?, ?, NOW(), NOW())`,
                [token.symbol, marketCap, circulatingSupply, totalSupply]
              );
            }

            console.log(`✅ Updated ${token.symbol}: $${(marketCap / 1e9).toFixed(2)}B`);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.log(`⚠️ Failed to update ${token.symbol}: ${error.message}`);
        }
      }));

      // Wait between batches
      if (i + batchSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error('❌ Error updating token market cap data:', error.message);
  }
}

function getCoinGeckoId(symbol) {
  const mapping = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'DOGE': 'dogecoin',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'TRX': 'tron',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'XLM': 'stellar',
    'ATOM': 'cosmos',
    'FIL': 'filecoin',
    'VET': 'vechain',
    'ICP': 'internet-computer'
  };
  
  return mapping[symbol.toUpperCase()];
}

// Run if called directly
if (require.main === module) {
  updateMarketCapData();
}

module.exports = { updateMarketCapData };
