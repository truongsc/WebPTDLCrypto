-- Create database if not exists
CREATE DATABASE IF NOT EXISTS crypto_data;
USE crypto_data;

-- Fear & Greed Index table
CREATE TABLE IF NOT EXISTS fear_greed_index (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL UNIQUE,
  fgi_value INT NOT NULL,
  classification VARCHAR(50),
  timestamp DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date)
);

-- Market Cap Data table
CREATE TABLE IF NOT EXISTS market_cap_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  symbol VARCHAR(20),
  date DATE NOT NULL,
  market_cap_usd BIGINT,
  circulating_supply DECIMAL(20,8),
  total_supply DECIMAL(20,8),
  total_market_cap BIGINT,
  market_cap_change_24h DECIMAL(10,4),
  active_cryptocurrencies INT,
  markets INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_symbol_date (symbol, date),
  INDEX idx_date (date),
  UNIQUE KEY unique_symbol_date (symbol, date)
);

-- Insert sample FGI data
INSERT IGNORE INTO fear_greed_index (date, fgi_value, classification, timestamp) VALUES
(CURDATE(), 45, 'Fear', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 42, 'Fear', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 48, 'Neutral', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 52, 'Neutral', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 38, 'Fear', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 35, 'Fear', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), 41, 'Fear', NOW()),
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 44, 'Fear', NOW());

-- Insert sample market cap data
INSERT IGNORE INTO market_cap_data (date, total_market_cap, market_cap_change_24h, active_cryptocurrencies, markets) VALUES
(CURDATE(), 2100000000000, 2.5, 8500, 800),
(DATE_SUB(CURDATE(), INTERVAL 1 DAY), 2050000000000, 1.8, 8480, 795),
(DATE_SUB(CURDATE(), INTERVAL 2 DAY), 2010000000000, -1.2, 8450, 790),
(DATE_SUB(CURDATE(), INTERVAL 3 DAY), 2035000000000, 0.5, 8460, 792),
(DATE_SUB(CURDATE(), INTERVAL 4 DAY), 2020000000000, -0.8, 8440, 788),
(DATE_SUB(CURDATE(), INTERVAL 5 DAY), 2040000000000, 1.0, 8470, 793),
(DATE_SUB(CURDATE(), INTERVAL 6 DAY), 2025000000000, -0.3, 8450, 790),
(DATE_SUB(CURDATE(), INTERVAL 7 DAY), 2030000000000, 0.2, 8460, 791);

-- Insert sample individual token market cap data
INSERT IGNORE INTO market_cap_data (symbol, date, market_cap_usd, circulating_supply, total_supply) VALUES
('BTC', CURDATE(), 900000000000, 19500000, 21000000),
('ETH', CURDATE(), 280000000000, 120000000, 120000000),
('BNB', CURDATE(), 45000000000, 150000000, 200000000),
('SOL', CURDATE(), 38000000000, 450000000, 500000000),
('XRP', CURDATE(), 35000000000, 54000000000, 100000000000),
('ADA', CURDATE(), 12000000000, 35000000000, 45000000000),
('AVAX', CURDATE(), 8000000000, 350000000, 720000000),
('DOT', CURDATE(), 6000000000, 1200000000, 1400000000),
('MATIC', CURDATE(), 5000000000, 10000000000, 10000000000),
('LINK', CURDATE(), 4000000000, 500000000, 1000000000);

SELECT 'Database tables created successfully!' as status;
