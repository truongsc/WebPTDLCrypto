import mysql.connector
from datetime import datetime, timedelta
import requests
import time

# Danh sách 50 token phổ biến nhất
TOP_50_TOKENS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TRX', 'ADA', 'AVAX', 'LINK',
    'SUI', 'BCH', 'LTC', 'SHIB', 'TON', 'DOT', 'MNT', 'XMR', 'UNI', 'NEAR',
    'PEPE', 'APT', 'ICP', 'ARB', 'OP', 'INJ', 'HBAR', 'STX', 'VET', 'FIL',
    'MKR', 'ATOM', 'GRT', 'AXS', 'LDO', 'QNT', 'MATIC', 'TIA', 'SEI', 'WLD',
    'FET', 'RENDER','DASH','ZEC' 'IMX','WAVES' 'SAND', 'MANA', 'FLOKI', 'ALGO', 'XLM', 'EOS', 'XTZ','IOTA','NEO','KSM'
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
DAYS_BACK = 1 # Thay đổi số này để lấy dữ liệu từ bao nhiêu ngày trước

def get_binance_klines(symbol, interval='1d', days_back=None):
    """Lấy dữ liệu klines từ Binance API
    
    Args:
        symbol: Mã token (ví dụ: BTC)
        interval: Khoảng thời gian (mặc định: '1d')
        days_back: Số ngày lùi để lấy dữ liệu (mặc định: lấy từ DAYS_BACK)
    """
    if days_back is None:
        days_back = DAYS_BACK
    
    try:
        url = f"https://api.binance.com/api/v3/klines"
        params = {
            'symbol': f'{symbol}USDT',
            'interval': interval,
            'limit': days_back
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        return response.json()
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return None

def clean_and_format_data(klines_data, symbol):
    """Làm sạch và định dạng dữ liệu klines"""
    cleaned_data = []
    
    for kline in klines_data:
        try:
            cleaned_kline = {
                'symbol': symbol,
                'open_time': datetime.fromtimestamp(kline[0] / 1000),
                'open': float(kline[1]),
                'high': float(kline[2]),
                'low': float(kline[3]),
                'close': float(kline[4]),
                'volume': float(kline[5]),
                'close_time': datetime.fromtimestamp(kline[6] / 1000),
                'quote_asset_volume': float(kline[7]),
                'number_of_trades': int(kline[8]),
                'taker_buy_base_asset_volume': float(kline[9]),
                'taker_buy_quote_asset_volume': float(kline[10])
            }
            cleaned_data.append(cleaned_kline)
        except Exception as e:
            print(f"Error processing kline for {symbol}: {e}"   )
            continue
    
    return cleaned_data

def update_database(data, table_name='historical_prices', days_back=None):
    """Cập nhật dữ liệu mới vào MySQL database
    
    Args:
        data: Dữ liệu đã làm sạch
        table_name: Tên bảng trong database
        days_back: Số ngày lùi để xóa dữ liệu cũ (mặc định: lấy từ DAYS_BACK)
    """
    if days_back is None:
        days_back = DAYS_BACK
    
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Tạo câu lệnh INSERT với ON DUPLICATE KEY UPDATE
        # Cấu trúc bảng: id (AUTO_INCREMENT), symbol, timestamp (có UNIQUE với symbol), open, high, low, close, volume, quote_asset_volume, number_of_trades
        insert_query = f"""
        INSERT INTO {table_name} (
            symbol, timestamp, open, high, low, close, volume,
            quote_asset_volume, number_of_trades
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            open = VALUES(open),
            high = VALUES(high),
            low = VALUES(low),
            close = VALUES(close),
            volume = VALUES(volume),
            quote_asset_volume = VALUES(quote_asset_volume),
            number_of_trades = VALUES(number_of_trades)
        """
        
        # Chuẩn bị dữ liệu
        values = []
        for item in data:
            values.append((
                item['symbol'],
                item['open_time'],  # open_time được insert vào cột timestamp
                item['open'],
                item['high'],
                item['low'],
                item['close'],
                item['volume'],
                item['quote_asset_volume'],
                item['number_of_trades']
            ))
        
        # Thực hiện INSERT
        cursor.executemany(insert_query, values)
        connection.commit()
        
        print(f"Updated {len(values)} records for {data[0]['symbol']}")
        
    except Exception as e:
        print(f"Error updating database for {data[0]['symbol'] if data else 'unknown'}: {e}")
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
    """Hàm chính để cập nhật dữ liệu cho tất cả tokens"""
    print(f"Starting daily update for {len(TOP_50_TOKENS)} tokens...")
    print(f"Fetching data for last {DAYS_BACK} days")
    
    for i, symbol in enumerate(TOP_50_TOKENS, 1):
        print(f"\nUpdating {symbol} ({i}/{len(TOP_50_TOKENS)})...")
        
        # Lấy dữ liệu mới từ Binance (số ngày được cấu hình trong DAYS_BACK)
        klines_data = get_binance_klines(symbol, days_back=DAYS_BACK)
        
        if klines_data:
            # Làm sạch dữ liệu
            cleaned_data = clean_and_format_data(klines_data, symbol)
            
            if cleaned_data:
                # Cập nhật database
                update_database(cleaned_data, days_back=DAYS_BACK)
            else:
                print(f"No cleaned data for {symbol}")
        else:
            print(f"Failed to fetch data for {symbol}")
        
        # Nghỉ 0.5 giây để tránh rate limit
        time.sleep(0.5)
    
    print(f"\nDaily update completed! Processed {len(TOP_50_TOKENS)} tokens for last {DAYS_BACK} days")

if __name__ == "__main__":
    main()
