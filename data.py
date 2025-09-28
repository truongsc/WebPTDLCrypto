import pandas as pd
from binance.client import Client
import mysql.connector
from mysql.connector import Error
from datetime import datetime, timedelta
import time

# Cấu hình kết nối MySQL
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',  # Thay bằng password MySQL của bạn
    'database': 'crypto_data'     # Tên database, tạo trước nếu chưa có
}

# Danh sách cố định 50 token phổ biến trên Binance
TOP_50_TOKENS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TRX', 'ADA', 'AVAX', 'LINK',
    'SUI', 'BCH', 'LTC', 'SHIB', 'TON', 'DOT', 'MNT', 'XMR', 'UNI', 'NEAR',
    'PEPE', 'APT', 'ICP', 'ARB', 'OP', 'INJ', 'HBAR', 'STX', 'VET', 'FIL',
    'MKR', 'ATOM', 'GRT', 'AXS', 'LDO', 'QNT', 'EOS', 'XTZ', 'KSM', 'THETA',
    'BSV', 'DASH', 'ZEC', 'XEM', 'IOTA', 'WAVES', 'ALGO', 'XLM', 'NEO', 'ETC'
]

# Khởi tạo client Binance
binance_client = Client()

def get_decimals(price):
    """Logic làm tròn thập phân động dựa trên giá trị."""
    if pd.isna(price):
        return 8
    if price >= 1:
        return 2
    elif price >= 0.01:
        return 4
    else:
        return 8

def clean_data(df, token):
    """Lọc dữ liệu để đảm bảo sạch."""
    initial_rows = len(df)
    if df.empty:
        return df

    # 1. Loại bỏ NaN/null trong các cột quan trọng
    df = df.dropna(subset=['open', 'high', 'low', 'close', 'volume'])
    
    # 2. Kiểm tra giá trị bất thường
    df = df[(df['open'] > 0) & (df['high'] > 0) & (df['low'] > 0) & (df['close'] > 0)]
    df = df[df['volume'] >= 0]
    
    # 3. Kiểm tra logic OHLC: high >= low, open/close trong [low, high]
    df = df[df['high'] >= df['low']]
    df = df[(df['open'] >= df['low']) & (df['open'] <= df['high'])]
    df = df[(df['close'] >= df['low']) & (df['close'] <= df['high'])]
    
    # 4. Loại bỏ duplicates dựa trên symbol và timestamp
    df = df.drop_duplicates(subset=['symbol', 'timestamp'], keep='first')
    
    # 5. Kiểm tra số record
    final_rows = len(df)
    if final_rows < 30:
        print(f"Cảnh báo: {token} chỉ có {final_rows} records sau khi lọc, quá ít dữ liệu!")
    
    # 6. Ghi log dữ liệu bị xóa
    if initial_rows != final_rows:
        print(f"Đã xóa {initial_rows - final_rows} records của {token} do lỗi NaN, outliers, hoặc duplicates.")
    
    # 7. Kiểm tra tính liên tục (báo cáo ngày thiếu, không lấp đầy)
    expected_days = (datetime.now() - datetime(2018, 1, 1)).days
    actual_days = len(df['timestamp'].unique())
    if actual_days < expected_days * 0.9:  # Thiếu >10% ngày
        print(f"Cảnh báo: {token} thiếu dữ liệu, chỉ có {actual_days}/{expected_days} ngày.")
    
    return df

def get_klines_data(binance_symbol, token, interval='1d', start_time=None, end_time=None):
    """Lấy dữ liệu OHLCV và áp dụng làm tròn thập phân."""
    start_ts = int(start_time.timestamp() * 1000)
    end_ts = int(end_time.timestamp() * 1000)
    try:
        klines = binance_client.get_historical_klines(binance_symbol, interval, start_ts, end_ts)
    except Exception as e:
        print(f"Lỗi lấy dữ liệu cho {binance_symbol}: {e}")
        return pd.DataFrame()

    if not klines:
        print(f"Không có dữ liệu cho {binance_symbol}")
        return pd.DataFrame()

    df = pd.DataFrame(klines, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_asset_volume', 'number_of_trades',
        'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
    ])
    # Chuyển đổi và làm tròn
    for col in ['open', 'high', 'low', 'close']:
        df[col] = pd.to_numeric(df[col], errors='coerce').apply(lambda x: round(x, get_decimals(x)) if pd.notna(x) else x)
    df['volume'] = pd.to_numeric(df['volume'], errors='coerce').round(0)
    df['quote_asset_volume'] = pd.to_numeric(df['quote_asset_volume'], errors='coerce').round(0)
    df['number_of_trades'] = pd.to_numeric(df['number_of_trades'], errors='coerce').round(0)
    
    # Thêm cột
    df['symbol'] = token
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms').dt.strftime('%Y-%m-%d')
    df = df[['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume', 'quote_asset_volume', 'number_of_trades']]
    
    # Lọc dữ liệu
    df = clean_data(df, token)
    return df

def create_table(connection):
    """Tạo bảng historical_prices."""
    cursor = connection.cursor()
    create_table_query = """
    CREATE TABLE IF NOT EXISTS historical_prices (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timestamp DATE NOT NULL,
        open DECIMAL(18,8),
        high DECIMAL(18,8),
        low DECIMAL(18,8),
        close DECIMAL(18,8),
        volume DECIMAL(18,0),
        quote_asset_volume DECIMAL(18,0),
        number_of_trades BIGINT,
        UNIQUE (symbol, timestamp)
    )
    """
    try:
        cursor.execute(create_table_query)
        connection.commit()
        print("Bảng historical_prices đã được tạo/cập nhật.")
    except Error as e:
        print(f"Lỗi tạo bảng: {e}")
    finally:
        cursor.close()

def save_to_mysql(df, connection):
    """Lưu dữ liệu vào bảng."""
    if df.empty:
        return
    cursor = connection.cursor()
    insert_query = """
    INSERT IGNORE INTO historical_prices (symbol, timestamp, open, high, low, close, volume, quote_asset_volume, number_of_trades)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    data_to_insert = [tuple(row) for row in df.values]
    try:
        cursor.executemany(insert_query, data_to_insert)
        connection.commit()
        print(f"Đã lưu {len(data_to_insert)} records cho {df['symbol'].iloc[0]}")
    except Error as e:
        print(f"Lỗi lưu dữ liệu: {e}")
    finally:
        cursor.close()

def main():
    try:
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        print("Kết nối MySQL thành công!")
    except Error as e:
        print(f"Lỗi kết nối MySQL: {e}")
        return

    create_table(connection)

    # Thời gian: từ 2018
    end_time = datetime.now()
    start_time = datetime(2018, 1, 1)

    print(f"Processing 50 tokens: {TOP_50_TOKENS}")
    for token in TOP_50_TOKENS:
        binance_symbol = f"{token}USDT"
        print(f"Đang lấy dữ liệu cho {token} ({binance_symbol})...")
        try:
            # Kiểm tra cặp có tồn tại trên Binance
            binance_client.get_symbol_info(binance_symbol)
            df = get_klines_data(binance_symbol, token, start_time=start_time, end_time=end_time)
            save_to_mysql(df, connection)
            time.sleep(1)  # Rate limit Binance
        except Exception as e:
            print(f"Lỗi với {token}: {e}")
            continue

    connection.close()
    print("Hoàn thành!")

if __name__ == "__main__":
    main()