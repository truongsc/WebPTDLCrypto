# Crypto Dashboard

Một dashboard thị trường cryptocurrency với dữ liệu thời gian thực từ Binance API.

## Tính năng

- 📊 Bảng giá thị trường với top 50 cryptocurrency
- 📈 Trang chi tiết token với biểu đồ giá
- 🔄 Biểu đồ đường và biểu đồ nến
- 📱 Responsive design với dark theme
- ⚡ Dữ liệu thời gian thực từ Binance API
- 🎯 Flask backend với built-in HTML frontend
- 🔧 RESTful API endpoints
- 📊 Interactive charts với Chart.js

## Cấu trúc dự án

```
Crypto_PTDL/
├── main.py                 # Flask backend server
├── data.py                 # Script lấy dữ liệu lịch sử
├── dataud.py              # Script cập nhật dữ liệu hàng ngày
├── create_token_info.py   # Script tạo thông tin token
├── requirements.txt       # Python dependencies
├── start-dev.bat         # Script khởi động development
├── frontend/             # React frontend (optional)
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── App.js
└── README.md
```

## Cài đặt và chạy

### Yêu cầu hệ thống
- Python 3.8+
- Node.js 16+
- MySQL 8.0+

### Bước 1: Cài đặt MySQL
1. Cài đặt MySQL và tạo database `crypto_data`
2. Cập nhật thông tin kết nối trong các file Python nếu cần

### Bước 2: Chạy script khởi tạo dữ liệu
```bash
# Tạo bảng và thông tin token
python create_token_info.py

# Lấy dữ liệu lịch sử (từ 2018)
python data.py

# Cập nhật dữ liệu hàng ngày
python dataud.py
```

### Bước 3: Khởi động ứng dụng
```bash
# Chạy script tự động (Windows)
start-dev.bat

# Hoặc chạy thủ công:
# Terminal 1 - Flask Backend
python main.py

# Terminal 2 - React Frontend (optional, Flask đã có built-in frontend)
cd frontend
npm install
npm start
```

**Lưu ý**: Flask server đã tích hợp sẵn frontend HTML trong `main.py`, có thể truy cập trực tiếp tại `http://127.0.0.1:5000`

## Flask Server

### Cấu hình server
Flask server chạy trên:
- **Host**: 127.0.0.1 (localhost)
- **Port**: 5000
- **Debug mode**: Enabled (development)
- **CORS**: Enabled cho tất cả origins

### Built-in Frontend
Flask server bao gồm một HTML template tích hợp với:
- Dark theme hiện đại
- Responsive design
- Interactive charts (Chart.js)
- Real-time data updates
- Token detail views với candlestick charts

## API Endpoints

- `GET /api/market-data` - Lấy dữ liệu thị trường
- `GET /api/token/{symbol}` - Lấy thông tin chi tiết token
- `GET /api/token/{symbol}/chart-data` - Lấy dữ liệu biểu đồ

## Cấu hình

### MySQL Configuration
Cập nhật thông tin kết nối trong các file:
- `main.py`
- `data.py`
- `dataud.py`
- `create_token_info.py`

```python
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',  # Thay đổi password của bạn
    'database': 'crypto_data'
}
```

## Tính năng chính

### Bảng thị trường
- Hiển thị top 50 cryptocurrency theo volume
- Thông tin: tên, ký hiệu, icon, giá, % thay đổi 1d/7d, volume 24h
- Sắp xếp theo volume giảm dần

### Trang chi tiết token
- Thông tin tổng quan: giá hiện tại, % thay đổi
- Thống kê: ATH, ATL, volume trung bình
- Biểu đồ giá với 2 loại:
  - Biểu đồ đường (Line Chart)
  - Biểu đồ nến (Candlestick Chart)
- Tùy chọn thời gian: 7d, 30d, 90d, 1y

## Cập nhật dữ liệu

Để cập nhật dữ liệu hàng ngày, chạy:
```bash
python dataud.py
```

Hoặc thiết lập cron job để tự động cập nhật.

## Troubleshooting

### Lỗi kết nối MySQL
- Kiểm tra MySQL service đang chạy
- Xác nhận thông tin kết nối trong config
- Đảm bảo database `crypto_data` đã được tạo

### Lỗi Binance API
- Kiểm tra kết nối internet
- Binance API có thể có rate limit, script đã có delay 1s giữa các request

### Lỗi Flask
- Kiểm tra Python version >= 3.8
- Cài đặt lại dependencies: `pip install -r requirements.txt`
- Kiểm tra port 5000 có bị chiếm dụng không

### Lỗi React (nếu sử dụng frontend riêng)
- Xóa `node_modules` và chạy lại `npm install`
- Kiểm tra Node.js version >= 16

## License

MIT License
