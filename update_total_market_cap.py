import mysql.connector
from datetime import datetime, timedelta
import requests
import time

# Cấu hình database
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',
    'database': 'crypto_data',
    'port': 3306
}

# Cấu hình số ngày lịch sử cần lấy (từ ngày hôm nay trở về trước)
DAYS_BACK = 365  # Lấy lịch sử 1 năm (365 ngày)

def fetch_global_market_data():
    """Lấy dữ liệu global market cap từ CoinGecko API (dữ liệu hiện tại)"""
    try:
        url = "https://api.coingecko.com/api/v3/global"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            global_data = data.get('data', {})
            
            return {
                'total_market_cap_usd': global_data.get('total_market_cap', {}).get('usd', 0),
                'total_volume_24h': global_data.get('total_volume', {}).get('usd', 0),
                'market_cap_change_24h': global_data.get('market_cap_change_percentage_24h_usd', 0),
                'active_cryptocurrencies': global_data.get('active_cryptocurrencies', 0),
                'markets': global_data.get('markets', 0)
            }
        else:
            print(f"Global Market API Error: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error fetching global market data: {e}")
        return None

def fetch_historical_market_cap_from_database(days_back=365):
    """Lấy lịch sử market cap từ database (từ bảng market_cap_data hoặc market_dominance_history)"""
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor(dictionary=True)
        
        # Tính toán từ market_dominance_history (tổng market cap theo ngày)
        start_date = (datetime.now() - timedelta(days=days_back)).date()
        
        query = """
        SELECT 
            date,
            SUM(market_cap_usd) as total_market_cap,
            COUNT(DISTINCT symbol) as active_cryptocurrencies
        FROM market_dominance_history
        WHERE date >= %s
        GROUP BY date
        ORDER BY date ASC
        """
        
        cursor.execute(query, (start_date,))
        historical_data = cursor.fetchall()
        
        return historical_data
        
    except Exception as e:
        print(f"Error fetching historical market cap from database: {e}")
        return []
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def calculate_total_market_cap_from_dominance():
    """Tính tổng market cap từ bảng market_dominance_history cho ngày hiện tại"""
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        today = datetime.now().date()
        
        query = """
        SELECT SUM(market_cap_usd) as total_market_cap
        FROM market_dominance_history
        WHERE date = %s
        """
        
        cursor.execute(query, (today,))
        result = cursor.fetchone()
        
        return result[0] if result and result[0] else None
        
    except Exception as e:
        print(f"Error calculating total market cap from dominance: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def update_database(data, days_back=None, historical_data=None):
    """Cập nhật dữ liệu vào MySQL database
    
    Args:
        data: Dữ liệu global market cap hiện tại
        days_back: Số ngày lịch sử cần cập nhật (mặc định: lấy từ DAYS_BACK)
        historical_data: Dữ liệu lịch sử từ database (nếu có)
    """
    if days_back is None:
        days_back = DAYS_BACK
    
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Tạo bảng nếu chưa có
        create_table_query = """
        CREATE TABLE IF NOT EXISTS total_market_cap_trend (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL UNIQUE,
            total_market_cap BIGINT,
            market_cap_change_24h DECIMAL(10,4),
            active_cryptocurrencies INT,
            markets INT,
            timestamp DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_date (date)
        )
        """
        cursor.execute(create_table_query)
        
        today = datetime.now().date()
        
        # Không xóa dữ liệu cũ - giữ lại tất cả lịch sử
        
        # Insert hoặc update dữ liệu lịch sử từ database (nếu có)
        if historical_data:
            insert_historical_query = """
            INSERT INTO total_market_cap_trend (
                date, total_market_cap, market_cap_change_24h,
                active_cryptocurrencies, markets, timestamp
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
            ON DUPLICATE KEY UPDATE
                total_market_cap = VALUES(total_market_cap),
                active_cryptocurrencies = VALUES(active_cryptocurrencies),
                timestamp = VALUES(timestamp)
            """
            
            for hist_item in historical_data:
                hist_date = hist_item['date']
                # Tính market_cap_change_24h từ dữ liệu trước đó
                market_cap_change = 0
                
                cursor.execute(insert_historical_query, (
                    hist_date,
                    int(hist_item['total_market_cap']) if hist_item['total_market_cap'] else 0,
                    market_cap_change,
                    int(hist_item['active_cryptocurrencies']) if hist_item['active_cryptocurrencies'] else 0,
                    0,  # markets không có trong dữ liệu tính toán
                    datetime.now()
                ))
            
            print(f"Inserted/Updated {len(historical_data)} historical records")
        
        # Insert hoặc update dữ liệu hiện tại từ CoinGecko API
        insert_query = """
        INSERT INTO total_market_cap_trend (
            date, total_market_cap, market_cap_change_24h,
            active_cryptocurrencies, markets, timestamp
        ) VALUES (
            %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            total_market_cap = VALUES(total_market_cap),
            market_cap_change_24h = VALUES(market_cap_change_24h),
            active_cryptocurrencies = VALUES(active_cryptocurrencies),
            markets = VALUES(markets),
            timestamp = VALUES(timestamp)
        """
        
        current_timestamp = datetime.now()
        cursor.execute(insert_query, (
            today,
            int(data['total_market_cap_usd']),
            float(data['market_cap_change_24h']),
            int(data['active_cryptocurrencies']),
            int(data['markets']),
            current_timestamp
        ))
        
        connection.commit()
        print(f"Updated total market cap data for {today}")
        print(f"Kept all historical data (no deletion)")
        
    except Exception as e:
        print(f"Error updating database: {e}")
        import traceback
        traceback.print_exc()
        if connection:
            connection.rollback()
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

def main():
    """Hàm chính để cập nhật dữ liệu total market cap"""
    print(f"Starting total market cap update...")
    print(f"Will fetch history for last {DAYS_BACK} days (1 year)")
    
    # Lấy dữ liệu lịch sử từ database (từ market_dominance_history)
    print("\nFetching historical data from database...")
    historical_data = fetch_historical_market_cap_from_database(days_back=DAYS_BACK)
    print(f"Found {len(historical_data)} historical records")
    
    # Lấy dữ liệu hiện tại từ CoinGecko
    print("\nFetching current data from CoinGecko API...")
    global_data = fetch_global_market_data()
    
    if global_data:
        # Cập nhật database với cả dữ liệu lịch sử và dữ liệu hiện tại
        update_database(global_data, days_back=DAYS_BACK, historical_data=historical_data)
        print(f"\nTotal market cap update completed!")
        print(f"Updated current data and {len(historical_data)} historical records")
    else:
        print(f"Failed to fetch global market data")

if __name__ == "__main__":
    main()

