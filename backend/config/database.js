const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '23082004',
  database: process.env.DB_NAME || 'crypto_data',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Get connection from pool
const getConnection = async () => {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw error;
  }
};

// Execute query
const executeQuery = async (query, params = []) => {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  getConnection,
  executeQuery,
  testConnection
};
