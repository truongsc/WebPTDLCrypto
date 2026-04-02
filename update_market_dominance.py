import mysql.connector
from datetime import datetime, timedelta
import requests
import time

# Danh sách 50 token phổ biến nhất để tính dominance
TOP_50_TOKENS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TRX', 'ADA', 'AVAX', 'LINK',
    'SUI', 'BCH', 'LTC', 'SHIB', 'TON', 'DOT', 'MNT', 'XMR', 'UNI', 'NEAR',
    'PEPE', 'APT', 'ICP', 'ARB', 'OP', 'INJ', 'HBAR', 'STX', 'VET', 'FIL',
    'MKR', 'ATOM', 'GRT', 'AXS', 'LDO', 'QNT', 'EOS', 'XTZ', 'KSM', 'THETA',
    'BSV', 'DASH', 'ZEC', 'XEM', 'IOTA', 'WAVES', 'ALGO', 'XLM', 'NEO', 'ETC'
]

# Cấu hình database
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',
    'database': 'crypto_data',
    'port': 3306
}

# Cấu hình số ngày lùi để lấy dữ liệu (từ ngày hôm nay trở về trước)
DAYS_BACK = 4  # Thay đổi số này để lấy dữ liệu từ bao nhiêu ngày trước

def get_coingecko_id(symbol):
    """Chuyển đổi symbol sang CoinGecko ID"""
    symbol_to_id = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'BNB': 'binancecoin',
        'SOL': 'solana',
        'XRP': 'ripple',
        'DOGE': 'dogecoin',
        'TRX': 'tron',
        'ADA': 'cardano',
        'AVAX': 'avalanche-2',
        'LINK': 'chainlink',
        'SUI': 'sui',
        'BCH': 'bitcoin-cash',
        'LTC': 'litecoin',
        'SHIB': 'shiba-inu',
        'TON': 'the-open-network',
        'DOT': 'polkadot',
        'MNT': 'mantle',
        'XMR': 'monero',
        'UNI': 'uniswap',
        'NEAR': 'near',
        'PEPE': 'pepe',
        'APT': 'aptos',
        'ICP': 'internet-computer',
        'ARB': 'arbitrum',
        'OP': 'optimism',
        'INJ': 'injective-protocol',
        'HBAR': 'hedera-hashgraph',
        'STX': 'stacks',
        'VET': 'vechain',
        'FIL': 'filecoin',
        'MKR': 'maker',
        'ATOM': 'cosmos',
        'GRT': 'the-graph',
        'AXS': 'axie-infinity',
        'LDO': 'lido-dao',
        'QNT': 'quant-network',
        'EOS': 'eos',
        'XTZ': 'tezos',
        'KSM': 'kusama',
        'THETA': 'theta-token',
        'BSV': 'bitcoin-sv',
        'DASH': 'dash',
        'ZEC': 'zcash',
        'XEM': 'nem',
        'IOTA': 'iota',
        'WAVES': 'waves',
        'ALGO': 'algorand',
        'XLM': 'stellar',
        'NEO': 'neo',
        'ETC': 'ethereum-classic'
    }
    return symbol_to_id.get(symbol.upper())

def fetch_market_cap_from_api(symbol, max_retries=3):
    """Lấy market cap từ CoinGecko API cho một token với retry logic
    
    Args:
        symbol: Mã token (ví dụ: BTC)
        max_retries: Số lần retry tối đa (mặc định: 3)
    """
    coin_id = get_coingecko_id(symbol)
    if not coin_id:
        return None
    
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
    
    for attempt in range(max_retries):
        try:
            # Delay trước khi gọi API để tránh rate limit
            if attempt > 0:
                wait_time = (2 ** attempt) * 5  # Exponential backoff: 10s, 20s, 40s
                print(f"Rate limit detected for {symbol}. Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            
            response = requests.get(url, timeout=1, params={
                'localization': False,
                'tickers': False,
                'market_data': True,
                'community_data': False,
                'developer_data': False
            })
            
            if response.status_code == 200:
                data = response.json()
                market_cap = data.get('market_data', {}).get('market_cap', {}).get('usd', 0)
                return float(market_cap) if market_cap else 0
            elif response.status_code == 429:
                print(f"Rate limit (429) for {symbol} - Attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    continue
                else:
                    print(f"Max retries reached for {symbol}. Please try again later.")
                    return None
            else:
                print(f"Error fetching market cap for {symbol}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error fetching market cap for {symbol} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                continue
            else:
                return None
    
    return None

def fetch_total_market_cap(max_retries=3):
    """Lấy tổng market cap từ CoinGecko global API với retry logic
    
    Args:
        max_retries: Số lần retry tối đa (mặc định: 3)
    """
    url = "https://api.coingecko.com/api/v3/global"
    
    for attempt in range(max_retries):
        try:
            # Delay trước khi gọi API để tránh rate limit
            if attempt > 0:
                wait_time = (2 ** attempt) * 5  # Exponential backoff: 10s, 20s, 40s
                print(f"Rate limit detected. Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
            
            response = requests.get(url, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                total_market_cap = data.get('data', {}).get('total_market_cap', {}).get('usd', 0)
                return float(total_market_cap) if total_market_cap else 0
            elif response.status_code == 429:
                print(f"Rate limit (429) - Attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    continue
                else:
                    print("Max retries reached. Please try again later.")
                    return None
            else:
                print(f"Error fetching total market cap: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error fetching total market cap (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                continue
            else:
                return None
    
    return None

def update_database(dominance_data, days_back=None):
    """Cập nhật dữ liệu vào MySQL database
    
    Args:
        dominance_data: Dữ liệu dominance đã tính toán
        days_back: Số ngày lùi để xóa dữ liệu cũ (mặc định: lấy từ DAYS_BACK)
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
        CREATE TABLE IF NOT EXISTS market_dominance_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            symbol VARCHAR(20) NOT NULL,
            market_cap_usd BIGINT,
            dominance_percent DECIMAL(10,4),
            timestamp DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_symbol_date (symbol, date),
            INDEX idx_date (date),
            INDEX idx_symbol (symbol)
        )
        """
        cursor.execute(create_table_query)
        
        today = datetime.now().date()
        current_timestamp = datetime.now()
        
        # Insert dữ liệu mới
        insert_query = """
        INSERT INTO market_dominance_history (
            date, symbol, market_cap_usd, dominance_percent, timestamp
        ) VALUES (
            %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            market_cap_usd = VALUES(market_cap_usd),
            dominance_percent = VALUES(dominance_percent),
            timestamp = VALUES(timestamp)
        """
        
        values = []
        for item in dominance_data:
            values.append((
                today,
                item['symbol'],
                item['market_cap_usd'],
                item['dominance_percent'],
                current_timestamp
            ))
        
        cursor.executemany(insert_query, values)
        connection.commit()
        
        print(f"Updated {len(values)} market dominance records for {today}")
        
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
    """Hàm chính để cập nhật dữ liệu market dominance"""
    print(f"Starting market dominance update...")
    print(f"Fetching data for last {DAYS_BACK} days")
    
    # Delay ban đầu để tránh rate limit ngay từ đầu
    print("Waiting 5 seconds before first API call...")
    time.sleep(5)
    
    # Lấy tổng market cap
    print("\nFetching total market cap...")
    total_market_cap = fetch_total_market_cap()
    
    if not total_market_cap or total_market_cap == 0:
        print("Failed to fetch total market cap")
        return
    
    print(f"Total market cap: ${total_market_cap:,.0f}")
    
    dominance_data = []
    
    # Lấy market cap cho tất cả 50 token
    print(f"\nFetching market cap for {len(TOP_50_TOKENS)} tokens...")
    
    for index, symbol in enumerate(TOP_50_TOKENS):
        print(f"\nFetching market cap for {symbol} ({index + 1}/{len(TOP_50_TOKENS)})...")
        
        # Delay trước mỗi request (trừ request đầu tiên sau total market cap)
        if index > 0:
            # Delay 15 giây giữa các request để tránh rate limit
            print("Waiting 15 seconds before next API call...")
            time.sleep(15)
        
        market_cap = fetch_market_cap_from_api(symbol)
        
        if market_cap and market_cap > 0:
            dominance_percent = (market_cap / total_market_cap) * 100
            dominance_data.append({
                'symbol': symbol,
                'market_cap_usd': market_cap,
                'dominance_percent': dominance_percent
            })
            print(f"{symbol}: ${market_cap:,.0f} ({dominance_percent:.2f}%)")
        else:
            print(f"Failed to fetch market cap for {symbol}")
    
    # Tính altcoin còn lại (tổng các token khác không trong top 50)
    top_50_market_cap = sum(item['market_cap_usd'] for item in dominance_data)
    altcoin_market_cap = total_market_cap - top_50_market_cap
    altcoin_dominance = (altcoin_market_cap / total_market_cap) * 100 if total_market_cap > 0 else 0
    
    # Thêm ALTCOIN vào danh sách nếu còn dư
    if altcoin_market_cap > 0:
        dominance_data.append({
            'symbol': 'ALTCOIN',
            'market_cap_usd': altcoin_market_cap,
            'dominance_percent': altcoin_dominance
        })
        print(f"\nAltcoin (Others): ${altcoin_market_cap:,.0f} ({altcoin_dominance:.2f}%)")
    
    if dominance_data:
        # Cập nhật database
        update_database(dominance_data, days_back=DAYS_BACK)
        print(f"\nMarket dominance update completed!")
    else:
        print(f"Failed to fetch dominance data")

if __name__ == "__main__":
    main()

