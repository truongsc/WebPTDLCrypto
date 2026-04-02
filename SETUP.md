# 📦 HƯỚNG DẪN CÀI ĐẶT VÀ THIẾT LẬP DỰ ÁN

Hướng dẫn chi tiết để cài đặt và chạy dự án **Hệ thống Phân tích Thị trường Tiền điện tử** trên máy mới.

---

## 📋 MỤC LỤC

1. [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
2. [Cài đặt môi trường](#-cài-đặt-môi-trường)
3. [Cấu hình MySQL](#-cấu-hình-mysql)
4. [Cài đặt dependencies](#-cài-đặt-dependencies)
5. [Thiết lập cấu hình](#-thiết-lập-cấu-hình)
6. [Khởi tạo Database](#-khởi-tạo-database)
7. [Thu thập dữ liệu ban đầu](#-thu-thập-dữ-liệu-ban-đầu)
8. [Khởi động dự án](#-khởi-động-dự-án)
9. [Kiểm tra và Troubleshooting](#-kiểm-tra-và-troubleshooting)

---

## 💻 YÊU CẦU HỆ THỐNG

### Phần mềm cần thiết

1. **Node.js** (phiên bản 16.x trở lên)
   - Download: https://nodejs.org/
   - Kiểm tra: `node --version`
   - npm sẽ được cài đặt cùng Node.js

2. **Python** (phiên bản 3.8 trở lên, khuyến nghị 3.9+)
   - Download: https://www.python.org/downloads/
   - Kiểm tra: `python --version` hoặc `python3 --version`
   - Đảm bảo pip được cài đặt: `pip --version`

3. **MySQL** (phiên bản 5.7 trở lên hoặc MySQL 8.0)
   - Download: https://dev.mysql.com/downloads/mysql/
   - Hoặc sử dụng XAMPP, WAMP, Laragon (bao gồm MySQL)

4. **Git** (để clone repository)
   - Download: https://git-scm.com/downloads

### Hệ điều hành

- ✅ Windows 10/11
- ✅ macOS
- ✅ Linux (Ubuntu, Debian, etc.)

---

## 🔧 CÀI ĐẶT MÔI TRƯỜNG

### Bước 1: Clone repository

```bash
# Clone repository từ Git
git clone <repository-url>
cd Crypto_PTDL
```

Nếu không có Git, có thể tải file ZIP và giải nén.

### Bước 2: Kiểm tra cài đặt

```bash
# Kiểm tra Node.js
node --version
# Kết quả mong đợi: v16.x.x hoặc cao hơn

# Kiểm tra npm
npm --version
# Kết quả mong đợi: 8.x.x hoặc cao hơn

# Kiểm tra Python
python --version
# hoặc
python3 --version
# Kết quả mong đợi: Python 3.8.x hoặc cao hơn

# Kiểm tra pip
pip --version
# hoặc
pip3 --version

# Kiểm tra MySQL
mysql --version
# Kết quả mong đợi: mysql Ver 8.0.x hoặc tương tự
```

---

## 🗄️ CẤU HÌNH MYSQL

### Bước 1: Khởi động MySQL Server

**Windows:**
```bash
# Nếu dùng XAMPP: Khởi động MySQL từ XAMPP Control Panel
# Nếu cài đặt riêng: MySQL sẽ tự động khởi động khi boot
# Hoặc chạy lệnh:
net start MySQL80
```

**macOS:**
```bash
# Nếu cài đặt qua Homebrew:
brew services start mysql

# Hoặc:
sudo /usr/local/mysql/support-files/mysql.server start
```

**Linux (Ubuntu/Debian):**
```bash
sudo systemctl start mysql
# Hoặc
sudo service mysql start
```

### Bước 2: Đăng nhập MySQL và tạo Database

```bash
# Đăng nhập vào MySQL (thay 'root' và 'your_password' bằng thông tin của bạn)
mysql -u root -p

# Nhập mật khẩu khi được yêu cầu
```

Sau khi đăng nhập thành công, chạy các lệnh SQL sau:

```sql
-- Tạo database
CREATE DATABASE IF NOT EXISTS crypto_data;

-- Kiểm tra database đã được tạo
SHOW DATABASES;

-- Chọn database để sử dụng
USE crypto_data;

-- Thoát MySQL
EXIT;
```

### Bước 3: Lưu thông tin MySQL của bạn

**Quan trọng:** Ghi nhớ các thông tin sau để cấu hình:
- `DB_HOST`: Thường là `localhost` hoặc `127.0.0.1`
- `DB_USER`: Tên user MySQL (thường là `root`)
- `DB_PASSWORD`: Mật khẩu MySQL của bạn
- `DB_PORT`: Cổng MySQL (mặc định là `3306`)
- `DB_NAME`: Tên database (là `crypto_data`)

---

## 📦 CÀI ĐẶT DEPENDENCIES

### 1. Cài đặt Python Dependencies

```bash
# Đảm bảo đang ở thư mục gốc của project
cd Crypto_PTDL

# Cài đặt các thư viện Python
pip install -r requirements.txt

# Nếu gặp lỗi quyền, thử:
pip install --user -r requirements.txt

# Hoặc trên macOS/Linux:
pip3 install -r requirements.txt
```

**Các thư viện sẽ được cài đặt:**
- `requests`: HTTP requests để gọi API
- `mysql-connector-python`: Kết nối MySQL từ Python
- `pandas`: Xử lý và phân tích dữ liệu
- `numpy`: Tính toán số học
- `ta`: Technical Analysis Library (RSI, MACD, Bollinger Bands)
- `python-dateutil`: Xử lý ngày tháng

**Kiểm tra cài đặt:**
```bash
pip list | grep -E "requests|mysql-connector|pandas|numpy|ta"
```

### 2. Cài đặt Backend Dependencies (Node.js)

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt các packages
npm install

# Nếu gặp lỗi, thử xóa node_modules và cài lại:
# rm -rf node_modules package-lock.json  # Linux/macOS
# rmdir /s node_modules package-lock.json  # Windows
# npm install

# Quay lại thư mục gốc
cd ..
```

**Các thư viện chính sẽ được cài đặt:**
- `express`: Web framework
- `mysql2`: MySQL client cho Node.js
- `cors`: Cross-origin resource sharing
- `axios`: HTTP client
- `dotenv`: Quản lý environment variables
- Và các packages khác (xem `backend/package.json`)

### 3. Cài đặt Frontend Dependencies (React)

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt các packages
npm install

# Quay lại thư mục gốc
cd ..
```

**Các thư viện chính sẽ được cài đặt:**
- `react` & `react-dom`: React framework
- `react-router-dom`: Routing
- `chart.js` & `react-chartjs-2`: Biểu đồ
- `tailwindcss`: CSS framework
- `framer-motion`: Animation
- `react-query`: Data fetching
- Và các packages khác (xem `frontend/package.json`)

---

## ⚙️ THIẾT LẬP CẤU HÌNH

### Bước 1: Cấu hình Backend (MySQL Connection)

Tạo hoặc chỉnh sửa file `backend/config/config.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=crypto_data
DB_PORT=3306

# Server Configuration
PORT=8000
NODE_ENV=development

# Frontend URL (để CORS)
FRONTEND_URL=http://localhost:3000
```

**⚠️ QUAN TRỌNG:**
- Thay `your_mysql_password_here` bằng mật khẩu MySQL thực tế của bạn
- Nếu MySQL chạy trên port khác, thay đổi `DB_PORT`
- Nếu MySQL chạy trên máy khác, thay `localhost` bằng địa chỉ IP

### Bước 2: Cấu hình Python Scripts (MySQL Connection)

**Lưu ý:** Các file Python (`data.py`, `dataud.py`, `update_technical_indicators.py`, v.v.) có thể có cấu hình MySQL hardcoded. Bạn cần chỉnh sửa các file này.

Tìm và thay thế trong các file Python:

```python
# Tìm đoạn code này:
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',  # ← Thay mật khẩu này
    'database': 'crypto_data',
    'port': 3306
}
```

**Thay bằng mật khẩu MySQL của bạn:**

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'your_mysql_password_here',  # ← Mật khẩu của bạn
    'database': 'crypto_data',
    'port': 3306
}
```

**Các file cần chỉnh sửa:**
- `data.py`
- `dataud.py`
- `update_technical_indicators.py`
- `update_market_cap_data.py`
- `fetch_historical_data.py`
- Các file Python khác nếu có

---

## 🗃️ KHỞI TẠO DATABASE

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```bash
cd backend
node scripts/setup_database.js
cd ..
```

### Cách 2: Sử dụng file SQL trực tiếp

```bash
# Windows
mysql -u root -p crypto_data < backend\database\create_tables.sql

# macOS/Linux
mysql -u root -p crypto_data < backend/database/create_tables.sql
```

Sau đó nhập mật khẩu MySQL khi được yêu cầu.

### Kiểm tra database đã được tạo

```bash
mysql -u root -p

# Trong MySQL console:
USE crypto_data;
SHOW TABLES;

# Bạn sẽ thấy các bảng:
# - historical_prices
# - technical_indicators
# - fear_greed_index
# - market_cap_data
# - (và các bảng khác nếu có)

EXIT;
```

---

## 📊 THU THẬP DỮ LIỆU BAN ĐẦU

**⚠️ LƯU Ý:** Bước này cần thiết để có dữ liệu ban đầu cho hệ thống. Có thể mất 30-60 phút tùy vào tốc độ mạng.

### Thứ tự chạy các scripts:

#### 1. Thu thập dữ liệu giá lịch sử (365 ngày)

```bash
# Đảm bảo đang ở thư mục gốc
cd Crypto_PTDL

# Chạy script thu thập dữ liệu lịch sử
python data.py

# Hoặc
python3 data.py
```

**Thời gian:** ~20-40 phút (tùy vào tốc độ mạng và API rate limits)

#### 2. Thu thập Fear & Greed Index và Global Market Data

```bash
python fetch_historical_data.py
```

**Thời gian:** ~2-5 phút

#### 3. Tính toán chỉ báo kỹ thuật

```bash
python update_technical_indicators.py
```

**Thời gian:** ~5-10 phút

#### 4. Thu thập Market Cap và Dominance

```bash
python update_market_cap_data.py
```

**Thời gian:** ~5-10 phút

### Hoặc chạy tất cả bằng batch file (Windows)

```bash
# Tạo file fetch-data.bat với nội dung:
# @echo off
# python data.py
# python fetch_historical_data.py
# python update_technical_indicators.py
# python update_market_cap_data.py

# Sau đó chạy:
.\fetch-data.bat
```

### Kiểm tra dữ liệu đã được thu thập

```bash
mysql -u root -p

USE crypto_data;

-- Kiểm tra số lượng records trong bảng historical_prices
SELECT COUNT(*) as total_records FROM historical_prices;

-- Kiểm tra các tokens đã có dữ liệu
SELECT DISTINCT symbol FROM historical_prices LIMIT 10;

-- Kiểm tra technical indicators
SELECT COUNT(*) as indicator_records FROM technical_indicators;

EXIT;
```

---

## 🚀 KHỞI ĐỘNG DỰ ÁN

### Cách 1: Sử dụng batch file tự động (Windows - Khuyến nghị)

```bash
# Chạy file start-dev-new.bat
.\start-dev-new.bat
```

File này sẽ:
- Tự động kiểm tra và cài đặt dependencies nếu cần
- Khởi động backend server (port 8000)
- Khởi động frontend server (port 3000)
- Mở trình duyệt tự động

### Cách 2: Chạy thủ công

#### Terminal 1: Backend Server

```bash
cd backend
npm start
```

Bạn sẽ thấy thông báo:
```
Server is running on port 8000
Database connected successfully
```

#### Terminal 2: Frontend Server

```bash
cd frontend
npm start
```

Bạn sẽ thấy thông báo:
```
Compiled successfully!

You can now view crypto-analysis-dashboard in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

#### Terminal 3 (tùy chọn): Cập nhật dữ liệu hàng ngày

```bash
# Cập nhật giá mới nhất (3 ngày gần nhất)
python dataud.py

# Hoặc cập nhật market cap
python update_market_cap_data.py
```

### Truy cập ứng dụng

1. **Frontend Dashboard**: http://localhost:3000
2. **Backend API**: http://localhost:8000/api
3. **Health Check**: http://localhost:8000/api/health

---

## ✅ KIỂM TRA VÀ TROUBLESHOOTING

### Kiểm tra Backend đang chạy

```bash
# Kiểm tra API health
curl http://localhost:8000/api/health

# Hoặc mở trình duyệt:
# http://localhost:8000/api/health
```

**Response mong đợi:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Kiểm tra Frontend đang chạy

Mở trình duyệt và truy cập: http://localhost:3000

Bạn sẽ thấy Dashboard với:
- Market Overview Cards
- Top Gainers/Losers
- Market Heatmap
- Token Table

### Các lỗi thường gặp và cách khắc phục

#### 1. Lỗi: "Cannot connect to MySQL"

**Nguyên nhân:**
- MySQL server chưa khởi động
- Thông tin đăng nhập sai trong `backend/config/config.env`
- Port MySQL không đúng

**Giải pháp:**
```bash
# Kiểm tra MySQL đang chạy
# Windows:
net start | findstr MySQL

# macOS/Linux:
ps aux | grep mysql

# Kiểm tra kết nối MySQL
mysql -u root -p -h localhost -P 3306

# Kiểm tra lại file config.env
cat backend/config/config.env  # Linux/macOS
type backend\config\config.env  # Windows
```

#### 2. Lỗi: "Port 8000 already in use"

**Giải pháp:**
```bash
# Windows: Tìm và kill process
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Hoặc thay đổi port trong backend/config/config.env
PORT=8001
```

#### 3. Lỗi: "Port 3000 already in use"

**Giải pháp:**
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Hoặc React sẽ tự động đề xuất port khác (3001, 3002, etc.)
```

#### 4. Lỗi: "Module not found" hoặc "Cannot find module"

**Giải pháp:**
```bash
# Xóa node_modules và cài lại
# Backend:
cd backend
rm -rf node_modules package-lock.json  # Linux/macOS
rmdir /s node_modules package-lock.json  # Windows
npm install

# Frontend:
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 5. Lỗi: "Insufficient historical data"

**Nguyên nhân:** Chưa chạy script thu thập dữ liệu ban đầu

**Giải pháp:**
```bash
# Chạy lại script thu thập dữ liệu
python data.py
python update_technical_indicators.py
```

#### 6. Lỗi: "Access denied for user" (MySQL)

**Nguyên nhân:** Mật khẩu MySQL sai hoặc user không có quyền

**Giải pháp:**
```bash
# Đăng nhập MySQL và kiểm tra user
mysql -u root -p

# Kiểm tra user hiện tại
SELECT USER(), CURRENT_USER();

# Tạo user mới nếu cần (hoặc reset password)
CREATE USER 'crypto_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON crypto_data.* TO 'crypto_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Sau đó cập nhật config.env với user mới
```

#### 7. Lỗi Python: "No module named 'xxx'"

**Giải pháp:**
```bash
# Cài lại requirements
pip install -r requirements.txt

# Hoặc cài từng package
pip install requests mysql-connector-python pandas numpy ta python-dateutil
```

#### 8. Lỗi: "API rate limit exceeded" (khi chạy Python scripts)

**Nguyên nhân:** Gọi API quá nhiều lần trong thời gian ngắn

**Giải pháp:**
- Scripts đã có delay tự động, nhưng nếu vẫn lỗi:
- Tăng thời gian delay trong code (tìm `time.sleep()`)
- Hoặc chạy lại sau vài phút

### Kiểm tra logs

#### Backend logs
Xem console output của terminal chạy `npm start` trong thư mục `backend`

#### Frontend logs
Xem console output của terminal chạy `npm start` trong thư mục `frontend`
Hoặc mở Developer Tools (F12) trong trình duyệt

---

## 📝 CHECKLIST CÀI ĐẶT

Sử dụng checklist này để đảm bảo bạn đã hoàn thành tất cả các bước:

- [ ] Đã cài đặt Node.js (v16+)
- [ ] Đã cài đặt Python (v3.8+)
- [ ] Đã cài đặt MySQL (v5.7+)
- [ ] Đã clone repository
- [ ] Đã cài đặt Python dependencies (`pip install -r requirements.txt`)
- [ ] Đã cài đặt Backend dependencies (`cd backend && npm install`)
- [ ] Đã cài đặt Frontend dependencies (`cd frontend && npm install`)
- [ ] Đã khởi động MySQL server
- [ ] Đã tạo database `crypto_data`
- [ ] Đã cấu hình `backend/config/config.env` với mật khẩu MySQL đúng
- [ ] Đã cấu hình các file Python với mật khẩu MySQL đúng
- [ ] Đã chạy `node scripts/setup_database.js` để tạo tables
- [ ] Đã chạy `python data.py` để thu thập dữ liệu lịch sử
- [ ] Đã chạy `python fetch_historical_data.py`
- [ ] Đã chạy `python update_technical_indicators.py`
- [ ] Đã chạy `python update_market_cap_data.py`
- [ ] Đã khởi động Backend server (port 8000)
- [ ] Đã khởi động Frontend server (port 3000)
- [ ] Đã truy cập http://localhost:3000 thành công
- [ ] Đã kiểm tra API health endpoint thành công

---

## 🎉 HOÀN TẤT!

Nếu bạn đã hoàn thành tất cả các bước trên, hệ thống đã sẵn sàng sử dụng!

**Các bước tiếp theo:**
1. Khám phá Dashboard tại http://localhost:3000
2. Xem phân tích token tại trang Token Analysis
3. Kiểm tra Market Indicators
4. Sử dụng các công cụ đầu tư (DCA Planner, Portfolio Analysis)

**Cập nhật dữ liệu hàng ngày:**
```bash
# Cập nhật giá mới nhất
python dataud.py

# Cập nhật market cap
python update_market_cap_data.py

# Tính lại technical indicators
python update_technical_indicators.py
```

**Hỗ trợ:**
- Xem file `README.md` để biết thêm chi tiết về dự án
- Kiểm tra logs trong console để debug các vấn đề
- Đảm bảo MySQL server luôn chạy khi sử dụng hệ thống

---

**Chúc bạn sử dụng hệ thống thành công! 🚀**

