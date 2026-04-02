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

// Alternative.me FGI API
const FGI_API_URL = 'https://api.alternative.me/fng/';

async function updateFGIData() {
  let connection;
  
  try {
    console.log('🔄 Updating Fear & Greed Index data...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Fetch FGI data from Alternative.me
    const response = await axios.get(FGI_API_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
      }
    });

    const fgiData = response.data.data[0];
    const fgiValue = parseInt(fgiData.value);
    const fgiClassification = fgiData.value_classification;
    const timestamp = parseInt(fgiData.timestamp);

    console.log(`📊 FGI Value: ${fgiValue} (${fgiClassification})`);

    // Check if data already exists for today
    const [existingRows] = await connection.execute(
      'SELECT id FROM fear_greed_index WHERE date = CURDATE()'
    );

    if (existingRows.length > 0) {
      // Update existing record
      await connection.execute(
        `UPDATE fear_greed_index 
         SET fgi_value = ?, classification = ?, timestamp = ?, updated_at = NOW()
         WHERE date = CURDATE()`,
        [fgiValue, fgiClassification, new Date(timestamp * 1000)]
      );
      console.log('✅ Updated existing FGI record');
    } else {
      // Insert new record
      await connection.execute(
        `INSERT INTO fear_greed_index (date, fgi_value, classification, timestamp, created_at, updated_at)
         VALUES (CURDATE(), ?, ?, ?, NOW(), NOW())`,
        [fgiValue, fgiClassification, new Date(timestamp * 1000)]
      );
      console.log('✅ Inserted new FGI record');
    }

    // Get historical FGI data (last 30 days)
    const historicalResponse = await axios.get(`${FGI_API_URL}?limit=30`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Crypto-Analysis-Dashboard/1.0'
      }
    });

    const historicalData = historicalResponse.data.data;
    
    for (const data of historicalData) {
      const value = parseInt(data.value);
      const classification = data.value_classification;
      const timestamp = parseInt(data.timestamp);
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];

      // Check if record exists
      const [existingRows] = await connection.execute(
        'SELECT id FROM fear_greed_index WHERE date = ?',
        [date]
      );

      if (existingRows.length === 0) {
        await connection.execute(
          `INSERT INTO fear_greed_index (date, fgi_value, classification, timestamp, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [date, value, classification, new Date(timestamp * 1000)]
        );
        console.log(`✅ Inserted FGI data for ${date}: ${value}`);
      }
    }

    console.log('🎉 FGI data update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating FGI data:', error.message);
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

// Run if called directly
if (require.main === module) {
  updateFGIData();
}

module.exports = { updateFGIData };
