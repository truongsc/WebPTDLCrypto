import requests
import pandas as pd
import numpy as np
import mysql.connector
import time
from ta.trend import EMAIndicator, SMAIndicator, MACD
from ta.momentum import RSIIndicator
from ta.volatility import BollingerBands

# ==== DANH SÁCH 50 TOKEN ====
TOP_50_TOKENS = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'TRX', 'ADA', 'AVAX', 'LINK',
    'SUI', 'BCH', 'LTC', 'SHIB', 'TON', 'DOT', 'MNT', 'XMR', 'UNI', 'NEAR',
    'PEPE', 'APT', 'ICP', 'ARB', 'OP', 'INJ', 'HBAR', 'STX', 'VET', 'FIL',
    'MKR', 'ATOM', 'GRT', 'AXS', 'LDO', 'QNT', 'MATIC', 'TIA', 'SEI', 'WLD',
    'FET', 'RENDER', 'IMX', 'SAND', 'MANA', 'FLOKI', 'ALGO', 'XLM', 'EOS', 'XTZ'
]

# ==== CẤU HÌNH DATABASE ====
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',
    'database': 'crypto_data',
    'port': 3306
}

# ==== TẠO BẢNG (nếu chưa có) ====
def create_table():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS technical_indicators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            symbol VARCHAR(20),
            date DATE,
            rsi_14 FLOAT,
            rsi_7 FLOAT,
            rsi_30 FLOAT,
            sma_20 FLOAT,
            sma_50 FLOAT,
            ema_12 FLOAT,
            ema_26 FLOAT,
            macd FLOAT,
            macd_signal FLOAT,
            macd_histogram FLOAT,
            bollinger_upper FLOAT,
            bollinger_middle FLOAT,
            bollinger_lower FLOAT,
            volume_sma_20 FLOAT,
            timestamp DATETIME,
            UNIQUE KEY unique_symbol_date (symbol, date)
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()


# ==== HÀM LẤY DỮ LIỆU TỪ BINANCE ====
def get_binance_klines(symbol, interval='1d', days=365):
    """
    Binance giới hạn tối đa 1000 nến mỗi request.
    Hàm này sẽ yêu cầu đủ số ngày (mặc định 365) rồi trả về đúng số nến gần nhất.
    """
    limit = max(200, min(1000, days))  # đảm bảo đủ dữ liệu thô
    url = f'https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}'
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        df = pd.DataFrame(data, columns=[
            'open_time', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'qav', 'num_trades', 'tbbav', 'tbqav', 'ignore'
        ])

        df['open_time'] = pd.to_datetime(df['open_time'], unit='ms')
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)
        df = df.sort_values('open_time').tail(days)
        return df[['open_time', 'close', 'volume']]

    except Exception as e:
        print(f"❌ Error fetching {symbol}: {e}")
        return None


# ==== HÀM TÍNH TOÁN CÁC CHỈ BÁO ====
def calculate_indicators(df):
    df = df.copy()

    # RSI
    df['rsi_14'] = RSIIndicator(df['close'], window=14).rsi()
    df['rsi_7'] = RSIIndicator(df['close'], window=7).rsi()
    df['rsi_30'] = RSIIndicator(df['close'], window=30).rsi()

    # SMA & EMA
    df['sma_20'] = SMAIndicator(df['close'], window=20).sma_indicator()
    df['sma_50'] = SMAIndicator(df['close'], window=50).sma_indicator()
    df['ema_12'] = EMAIndicator(df['close'], window=12).ema_indicator()
    df['ema_26'] = EMAIndicator(df['close'], window=26).ema_indicator()

    # MACD
    macd = MACD(df['close'])
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_histogram'] = macd.macd_diff()

    # Bollinger Bands
    boll = BollingerBands(df['close'], window=20, window_dev=2)
    df['bollinger_upper'] = boll.bollinger_hband()
    df['bollinger_middle'] = boll.bollinger_mavg()
    df['bollinger_lower'] = boll.bollinger_lband()

    # Volume SMA
    df['volume_sma_20'] = SMAIndicator(df['volume'], window=20).sma_indicator()

    return df


# ==== LƯU DỮ LIỆU VÀO DATABASE ====
def save_to_db(symbol, df):
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    insert_query = """
        INSERT INTO technical_indicators (
            symbol, date, rsi_14, rsi_7, rsi_30,
            sma_20, sma_50, ema_12, ema_26,
            macd, macd_signal, macd_histogram,
            bollinger_upper, bollinger_middle, bollinger_lower,
            volume_sma_20, timestamp
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s,
            %s, NOW()
        )
        ON DUPLICATE KEY UPDATE
            rsi_14=VALUES(rsi_14),
            rsi_7=VALUES(rsi_7),
            rsi_30=VALUES(rsi_30),
            sma_20=VALUES(sma_20),
            sma_50=VALUES(sma_50),
            ema_12=VALUES(ema_12),
            ema_26=VALUES(ema_26),
            macd=VALUES(macd),
            macd_signal=VALUES(macd_signal),
            macd_histogram=VALUES(macd_histogram),
            bollinger_upper=VALUES(bollinger_upper),
            bollinger_middle=VALUES(bollinger_middle),
            bollinger_lower=VALUES(bollinger_lower),
            volume_sma_20=VALUES(volume_sma_20),
            timestamp=NOW()
    """

    for _, row in df.iterrows():
        cursor.execute(insert_query, (
            symbol,
            row['open_time'].date(),
            row['rsi_14'], row['rsi_7'], row['rsi_30'],
            row['sma_20'], row['sma_50'],
            row['ema_12'], row['ema_26'],
            row['macd'], row['macd_signal'], row['macd_histogram'],
            row['bollinger_upper'], row['bollinger_middle'], row['bollinger_lower'],
            row['volume_sma_20']
        ))

    conn.commit()
    cursor.close()
    conn.close()
    print(f"✅ Saved {symbol} ({len(df)} records) to DB")


# ==== CHƯƠNG TRÌNH CHÍNH ====
def main():
    create_table()
    print("🚀 Starting technical indicator update...")

    for idx, symbol in enumerate(TOP_50_TOKENS):
        pair = f"{symbol}USDT"
        df = get_binance_klines(pair, interval='1d', days=365)
        if df is not None:
            df = calculate_indicators(df)
            df = df.dropna(subset=['sma_50', 'volume_sma_20'])
            save_to_db(symbol, df)
        else:
            print(f"⚠️ Skipped {symbol}")
        time.sleep(1.5)  # tránh bị giới hạn API

    print("🎯 All indicators updated successfully!")


if __name__ == "__main__":
    main()
