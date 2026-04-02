import mysql.connector
from datetime import datetime, timedelta
import requests
import time

# Danh sách 50 token phổ biến nhất
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
DAYS_BACK = 22  # Thay đổi số này để lấy dữ liệu từ bao nhiêu ngày trước

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

def fetch_market_cap_data(symbol):
    """Lấy market cap data từ CoinGecko API cho một token"""
    coin_id = get_coingecko_id(symbol)
    if not coin_id:
        return None
    
    try:
        url = f"https://api.coingecko.com/api/v3/coins/{coin_id}"
        response = requests.get(url, timeout=10, params={
            'localization': False,
            'tickers': False,
            'market_data': True,
            'community_data': False,
            'developer_data': False
        })
        
        if response.status_code == 200:
            data = response.json()
            market_data = data.get('market_data', {})
            
            return {
                'market_cap_usd': float(market_data.get('market_cap', {}).get('usd', 0) or 0),
                'circulating_supply': float(market_data.get('circulating_supply', 0) or 0),
                'total_supply': float(market_data.get('total_supply', 0) or 0)
            }
        else:
            print(f"Error fetching data for {symbol}: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

def update_database(data, days_back=None):
    """Cập nhật dữ liệu vào MySQL database
    
    Args:
        data: Dữ liệu market cap đã lấy
        days_back: Số ngày lùi để xóa dữ liệu cũ (mặc định: lấy từ DAYS_BACK)
    """
    if days_back is None:
        days_back = DAYS_BACK
    
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Tính toán ngày bắt đầu
        start_date = (datetime.now() - timedelta(days=days_back)).date()
        today = datetime.now().date()
        current_timestamp = datetime.now()
        
        # Insert dữ liệu mới cho từng token
        insert_query = """
        INSERT INTO market_cap_data (
            symbol, date, market_cap_usd, circulating_supply, total_supply, timestamp
        ) VALUES (
            %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            market_cap_usd = VALUES(market_cap_usd),
            circulating_supply = VALUES(circulating_supply),
            total_supply = VALUES(total_supply),
            timestamp = VALUES(timestamp)
        """
        
        values = []
        for item in data:
            values.append((
                item['symbol'],
                today,
                item['market_cap_usd'],
                item['circulating_supply'],
                item['total_supply'],
                current_timestamp
            ))
        
        cursor.executemany(insert_query, values)
        connection.commit()
        
        print(f"Updated {len(values)} market cap records for {today}")
        
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
    """Hàm chính để cập nhật dữ liệu market cap cho tất cả tokens"""
    print(f"Starting market cap data update for {len(TOP_50_TOKENS)} tokens...")
    print(f"Fetching data for last {DAYS_BACK} days")
    
    all_data = []
    
    for i, symbol in enumerate(TOP_50_TOKENS, 1):
        print(f"\nUpdating {symbol} ({i}/{len(TOP_50_TOKENS)})...")
        
        # Lấy dữ liệu từ CoinGecko API
        market_cap_data = fetch_market_cap_data(symbol)
        
        if market_cap_data:
            all_data.append({
                'symbol': symbol,
                'market_cap_usd': market_cap_data['market_cap_usd'],
                'circulating_supply': market_cap_data['circulating_supply'],
                'total_supply': market_cap_data['total_supply']
            })
            print(f"Fetched: ${market_cap_data['market_cap_usd']:,.0f}")
        else:
            print(f"Failed to fetch data for {symbol}")
        
        # Nghỉ 1 giây để tránh rate limit (CoinGecko free tier: 10-50 calls/minute)
        time.sleep(1)
    
    if all_data:
        # Cập nhật database
        update_database(all_data, days_back=DAYS_BACK)
        print(f"\nMarket cap data update completed! Processed {len(all_data)} tokens")
    else:
        print(f"\nNo data to update")

if __name__ == "__main__":
    main()

