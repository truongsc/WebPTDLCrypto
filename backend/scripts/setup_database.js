const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '23082004',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Setting up Crypto Database...');
    console.log(`📡 Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}`);
    
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, '../database/create_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        if (statement.toUpperCase().includes('CREATE DATABASE')) {
          // Use query() for DDL statements that don't work with prepared statements
          await connection.query(statement);
          console.log(`✅ Executed statement ${i + 1}: ${statement.substring(0, 50)}...`);
        } else if (statement.toUpperCase().includes('USE ')) {
          // Use query() for USE statements
          await connection.query(statement);
          console.log(`✅ Executed statement ${i + 1}: ${statement.substring(0, 50)}...`);
        } else if (statement.toUpperCase().includes('CREATE TABLE') || 
                   statement.toUpperCase().includes('INSERT') ||
                   statement.toUpperCase().includes('SELECT')) {
          await connection.execute(statement);
          console.log(`✅ Executed statement ${i + 1}: ${statement.substring(0, 50)}...`);
        }
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.code === 'ER_DUP_ENTRY' ||
            error.message.includes('already exists')) {
          console.log(`⚠️ Statement ${i + 1} skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Error in statement ${i + 1}: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - fear_greed_index');
    console.log('   - market_cap_data');
    console.log('   - Sample data inserted');

    // Test connection to the database
    console.log('\n🔍 Testing database connection...');
    await connection.query('USE crypto_data');
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ Found ${tables.length} tables in crypto_data database:`);
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Make sure MySQL server is running');
      console.error('   2. Check if port 3306 is accessible');
      console.error('   3. Verify MySQL credentials');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Check MySQL username and password');
      console.error('   2. Make sure user has CREATE privileges');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
