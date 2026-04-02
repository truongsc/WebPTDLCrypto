import mysql.connector
from datetime import datetime
import requests
import time

# Danh sách 50 token phổ biến nhất
TOP_50_TOKENS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TRX', 'ADA', 'AVAX', 'LINK',
    'SUI', 'BCH', 'LTC', 'SHIB', 'TON', 'DOT', 'MNT', 'XMR', 'UNI', 'NEAR',
    'PEPE', 'APT', 'ICP', 'ARB', 'OP', 'INJ', 'HBAR', 'STX', 'VET', 'FIL',
    'MKR', 'ATOM', 'GRT', 'AXS', 'LDO', 'QNT', 'MATIC', 'TIA', 'SEI', 'WLD',
    'FET', 'RENDER', 'IMX', 'SAND', 'MANA', 'FLOKI', 'ALGO', 'XLM', 'EOS', 'XTZ'
]

# Cấu hình database
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',
    'database': 'crypto_data',
    'port': 3306
}

def get_binance_klines(symbol, interval='1d', limit=365):
    """Lấy dữ liệu klines từ Binance API"""
    try:
        url = f"https://api.binance.com/api/v3/klines"
        params = {
            'symbol': f'{symbol}USDT',
            'interval': interval,
            'limit': limit
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
            print(f"Error processing kline for {symbol}: {e}")
            continue
    
    return cleaned_data

def save_to_database(data, table_name='historical_prices'):
    """Lưu dữ liệu vào MySQL database
    
    Cấu trúc bảng: id, symbol, timestamp, open, high, low, close, volume, quote_asset_volume, number_of_trades
    """
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Tạo câu lệnh INSERT (không có id vì AUTO_INCREMENT)
        # Cấu trúc bảng: id, symbol, timestamp, open, high, low, close, volume, quote_asset_volume, number_of_trades
        insert_query = f"""
        INSERT INTO {table_name} (
            symbol, timestamp, open, high, low, close, volume,
            quote_asset_volume, number_of_trades
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
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
        
        print(f"Saved {len(values)} records for {data[0]['symbol']}")
        
    except Exception as e:
        print(f"Error saving to database for {data[0]['symbol'] if data else 'unknown'}: {e}")
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
    """Hàm chính để lấy dữ liệu cho tất cả tokens"""
    print("Starting data collection for 50 tokens...")
    
    for i, symbol in enumerate(TOP_50_TOKENS, 1):
        print(f"\nProcessing {symbol} ({i}/{len(TOP_50_TOKENS)})...")
        
        # Lấy dữ liệu từ Binance
        klines_data = get_binance_klines(symbol)
        
        if klines_data:
            # Làm sạch dữ liệu
            cleaned_data = clean_and_format_data(klines_data, symbol)
            
            if cleaned_data:
                # Lưu vào database
                save_to_database(cleaned_data)
            else:
                print(f"No cleaned data for {symbol}")
        else:
            print(f"Failed to fetch data for {symbol}")
        
        # Nghỉ 1 giây để tránh rate limit
        time.sleep(1)
    
    print("\nData collection completed!")

if __name__ == "__main__":
    main()
