const axios = require('axios');
const { executeQuery } = require('../config/database');
const { generateMockFearGreedData, generateMockMarketCapData } = require('../../frontend/src/utils/mockData');

// Configuration
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const ALTERNATIVE_API = 'https://api.alternative.me/fng/';

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFearGreedIndex() {
  console.log('📊 Fetching Fear & Greed Index...');
  
  try {
    const response = await axios.get(ALTERNATIVE_API, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
      }
    });

    const fgiData = response.data.data[0];
    if (!fgiData) {
      throw new Error('No FGI data received');
    }

    const { value, value_classification, timestamp } = fgiData;
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];

    // Check if data already exists
    const existingData = await executeQuery(
      'SELECT * FROM fear_greed_index WHERE date = ?',
      [date]
    );

    if (existingData.length === 0) {
      await executeQuery(
        'INSERT INTO fear_greed_index (date, fgi_value, classification, timestamp) VALUES (?, ?, ?, FROM_UNIXTIME(?))',
        [date, value, value_classification, timestamp]
      );
      console.log(`✅ FGI data saved: ${date} - ${value} (${value_classification})`);
    } else {
      await executeQuery(
        'UPDATE fear_greed_index SET fgi_value = ?, classification = ?, timestamp = FROM_UNIXTIME(?) WHERE date = ?',
        [value, value_classification, timestamp, date]
      );
      console.log(`🔄 FGI data updated: ${date} - ${value} (${value_classification})`);
    }

    return { success: true, data: fgiData };
  } catch (error) {
    console.error('❌ Error fetching FGI:', error.message);
    
    // Use mock data as fallback
    console.log('🔄 Using mock FGI data...');
    const mockData = generateMockFearGreedData(1)[0];
    const date = new Date().toISOString().split('T')[0];
    
    try {
      await executeQuery(
        'INSERT INTO fear_greed_index (date, fgi_value, classification, timestamp) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE fgi_value = VALUES(fgi_value), classification = VALUES(classification)',
        [date, mockData.value, mockData.classification]
      );
      console.log(`✅ Mock FGI data saved: ${date} - ${mockData.value} (${mockData.classification})`);
      return { success: true, data: mockData, isMock: true };
    } catch (dbError) {
      console.error('❌ Error saving mock FGI data:', dbError.message);
      return { success: false, error: dbError.message };
    }
  }
}

async function fetchMarketCapData() {
  console.log('💰 Fetching Market Cap data...');
  
  try {
    // Fetch global market data
    const response = await axios.get(`${COINGECKO_API_BASE}/global`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
      }
    });

    await delay(2000); // Wait 2 seconds between requests

    // Fetch historical market cap data (7 days)
    const historicalResponse = await axios.get(
      `${COINGECKO_API_BASE}/global/market_cap_chart?vs_currency=usd&days=7`,
      {
        timeout: 15000,
        headers: {
          'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
        }
      }
    );

    const globalData = response.data.data;
    const historicalData = historicalResponse.data;

    const date = new Date().toISOString().split('T')[0];

    // Save global market cap data
    const existingGlobalData = await executeQuery(
      'SELECT * FROM market_cap_data WHERE date = ? AND symbol IS NULL',
      [date]
    );

    if (existingGlobalData.length === 0) {
      await executeQuery(
        'INSERT INTO market_cap_data (date, total_market_cap, market_cap_change_24h, active_cryptocurrencies, markets) VALUES (?, ?, ?, ?, ?)',
        [
          date,
          globalData.total_market_cap.usd,
          globalData.market_cap_change_percentage_24h_usd,
          globalData.active_cryptocurrencies,
          globalData.markets
        ]
      );
      console.log(`✅ Global market cap data saved: ${date} - $${globalData.total_market_cap.usd.toLocaleString()}`);
    } else {
      await executeQuery(
        'UPDATE market_cap_data SET total_market_cap = ?, market_cap_change_24h = ?, active_cryptocurrencies = ?, markets = ? WHERE date = ? AND symbol IS NULL',
        [
          globalData.total_market_cap.usd,
          globalData.market_cap_change_percentage_24h_usd,
          globalData.active_cryptocurrencies,
          globalData.markets,
          date
        ]
      );
      console.log(`🔄 Global market cap data updated: ${date}`);
    }

    // Save historical data (last 7 days)
    const marketCapHistory = historicalData.market_cap_chart;
    for (const [timestamp, marketCap] of marketCapHistory) {
      const historyDate = new Date(timestamp).toISOString().split('T')[0];
      
      const existingHistoryData = await executeQuery(
        'SELECT * FROM market_cap_data WHERE date = ? AND symbol IS NULL AND total_market_cap IS NOT NULL',
        [historyDate]
      );

      if (existingHistoryData.length === 0) {
        await executeQuery(
          'INSERT INTO market_cap_data (date, total_market_cap) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_market_cap = VALUES(total_market_cap)',
          [historyDate, marketCap]
        );
      }
    }

    console.log(`✅ Market cap history saved (${marketCapHistory.length} days)`);
    return { success: true, data: { global: globalData, historical: marketCapHistory } };

  } catch (error) {
    console.error('❌ Error fetching market cap data:', error.message);
    
    // Use mock data as fallback
    console.log('🔄 Using mock market cap data...');
    const mockData = generateMockMarketCapData(7);
    const date = new Date().toISOString().split('T')[0];
    
    try {
      // Save current day
      await executeQuery(
        'INSERT INTO market_cap_data (date, total_market_cap, market_cap_change_24h, active_cryptocurrencies, markets) VALUES (?, ?, 0, 8500, 800) ON DUPLICATE KEY UPDATE total_market_cap = VALUES(total_market_cap)',
        [date, mockData[mockData.length - 1].total_market_cap]
      );

      // Save historical data
      for (const dayData of mockData) {
        await executeQuery(
          'INSERT INTO market_cap_data (date, total_market_cap) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_market_cap = VALUES(total_market_cap)',
          [dayData.date, dayData.total_market_cap]
        );
      }

      console.log(`✅ Mock market cap data saved (${mockData.length} days)`);
      return { success: true, data: { global: mockData[mockData.length - 1], historical: mockData }, isMock: true };
    } catch (dbError) {
      console.error('❌ Error saving mock market cap data:', dbError.message);
      return { success: false, error: dbError.message };
    }
  }
}

async function fetchTokenData() {
  console.log('🪙 Fetching token data using your Python scripts...');
  
  try {
    // Use your existing Python scripts for token data
    const { exec } = require('child_process');
    const path = require('path');
    
    console.log('  Running your Python scripts for 50 tokens...');
    console.log('  📊 Tokens: BTC, ETH, BNB, SOL, XRP, DOGE, TRX, ADA, AVAX, LINK,');
    console.log('            SUI, BCH, LTC, SHIB, TON, DOT, MNT, XMR, UNI, NEAR,');
    console.log('            PEPE, APT, ICP, ARB, OP, INJ, HBAR, STX, VET, FIL,');
    console.log('            MKR, ATOM, GRT, AXS, LDO, QNT, EOS, XTZ, KSM, THETA,');
    console.log('            BSV, DASH, ZEC, XEM, IOTA, WAVES, ALGO, XLM, NEO, ETC');
    console.log('  ⏳ This will take about 5-10 minutes due to rate limiting...');
    
    // 1. First run dataud.py for daily update (last 3 days)
    console.log('\n  📅 Step 1: Running dataud.py for daily update...');
    const dataudScript = path.join(__dirname, '../../dataud.py');
    
    await new Promise((resolve, reject) => {
      exec(`python "${dataudScript}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ dataud.py error: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.log(`⚠️ dataud.py warning: ${stderr}`);
        }
        
        console.log('✅ dataud.py completed successfully');
        console.log(stdout);
        resolve();
      });
    });
    
    await delay(2000); // Wait 2 seconds between scripts
    
    // 2. Then run get_market_cap_safe.py for market cap data
    console.log('\n  💰 Step 2: Running get_market_cap_safe.py for market cap...');
    const marketCapScript = path.join(__dirname, '../../get_market_cap_safe.py');
    
    await new Promise((resolve, reject) => {
      exec(`python "${marketCapScript}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ get_market_cap_safe.py error: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.log(`⚠️ get_market_cap_safe.py warning: ${stderr}`);
        }
        
        console.log('✅ get_market_cap_safe.py completed successfully');
        console.log(stdout);
        resolve();
      });
    });
    
    console.log('✅ All token data fetch completed');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error running Python scripts:', error.message);
    return { success: false, error: error.message };
  }
}

async function fetchAllData() {
  console.log('🚀 Starting comprehensive data fetch...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Fetch Fear & Greed Index
    console.log('\n📊 Step 1: Fear & Greed Index');
    const fgiResult = await fetchFearGreedIndex();
    
    // 2. Fetch Market Cap data
    console.log('\n💰 Step 2: Market Cap Data');
    const marketCapResult = await fetchMarketCapData();
    
    // 3. Fetch Token data using your Python script
    console.log('\n🪙 Step 3: Token Data');
    const tokenResult = await fetchTokenData();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Data fetch completed!');
    
    const summary = {
      fgi: fgiResult.success,
      marketCap: marketCapResult.success,
      tokens: tokenResult.success,
      fgiIsMock: fgiResult.isMock || false,
      marketCapIsMock: marketCapResult.isMock || false
    };
    
    console.log('📊 Summary:');
    console.log(`   Fear & Greed Index: ${summary.fgi ? '✅' : '❌'} ${summary.fgiIsMock ? '(Mock)' : '(Real)'}`);
    console.log(`   Market Cap Data: ${summary.marketCap ? '✅' : '❌'} ${summary.marketCapIsMock ? '(Mock)' : '(Real)'}`);
    console.log(`   Token Data: ${summary.tokens ? '✅' : '❌'} (Python script)`);
    
    return summary;
    
  } catch (error) {
    console.error('\n❌ Error in data fetch process:', error.message);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  fetchAllData().then(result => {
    process.exit(result.success !== false ? 0 : 1);
  });
}

module.exports = { fetchAllData, fetchFearGreedIndex, fetchMarketCapData };
