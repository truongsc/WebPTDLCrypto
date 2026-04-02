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

# Cấu hình số ngày lùi để lấy dữ liệu (từ ngày hôm nay trở về trước)
DAYS_BACK = 10  # Thay đổi số này để lấy dữ liệu từ bao nhiêu ngày trước

def fetch_fear_greed_index(days=None):
    """Lấy dữ liệu Fear & Greed Index từ Alternative.me API
    
    Args:
        days: Số ngày lấy dữ liệu (mặc định: lấy từ DAYS_BACK)
    """
    if days is None:
        days = DAYS_BACK
    
    try:
        url = f"https://api.alternative.me/fng/?limit={days}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return data.get('data', [])
        else:
            print(f"Fear & Greed API Error: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"Error fetching Fear & Greed data: {e}")
        return []

def clean_and_format_data(fng_data):
    """Làm sạch và định dạng dữ liệu Fear & Greed Index"""
    cleaned_data = []
    
    for item in fng_data:
        try:
            cleaned_item = {
                'date': datetime.fromtimestamp(int(item['timestamp'])).date(),
                'value': int(item['value']),
                'classification': item['value_classification'],
                'timestamp': datetime.fromtimestamp(int(item['timestamp']))
            }
            cleaned_data.append(cleaned_item)
        except Exception as e:
            print(f"Error processing Fear & Greed data: {e}")
            continue
    
    return cleaned_data

def update_database(data, days_back=None):
    """Cập nhật dữ liệu vào MySQL database
    
    Args:
        data: Dữ liệu đã làm sạch
        days_back: Số ngày lùi để xóa dữ liệu cũ (mặc định: lấy từ DAYS_BACK)
    """
    if days_back is None:
        days_back = DAYS_BACK
    
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Insert dữ liệu mới (sử dụng value)
        insert_query = """
        INSERT INTO fear_greed_index (
            date, value, classification, timestamp
        ) VALUES (
            %s, %s, %s, %s
        )
        ON DUPLICATE KEY UPDATE
            value = VALUES(value),
            classification = VALUES(classification),
            timestamp = VALUES(timestamp)
        """
        
        values = []
        for item in data:
            values.append((
                item['date'],
                item['value'],
                item['classification'],
                item['timestamp']
            ))
        
        cursor.executemany(insert_query, values)
        connection.commit()
        
        print(f"Updated {len(values)} Fear & Greed records")
        
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
    """Hàm chính để cập nhật dữ liệu Fear & Greed Index"""
    print(f"Starting Fear & Greed Index update...")
    print(f"Fetching data for last {DAYS_BACK} days")
    
    # Lấy dữ liệu từ API
    fng_data = fetch_fear_greed_index(days=DAYS_BACK)
    
    if fng_data:
        # Làm sạch dữ liệu
        cleaned_data = clean_and_format_data(fng_data)
        
        if cleaned_data:
            # Cập nhật database
            update_database(cleaned_data, days_back=DAYS_BACK)
            print(f"\nFear & Greed Index update completed!")
        else:
            print(f"No cleaned data")
    else:
        print(f"Failed to fetch Fear & Greed data")

if __name__ == "__main__":
    main()

