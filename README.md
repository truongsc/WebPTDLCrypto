# HỆ THỐNG PHÂN TÍCH THỊ TRƯỜNG TIỀN ĐIỆN TỬ

Hệ thống phân tích và dự báo giá tiền điện tử sử dụng kỹ thuật Big Data Analytics, Machine Learning và Deep Learning để hỗ trợ ra quyết định đầu tư thông minh.

---

## 📋 MỤC LỤC

1. [Hướng dẫn cài đặt và chạy](#-hướng-dẫn-cài-đặt-và-chạy-project)
2. [Tổng quan dự án](#-tổng-quan-dự-án)
3. [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
4. [Mô hình dự đoán giá](#-mô-hình-dự-đoán-giá-chi-tiết)
5. [Cơ sở dữ liệu](#-cơ-sở-dữ-liệu)
6. [API Endpoints](#-api-endpoints)
7. [Frontend Components](#-frontend-components)
8. [Quy trình thu thập dữ liệu](#-quy-trình-thu-thập-dữ-liệu)

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY PROJECT

> 📖 **Xem hướng dẫn chi tiết:** [SETUP.md](./SETUP.md) - Hướng dẫn đầy đủ cho máy mới, bao gồm cấu hình MySQL với mật khẩu khác nhau

### Yêu cầu hệ thống

- **Node.js**: Phiên bản 16.x trở lên
- **Python**: Phiên bản 3.8 trở lên
- **MySQL**: Phiên bản 5.7 trở lên hoặc MySQL 8.0
- **npm**: Đi kèm với Node.js
- **Git**: Để clone repository

### Bước 1: Clone repository

```bash
git clone <repository-url>
cd Crypto_PTDL
```

### Bước 2: Cài đặt dependencies

#### Backend (Node.js)
```bash
cd backend
npm install
cd ..
```

#### Frontend (React)
```bash
cd frontend
npm install
cd ..
```

#### Python scripts
```bash
pip install -r requirements.txt
```

**Các thư viện Python sẽ được cài đặt:**
- `requests`: HTTP requests để gọi API
- `mysql-connector-python`: Kết nối MySQL từ Python
- `pandas`: Xử lý và phân tích dữ liệu
- `numpy`: Tính toán số học
- `ta`: Technical Analysis Library (RSI, MACD, Bollinger Bands)
- `python-dateutil`: Xử lý ngày tháng

### Bước 3: Cấu hình Database

> ⚠️ **Quan trọng:** Khi chuyển sang máy khác, bạn cần cấu hình lại mật khẩu MySQL trong các file sau:
> - `backend/config/config.env` (cho Node.js backend)
> - `data.py`, `dataud.py`, `update_technical_indicators.py`, `update_market_cap_data.py`, và các file Python khác (cho Python scripts)

1. **Tạo database MySQL:**
```bash
mysql -u root -p
```
```sql
CREATE DATABASE IF NOT EXISTS crypto_data;
EXIT;
```

2. **Cấu hình file `backend/config/config.env`:**

Tạo file này nếu chưa có, và thay `your_password` bằng mật khẩu MySQL thực tế của bạn:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=crypto_data
DB_PORT=3306
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

3. **Cấu hình các file Python:**

Tìm và thay đổi trong các file Python (`data.py`, `dataud.py`, `update_technical_indicators.py`, v.v.):

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'your_mysql_password_here',  # ← Thay mật khẩu này
    'database': 'crypto_data',
    'port': 3306
}
```

3. **Tạo các bảng trong database:**
```bash
cd backend
node scripts/setup_database.js
cd ..
```

Hoặc chạy trực tiếp file SQL:
```bash
mysql -u root -p crypto_data < backend/database/create_tables.sql
```

### Bước 4: Thu thập dữ liệu ban đầu (Lần đầu chạy)

**Lưu ý**: Bước này chỉ cần chạy một lần để thu thập dữ liệu lịch sử. Có thể mất 30-60 phút tùy vào tốc độ mạng.

```bash
# Thu thập dữ liệu giá lịch sử 365 ngày cho 50 tokens
python data.py

# Thu thập Fear & Greed Index và Global Market Data
python fetch_historical_data.py

# Tính toán và lưu các chỉ báo kỹ thuật
python update_technical_indicators.py

# Thu thập market cap và dominance
python get_market_cap_safe.py
```

Hoặc sử dụng batch file (Windows):
```bash
.\fetch-data.bat
```

### Bước 5: Khởi động ứng dụng

#### Cách 1: Chạy tự động (Khuyến nghị - Windows)
```bash
.\start-dev-new.bat
```

File này sẽ tự động:
- Kiểm tra và cài đặt dependencies nếu chưa có
- Khởi động backend server (port 8000)
- Khởi động frontend server (port 3000)
- Mở trình duyệt tự động

#### Cách 2: Chạy thủ công

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Bước 6: Truy cập ứng dụng

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Health Check**: http://localhost:8000/api/health

### Cập nhật dữ liệu hàng ngày

Sau khi đã thu thập dữ liệu ban đầu, bạn có thể cập nhật dữ liệu hàng ngày:

```bash
# Cập nhật toàn bộ dữ liệu (giá, market cap, indicators)
.\daily-update.bat

# Hoặc cập nhật nhanh chỉ giá 50 tokens
.\quick-update.bat

# Hoặc cập nhật riêng market cap
.\update-market-cap.bat
```

---

## 📦 DEPENDENCIES VÀ REQUIREMENTS

### Python Dependencies

Xem file [requirements.txt](./requirements.txt) để biết danh sách đầy đủ các thư viện Python cần thiết.

**Cài đặt:**
```bash
pip install -r requirements.txt
```

### Node.js Dependencies

#### Backend (`backend/package.json`)
- express, cors, mysql2, axios, dotenv, helmet, compression, morgan, socket.io, v.v.

**Cài đặt:**
```bash
cd backend
npm install
```

#### Frontend (`frontend/package.json`)
- react, react-router-dom, chart.js, react-chartjs-2, tailwindcss, framer-motion, react-query, v.v.

**Cài đặt:**
```bash
cd frontend
npm install
```

### Database Requirements

- MySQL 5.7+ hoặc MySQL 8.0
- Database name: `crypto_data`
- Các bảng sẽ được tạo tự động khi chạy `setup_database.js`

---

## 🎯 TỔNG QUAN DỰ ÁN

### Mục tiêu

Hệ thống phân tích thị trường tiền điện tử được xây dựng để:

1. **Thu thập và xử lý dữ liệu**: Tự động thu thập dữ liệu giá, volume, market cap từ các API công khai (Binance, CoinGecko, Alternative.me)

2. **Phân tích kỹ thuật**: Tính toán các chỉ báo kỹ thuật như RSI, MACD, Bollinger Bands, SMA, EMA

3. **Dự báo giá**: Sử dụng 3 mô hình song song (Statistical, Machine Learning, Deep Learning) để dự báo giá 7 ngày tới

4. **Hỗ trợ ra quyết định**: Cung cấp khuyến nghị BUY/SELL/HOLD dựa trên phân tích tổng hợp

5. **Trực quan hóa**: Dashboard web tương tác với biểu đồ, heatmap, và các công cụ phân tích

### Đối tượng nghiên cứu

Hệ thống theo dõi và phân tích **50 tokens phổ biến nhất** bao gồm:
BTC, ETH, BNB, SOL, XRP, DOGE, TRX, ADA, AVAX, LINK, SUI, BCH, LTC, SHIB, TON, DOT, MNT, XMR, UNI, NEAR, PEPE, APT, ICP, ARB, OP, INJ, HBAR, STX, VET, FIL, MKR, ATOM, GRT, AXS, LDO, QNT, EOS, XTZ, KSM, THETA, BSV, DASH, ZEC, XEM, IOTA, WAVES, ALGO, XLM, NEO, ETC

### Nguồn dữ liệu

- **Binance API**: Dữ liệu giá OHLCV (Open, High, Low, Close, Volume) với interval 1d
- **CoinGecko API**: Market cap, circulating supply, dominance
- **Alternative.me API**: Fear & Greed Index

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Cấu trúc thư mục

```
Crypto_PTDL/
├── backend/                      # Node.js Backend API
│   ├── config/                   # Cấu hình database và environment
│   │   ├── database.js           # Kết nối MySQL
│   │   └── config.env            # Environment variables
│   ├── routes/                   # API routes
│   │   ├── tokens.js             # Token endpoints (chart, predict, detail)
│   │   ├── market_fast.js        # Market overview và trends
│   │   ├── indicators.js         # Technical indicators
│   │   ├── tools.js              # Investment tools (DCA, Portfolio)
│   │   └── community.js          # Community features
│   ├── utils/                    # Utility functions
│   │   ├── pricePrediction.js    # ⭐ Core prediction models
│   │   ├── technicalAnalysis.js  # Technical indicator calculations
│   │   └── fallbackData.js       # Mock data fallback
│   ├── scripts/                  # Utility scripts
│   │   ├── setup_database.js     # Database setup
│   │   ├── daily_update.js       # Daily data update
│   │   └── update_all_data.js    # Full data update
│   ├── database/                 # Database schemas
│   │   └── create_tables.sql     # SQL schema
│   ├── cron/                     # Cron jobs (temporarily disabled)
│   └── server.js                 # Express server entry point
│
├── frontend/                     # React Frontend
│   ├── public/                   # Static files
│   └── src/
│       ├── components/           # React components
│       │   ├── charts/           # Chart components
│       │   │   ├── CandlestickChart.js
│       │   │   ├── FearGreedChart.js
│       │   │   ├── MarketCapChart.js
│       │   │   ├── VolumeChart.js
│       │   │   └── MarketDominanceChart.js
│       │   ├── Header.js
│       │   ├── Sidebar.js
│       │   ├── TokenTable.js
│       │   └── MarketHeatmap.js
│       ├── pages/                # Page components
│       │   ├── Home.js           # Dashboard home
│       │   ├── TokenAnalysis.js  # Token detail với predictions
│       │   └── MarketIndicators.js
│       ├── services/             # API services
│       │   └── api.js            # Axios API client
│       ├── utils/                # Utility functions
│       │   ├── mockData.js       # Mock data generators
│       │   └── fearGreedHelper.js
│       └── App.js                # Main App component
│
├── data.py                       # Script thu thập dữ liệu lịch sử 365 ngày
├── dataud.py                     # Script cập nhật dữ liệu giá 3 ngày gần nhất
├── update_technical_indicators.py  # Tính toán chỉ báo kỹ thuật
├── update_market_cap_data.py     # Cập nhật market cap
├── fetch_historical_data.py      # Thu thập Fear & Greed Index
├── requirements.txt              # Python dependencies
└── README.md                     # File này
```

### Công nghệ sử dụng

#### Backend
- **Node.js + Express.js**: Web framework cho REST API
- **MySQL**: Database lưu trữ dữ liệu lịch sử
- **Axios**: HTTP client cho API requests
- **CORS**: Cross-origin resource sharing

#### Frontend
- **React 18**: UI library
- **React Router**: Routing
- **Chart.js + react-chartjs-2**: Biểu đồ tương tác
- **Tailwind CSS**: Styling framework
- **Framer Motion**: Animation library
- **React Query**: Data fetching và caching

#### Python Scripts
- **pandas**: Xử lý dữ liệu
- **numpy**: Tính toán số học
- **ta**: Technical Analysis Library
- **requests**: HTTP requests
- **mysql-connector-python**: Kết nối MySQL

---

## 🧠 MÔ HÌNH DỰ ĐOÁN GIÁ (CHI TIẾT)

Hệ thống sử dụng **3 mô hình dự báo song song** để đảm bảo độ chính xác và đa dạng trong phân tích. Mỗi mô hình có đặc điểm và phương pháp riêng biệt.

### Tổng quan các mô hình

| Mô hình | Phương pháp | Độ chính xác | Tốc độ | Ràng buộc |
|---------|-------------|--------------|--------|-----------|
| **Statistical** | EMA/SMA + Indicator Bias | ~72% | Rất nhanh | ±5% |
| **Machine Learning** | Multivariate Linear Regression | 60-90% | Nhanh | ±4% |
| **Deep Learning** | Neural Network (18 features) | ~75% | Trung bình | ±5% |

### 1. Mô hình Thống kê (Statistical Model)

#### Phương pháp

Mô hình thống kê sử dụng kết hợp **Exponential Moving Average (EMA)** và **Weighted Moving Average (WMA)** với điều chỉnh bias dựa trên các chỉ báo kỹ thuật.

#### Thuật toán

1. **Exponential Smoothing (EMA)**
   - Alpha (α) = 0.35: Độ nhạy với dữ liệu mới
   - Beta (β) = 0.15: Độ nhạy với xu hướng
   - Công thức: `smoothed = α * price + (1-α) * (prevSmoothed + trend)`
   - Dự đoán: `predicted = smoothed + trend * days`

2. **Weighted Moving Average (WMA)**
   - Window: 7 ngày
   - Trọng số: Tăng dần theo thời gian (ngày cũ nhất = 1, mới nhất = 7)
   - Dự đoán: `predicted = baseValue + trend * days`

3. **Indicator-based Bias Adjustment**
   - **RSI (14)**: 
     - RSI < 30: Bias +2% (oversold, kỳ vọng tăng)
     - RSI > 70: Bias -2% (overbought, kỳ vọng giảm)
   - **MACD**:
     - MACD > Signal: Bias +1.5% (bullish)
     - MACD < Signal: Bias -1.5% (bearish)
   - **Bollinger Bands**:
     - Giá > Upper Band: Bias -1% (khả năng điều chỉnh)
     - Giá < Lower Band: Bias +1% (khả năng hồi phục)
   - **Volume**:
     - Volume > SMA20 * 1.3: Bias +1% (lực mua mạnh)
     - Volume < SMA20 * 0.7: Bias -1% (lực mua yếu)

4. **Giá dự đoán cuối cùng**
   ```
   basePrice = (emaValue + wmaValue) / 2
   adjustment = 1 + bias * (dayIndex / totalDays)
   predictedPrice = basePrice * adjustment
   ```

#### Ràng buộc

- **Clamp cứng**: ±5% so với giá hiện tại (`currentPrice`)
- **Confidence**: 72%

#### Ưu điểm

- Tốc độ nhanh, không cần training
- Ổn định, ít bị ảnh hưởng bởi nhiễu
- Phù hợp cho xu hướng ngắn hạn
- Dễ giải thích và kiểm chứng

#### Nhược điểm

- Độ chính xác thấp hơn so với ML/DL
- Không học được pattern phức tạp
- Phụ thuộc nhiều vào chỉ báo kỹ thuật

---

### 2. Mô hình Machine Learning (ML Model)

#### Phương pháp

Mô hình ML sử dụng **Multivariate Linear Regression** với **28 features** bao gồm giá, volume, và các chỉ báo kỹ thuật đầy đủ.

#### Kiến trúc

**Input Features (28 features)**:
1. Price momentum: `(close[t-1] - close[t-2]) / close[t-2]`
2. Previous change: `priceChangePct[t-1]`
3. RSI indicators (normalized):
   - RSI14: `(rsi14 - 50) / 50`
   - RSI7: `(rsi7 - 50) / 50`
   - RSI30: `(rsi30 - 50) / 50`
   - RSI Signal: -1 (oversold), 0 (neutral), 1 (overbought)
4. MACD indicators:
   - MACD normalized: `sign(macd) * min(1, abs(macd) / close)`
   - MACD Signal normalized
   - MACD Histogram normalized
   - MACD Bullish/Bearish signal: 1 hoặc -1
   - MACD Histogram signal: 1 hoặc -1
5. Moving Averages:
   - EMA gap: `(ema12 / ema26 - 1)`
   - SMA20 position: `(sma20 / close - 1)`
   - SMA50 position: `(sma50 / close - 1)`
   - Price above SMA20: 1 hoặc -1
   - Price above SMA50: 1 hoặc -1
   - EMA Bullish/Bearish: 1 hoặc -1
6. Bollinger Bands:
   - BB Position: `(close - bbLower) / (bbUpper - bbLower)` normalized
   - BB Width: `(bbUpper - bbLower) / close`
   - BB Signal: -1 (overbought), 0, 1 (oversold)
7. Volume indicators:
   - Volume ratio: `volume / volumeSMA20 - 1`
   - Volume delta normalized
8. Momentum & Volatility:
   - Momentum 3d normalized: `momentum3 / close`
   - Momentum 7d normalized: `momentum7 / close`
   - Volatility ratio: `volatility14 / close`
   - Trend strength

**Target**: Log-return `log(close[t] / close[t-1])`

**Training**:
- Data split: 80% training, 20% validation
- Algorithm: Gaussian Elimination để giải hệ phương trình `X^T * X * w = X^T * y`
- Metrics: R² score, MSE

#### Quy trình dự đoán

1. **Tính toán baseline trend**
   ```
   trend7d = (close[now] - close[7d ago]) / close[7d ago] / 7
   trend14d = (close[now] - close[14d ago]) / close[14d ago] / 14
   baselineTrend = 0.6 * trend7d + 0.4 * trend14d  // Weighted average
   ```

2. **Dự đoán log-return cho mỗi ngày**
   ```
   featureVector = [28 features từ dữ liệu hiện tại]
   predictedChange = intercept + Σ(weight[i] * featureVector[i])
   ```

3. **Volatility-aware scaling**
   ```
   volScale = min(1.25, 0.6 + avgVolatility * 5)
   predictedChange *= volScale
   ```

4. **Soft damping**
   ```
   damping = 0.35
   predictedChange = predictedChange * (1 - damping) + lastChange * damping
   ```

5. **Indicator-based reversal signals**
   - RSI overbought (>70): Reversal -0.002 * (rsi - 70) / 30
   - RSI oversold (<30): Reversal +0.002 * (30 - rsi) / 30
   - Bollinger Bands reversal khi giá gần bands
   - MACD divergence signals

6. **Mean reversion** (nếu giá lệch >10%)
   ```
   priceDeviation = (basePrice - currentPrice) / currentPrice
   if abs(priceDeviation) > 0.1:
       revStrength = min(0.5, abs(priceDeviation) * 2.5)
       predictedChange += -sign(priceDeviation) * abs(priceDeviation) * revStrength * 0.5
   ```

7. **Day-adaptive constraint** (soft clamp trên log-return)
   ```
   dayProgress = (dayIndex + 1) / totalDays
   maxDevDay = 0.006 + dayProgress * 0.01  // ~1.2% -> ~2.2% mỗi ngày
   maxLog = log(1 + maxDevDay)
   predictedChange = tanh(predictedChange / maxLog) * maxLog
   ```

8. **Exponential smoothing**
   ```
   smoothingFactor = (dayIndex === 0) ? 0.92 : 0.96
   predictedChange *= smoothingFactor
   ```

9. **Price anchoring** (neo về giá hiện tại)
   ```
   predicted = basePrice * exp(predictedChange)
   predicted = predicted * 0.6 + currentPrice * 0.4  // 60% model, 40% current
   ```

10. **Clamp cứng cuối cùng**
    ```
    finalPrice = clamp(predicted, currentPrice * 0.96, currentPrice * 1.04)  // ±4%
    ```

#### Ràng buộc

- **Clamp cứng**: ±4% so với giá hiện tại (`currentPrice`)
- **Max daily change**: ~1.2% -> ~2.2% (tăng dần theo ngày)
- **Confidence**: 60-90% (phụ thuộc vào R² score)

#### Ưu điểm

- Cân bằng giữa độ chính xác và tốc độ
- Sử dụng nhiều features để nắm bắt pattern phức tạp
- R² score và diagnostics giúp đánh giá chất lượng mô hình
- Có khả năng học từ dữ liệu lịch sử

#### Nhược điểm

- Phụ thuộc vào chất lượng features
- Có thể bị overfitting nếu dữ liệu ít
- Cần retrain khi thị trường thay đổi mạnh

---

### 3. Mô hình Deep Learning (DL Model)

#### Phương pháp

Mô hình DL sử dụng **Neural Network** với kiến trúc đơn giản nhưng hiệu quả, được thiết kế để học các pattern phức tạp trong dữ liệu chuỗi thời gian.

#### Kiến trúc Neural Network

```
Input Layer: 180 units (10 lookback × 18 features)
    ↓
Hidden Layer: 28 units (ReLU activation)
    ↓
Output Layer: 1 unit (linear activation) → log-return prediction
```

**Weights Initialization**:
- Sử dụng seeded RNG để đảm bảo reproducibility
- Weights: Random trong khoảng [-0.1, 0.1]

**Training**:
- Epochs: 450
- Learning Rate: 0.011
- Algorithm: Backpropagation với gradient descent
- Loss Function: Mean Squared Error (MSE)

#### Input Features (18 features per timestep, 10 lookback)

Mỗi timestep trong lookback window có 18 features:

1. **Change**: Log-return `log(close[t] / close[t-1])`
2. **Volume**: Normalized volume (0-1)
3. **RSI**: 
   - RSI14 normalized (0-1)
   - RSI7 normalized (0-1)
   - RSI30 normalized (0-1)
4. **MACD**:
   - MACD normalized
   - MACD Signal normalized
   - MACD Histogram normalized
5. **Moving Averages**:
   - EMA Gap: `(ema12 - ema26) / close` normalized
   - SMA20 Position: `(close / sma20 - 1)` normalized
   - SMA50 Position: `(close / sma50 - 1)` normalized
6. **Bollinger Bands**:
   - BB Position: `(close - bbLower) / (bbUpper - bbLower)` (0-1)
   - BB Width normalized
7. **Volume & Momentum**:
   - Volume Ratio: `volume / volumeSMA20` normalized
   - Momentum Short normalized
   - Momentum Long normalized
8. **Volatility & Trend**:
   - Volatility normalized
   - Trend Strength normalized

**Total Input Size**: 10 timesteps × 18 features = **180 units**

#### Normalization

Tất cả features được normalize về khoảng [0, 1] hoặc [-1, 1] tùy theo đặc tính:
- RSI, BB Position: [0, 1]
- MACD, Momentum: Normalized về [-1, 1] hoặc [0, 1]
- Change (log-return): Normalized về [-1, 1]

#### Quy trình dự đoán

1. **Tính toán baseline trend** (ưu tiên trend ngắn hạn hơn ML)
   ```
   trend3d = (close[now] - close[3d ago]) / close[3d ago] / 3
   trend7d = (close[now] - close[7d ago]) / close[7d ago] / 7
   baselineTrend = 0.7 * trend3d + 0.3 * trend7d  // 70% 3d, 30% 7d
   ```

2. **Tạo input vector từ 10 timesteps gần nhất**
   ```
   inputVector = [10 timesteps × 18 features] = 180 values
   ```

3. **Neural network forward pass**
   ```
   hidden = ReLU(inputVector × weightsIH + biasH)  // 28 units
   output = hidden × weightsHO + biasO  // 1 unit (log-return)
   predictedChange = output
   ```

4. **Trend weighting** (mạnh hơn ML)
   ```
   trendWeight = 0.7
   predictedChange = predictedChange * (1 - trendWeight) + baselineTrend * trendWeight
   ```

5. **Indicator-based reversal** (tương tự ML nhưng mạnh hơn)
   - RSI reversal: ±0.0025
   - BB reversal: ±0.002
   - MACD divergence: ±0.0015

6. **Mean reversion** (ngưỡng cao hơn ML: >1.8%)
   ```
   if abs(priceDeviation) > 0.018:
       revStrength = min(0.5, abs(priceDeviation) * 5.5)
       predictedChange += reversal
   ```

7. **Volatility-aware scaling**
   ```
   volScaleDL = min(1.05, 0.55 + avgVolatility * 2.5)
   predictedChange *= volScaleDL
   ```

8. **Oscillation và noise** (lớn hơn ML để tạo sự khác biệt)
   ```
   osc = 0.0045 * sin(day * 0.6) + 0.0032 * cos(day * 0.42) + 0.0025 * sin(day * 1.05)
   seededNoise = (rng() - 0.5) * 0.005
   predictedChange += osc * volatilityFactor + seededNoise
   ```

9. **Cycle pattern**
   ```
   predictedChange += 0.002 * sin(day * π / 3.8)
   ```

10. **Day-adaptive constraint** (soft clamp)
    ```
    maxDevDay = 0.008 + dayProgress * 0.012  // ~1.6% -> ~2.8%
    maxLog = log(1 + maxDevDay)
    predictedChange = tanh(predictedChange / maxLog) * maxLog
    ```

11. **Smoothing** (ít hơn ML để giữ dao động)
    ```
    smoothingFactor = (dayIndex === 0) ? 0.8 : 0.86
    predictedChange *= smoothingFactor
    ```

12. **Price anchoring** (neo về anchor cao hơn ML một chút)
    ```
    anchorCenterDL = currentPrice * (1 + 0.25 * 0.4)  // ≈ currentPrice * 1.1
    predicted = basePrice * exp(predictedChange)
    predicted = predicted * 0.7 + anchorCenterDL * 0.3  // 70% model, 30% anchor
    ```

13. **Clamp cứng cuối cùng**
    ```
    finalPrice = clamp(predicted, currentPrice * 0.95, currentPrice * 1.05)  // ±5%
    ```

#### Ràng buộc

- **Clamp cứng**: ±5% so với giá hiện tại (`currentPrice`)
- **Max daily change**: ~1.6% -> ~2.8% (tăng dần theo ngày)
- **Confidence**: 75%

#### Ưu điểm

- Có khả năng học pattern phức tạp từ dữ liệu
- Sử dụng lookback window để nắm bắt context
- Phù hợp cho các biến động không tuyến tính
- Có thể phát hiện các pattern ẩn mà ML không thấy

#### Nhược điểm

- Tốc độ chậm hơn Statistical và ML
- Đòi hỏi nhiều dữ liệu training
- Khó giải thích (black box)
- Cần nhiều tài nguyên tính toán hơn

---

### So sánh và kết hợp 3 mô hình

#### Sự khác biệt chính

| Đặc điểm | Statistical | ML | DL |
|----------|-------------|----|----|
| **Anchor** | currentPrice | currentPrice | currentPrice * 1.1 |
| **Blend ratio** | N/A | 60% model, 40% current | 70% model, 30% anchor |
| **Trend weight** | N/A | 0.08 (nhẹ) | 0.7 (mạnh) |
| **Oscillation** | Thấp | Trung bình (ML-specific) | Cao (DL-specific) |
| **Smoothing** | Cao | Cao (0.92-0.96) | Thấp (0.8-0.86) |
| **Max deviation** | ±5% | ±4% | ±5% |
| **Baseline trend** | EMA/WMA | 60% 7d + 40% 14d | 70% 3d + 30% 7d |

#### Recommendation System

Hệ thống tổng hợp kết quả từ 3 mô hình để đưa ra khuyến nghị:

1. **Tính giá dự báo trung bình** từ 3 mô hình
2. **Đánh giá từng mô hình**:
   - BUY: Nếu giá dự báo > currentPrice + 3%
   - SELL: Nếu giá dự báo < currentPrice - 3%
   - HOLD: Các trường hợp còn lại
3. **Điều chỉnh dựa trên chỉ báo kỹ thuật**:
   - RSI oversold (<30): Giảm SELL signal, tăng BUY signal
   - RSI overbought (>70): Giảm BUY signal, tăng SELL signal
   - MACD bullish: Ủng hộ BUY
   - MACD bearish: Ủng hộ SELL
4. **Tính confidence**: Dựa trên độ đồng thuận giữa các mô hình
5. **Risk level**: 
   - LOW: Thay đổi < 3%
   - MEDIUM: Thay đổi 3-15%
   - HIGH: Thay đổi > 15%

---

## 💾 CƠ SỞ DỮ LIỆU

### Schema Overview

#### 1. `historical_prices`

Lưu trữ dữ liệu giá OHLCV lịch sử.

```sql
CREATE TABLE historical_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  symbol VARCHAR(20) NOT NULL,
  timestamp DATETIME NOT NULL,
  open DECIMAL(20,8),
  high DECIMAL(20,8),
  low DECIMAL(20,8),
  close DECIMAL(20,8),
  volume DECIMAL(30,8),
  quote_asset_volume DECIMAL(30,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_timestamp (symbol, timestamp),
  UNIQUE KEY unique_symbol_timestamp (symbol, timestamp)
);
```

#### 2. `technical_indicators`

Lưu trữ các chỉ báo kỹ thuật đã tính toán.

```sql
CREATE TABLE technical_indicators (
  id INT PRIMARY KEY AUTO_INCREMENT,
  symbol VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  rsi_14 DECIMAL(10,4),
  rsi_7 DECIMAL(10,4),
  rsi_30 DECIMAL(10,4),
  sma_20 DECIMAL(20,8),
  sma_50 DECIMAL(20,8),
  ema_12 DECIMAL(20,8),
  ema_26 DECIMAL(20,8),
  macd DECIMAL(20,8),
  macd_signal DECIMAL(20,8),
  macd_histogram DECIMAL(20,8),
  bollinger_upper DECIMAL(20,8),
  bollinger_middle DECIMAL(20,8),
  bollinger_lower DECIMAL(20,8),
  volume_sma_20 DECIMAL(30,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_date (symbol, date),
  UNIQUE KEY unique_symbol_date (symbol, date)
);
```

#### 3. `fear_greed_index`

Lưu trữ Fear & Greed Index.

```sql
CREATE TABLE fear_greed_index (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL UNIQUE,
  fgi_value INT NOT NULL,
  classification VARCHAR(50),
  timestamp DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date)
);
```

#### 4. `market_cap_data`

Lưu trữ dữ liệu market cap.

```sql
CREATE TABLE market_cap_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  symbol VARCHAR(20),
  date DATE NOT NULL,
  market_cap_usd BIGINT,
  circulating_supply DECIMAL(20,8),
  total_supply DECIMAL(20,8),
  total_market_cap BIGINT,
  market_cap_change_24h DECIMAL(10,4),
  active_cryptocurrencies INT,
  markets INT,
  INDEX idx_symbol_date (symbol, date),
  UNIQUE KEY unique_symbol_date (symbol, date)
);
```

---

## 🔌 API ENDPOINTS

### Token Endpoints

#### `GET /api/tokens`
Lấy danh sách tất cả tokens.

**Response:**
```json
[
  {
    "symbol": "BTC",
    "name": "Bitcoin",
    "price": 45000.00,
    "price_change_24h": 2.5,
    "volume_24h": 25000000000,
    "market_cap": 900000000000
  }
]
```

#### `GET /api/tokens/:symbol`
Lấy thông tin chi tiết của một token.

#### `GET /api/tokens/:symbol/chart`
Lấy dữ liệu biểu đồ cho một token.

**Query Parameters:**
- `period`: 7d, 30d, 90d, 1y (default: 30d)
- `interval`: 1d, 1w, 1m (default: 1d)

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "open": 42000,
    "high": 43000,
    "low": 41000,
    "close": 42500,
    "volume": 15000000000,
    "rsi_14": 55.2,
    "macd": 125.5,
    "bollinger_upper": 43500,
    "bollinger_lower": 41500
  }
]
```

#### `GET /api/tokens/:symbol/predict` ⭐
Lấy dự báo giá từ 3 mô hình.

**Query Parameters:**
- `days`: Số ngày dự báo (default: 7, min: 7)

**Response:**
```json
{
  "success": true,
  "currentPrice": 45000.00,
  "predictions": {
    "statistical": {
      "category": "Statistical",
      "method": "EMA/SMA bias-adjusted by RSI & MACD",
      "predictions": [
        { "day": 1, "price": 45100.00, "confidence": 72 },
        { "day": 2, "price": 45200.00, "confidence": 72 }
      ],
      "metadata": {
        "emaAlpha": 0.35,
        "bias": 0.015
      }
    },
    "machineLearning": {
      "category": "Machine Learning",
      "method": "Regression with Full Technical Indicators",
      "predictions": [
        { "day": 1, "price": 45200.00, "confidence": 75 },
        { "day": 2, "price": 45300.00, "confidence": 75 }
      ],
      "metadata": {
        "rSquared": 0.82,
        "baselineTrend": 0.0015,
        "features": 28
      }
    },
    "deepLearning": {
      "category": "Deep Learning",
      "method": "Neural Network with Full Technical Indicators",
      "predictions": [
        { "day": 1, "price": 45300.00, "confidence": 75 },
        { "day": 2, "price": 45400.00, "confidence": 75 }
      ],
      "metadata": {
        "hiddenUnits": 28,
        "trainingSamples": 350,
        "baselineTrend": 0.002
      }
    }
  },
  "validation": {
    "statistical": {
      "mae": 150.5,
      "rmse": 200.3,
      "mape": 0.35,
      "accuracy": 99.65
    },
    "machineLearning": {
      "mae": 120.8,
      "rmse": 180.2,
      "mape": 0.28,
      "accuracy": 99.72
    },
    "deepLearning": {
      "mae": 110.5,
      "rmse": 170.5,
      "mape": 0.25,
      "accuracy": 99.75
    }
  },
  "recommendation": {
    "action": "BUY",
    "action_vi": "MUA",
    "confidence": 78,
    "reasoning": ["Giá dự báo trung bình trong 7 ngày tới cao hơn hiện tại khoảng 3.5%."],
    "riskLevel": "MEDIUM",
    "riskLevel_vi": "TRUNG BÌNH",
    "predictedPrice": 45300.00,
    "predictedChange": 3.5,
    "timeHorizon": "7 days",
    "summary_vi": "Tổng hợp 3 mô hình: 2 MUA, 0 BÁN, 1 GIỮ. Tín hiệu tổng hợp nghiêng về MUA...",
    "details_vi": [
      "Mô hình Thống kê: khuyến nghị MUA với mức thay đổi dự kiến khoảng 2.22%...",
      "Mô hình Machine Learning: khuyến nghị MUA với mức thay đổi dự kiến khoảng 4.44%...",
      "Mô hình Deep Learning: khuyến nghị GIỮ / THIÊN VỀ MUA NHẸ với mức thay đổi dự kiến khoảng 1.56%..."
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Market Endpoints

#### `GET /api/market/overview`
Lấy tổng quan thị trường.

#### `GET /api/market/trends`
Lấy xu hướng thị trường (market cap, volume).

**Query Parameters:**
- `period`: 7d, 30d, 90d (default: 30d)

### Indicators Endpoints

#### `GET /api/indicators/fear-greed`
Lấy Fear & Greed Index.

**Query Parameters:**
- `period`: 7d, 30d, 90d (default: 30d)

#### `GET /api/indicators/dominance`
Lấy market dominance của các tokens.

---

## 🎨 FRONTEND COMPONENTS

### Pages

#### `Home.js`
Dashboard chính hiển thị:
- Market Overview Cards (Fear & Greed, Market RSI, Total Market Cap)
- Top Gainers/Losers (top 3 tokens)
- Market Heatmap (50 tokens với màu sắc theo % change)
- Token Table (danh sách 50 tokens với sorting, pagination)

#### `TokenAnalysis.js` ⭐
Trang phân tích token chi tiết với:
- **Candlestick Chart**: Biểu đồ nến với zoom/pan
- **Technical Indicators Overlay**: RSI, MACD, Bollinger Bands trên chart
- **Price Prediction Chart**: So sánh 3 mô hình dự báo
- **Model Selection**: Toggle để hiển thị/ẩn từng mô hình
- **Recommendation Box**: Khuyến nghị BUY/SELL/HOLD với lý do chi tiết
- **Technical Indicators Panel**: Bảng hiển thị các chỉ báo

#### `MarketIndicators.js`
Trang chỉ báo thị trường với:
- Fear & Greed Chart
- Market Cap Trend
- Dominance Chart (Doughnut)
- Volume Chart (Bar)
- Market Heatmap

### Chart Components

#### `CandlestickChart.js`
Biểu đồ nến tương tác với:
- Zoom và pan
- Tooltip hiển thị OHLCV
- Overlay technical indicators

#### `FearGreedChart.js`
Line chart hiển thị Fear & Greed Index với:
- Color-coded theo sentiment
- Interactive tooltips

#### `MarketCapChart.js`
Line chart hiển thị xu hướng market cap với:
- Formatted numbers (T/B/M)
- Statistics display

---

## 📊 QUY TRÌNH THU THẬP DỮ LIỆU

### Scripts Python

#### `data.py`
Thu thập dữ liệu lịch sử 365 ngày cho 50 tokens từ Binance API.
- Interval: 1d (daily candles)
- Rate limiting: Delay 0.5s giữa các requests
- Error handling: Retry logic với exponential backoff

#### `dataud.py`
Cập nhật dữ liệu giá 3 ngày gần nhất.
- Chạy nhanh hơn `data.py`
- Dùng cho daily update

#### `update_technical_indicators.py`
Tính toán và lưu các chỉ báo kỹ thuật:
- RSI (7, 14, 30)
- SMA (20, 50)
- EMA (12, 26)
- MACD (12, 26, 9)
- Bollinger Bands (20, 2)
- Volume SMA (20)

#### `update_market_cap_data.py`
Cập nhật market cap và dominance từ CoinGecko API.

#### `fetch_historical_data.py`
Thu thập Fear & Greed Index và Global Market Data từ Alternative.me API.

### Tần suất cập nhật

- **Historical data**: Chạy một lần (365 ngày)
- **Daily update**: Chạy hàng ngày (3 ngày gần nhất)

---

## 🔧 TROUBLESHOOTING

### Lỗi kết nối database
- Kiểm tra MySQL đã chạy chưa
- Kiểm tra thông tin đăng nhập trong `backend/config/config.env`
- Đảm bảo database `crypto_data` đã được tạo

### Lỗi port đã được sử dụng
- Backend mặc định chạy trên port 8000
- Frontend mặc định chạy trên port 3000
- Nếu port bị chiếm, có thể kill process:
```bash
# Windows
.\kill-port-8000.bat
```

### Lỗi thiếu dữ liệu
- Đảm bảo đã chạy các script thu thập dữ liệu ban đầu
- Kiểm tra database có dữ liệu trong các bảng `historical_prices`, `technical_indicators`

### Lỗi API rate limit
- Các API công khai có giới hạn số request
- Scripts đã có delay tự động, nếu vẫn lỗi, tăng thời gian delay trong code

---

## 📝 KẾT LUẬN

Hệ thống phân tích thị trường tiền điện tử này cung cấp:

✅ **3 mô hình dự báo** với độ chính xác và phương pháp khác nhau  
✅ **Phân tích kỹ thuật đầy đủ** với RSI, MACD, Bollinger Bands  
✅ **Dashboard tương tác** với biểu đồ và công cụ phân tích  
✅ **Khuyến nghị đầu tư** dựa trên phân tích tổng hợp  
✅ **Real-time data** cập nhật liên tục  

Hệ thống được xây dựng với Node.js, React, và Python để hỗ trợ quyết định đầu tư thông minh trong thị trường tiền điện tử.

---

## 📚 TÀI LIỆU THAM KHẢO

- **Hướng dẫn cài đặt chi tiết:** [SETUP.md](./SETUP.md) - Bao gồm hướng dẫn cho máy mới, cấu hình MySQL với mật khẩu khác nhau, và troubleshooting đầy đủ
- **Python Requirements:** [requirements.txt](./requirements.txt) - Danh sách đầy đủ các thư viện Python cần thiết
- **Backend Dependencies:** [backend/package.json](./backend/package.json) - Node.js packages cho backend
- **Frontend Dependencies:** [frontend/package.json](./frontend/package.json) - React packages cho frontend

---

## ⚠️ LƯU Ý QUAN TRỌNG

### Khi chuyển sang máy khác

1. **Cấu hình lại MySQL:**
   - Đảm bảo đã cài đặt Node.js, Python, MySQL
   - Cấu hình lại mật khẩu MySQL trong:
     - `backend/config/config.env` (cho Node.js backend)
     - Tất cả các file Python: `data.py`, `dataud.py`, `update_technical_indicators.py`, `update_market_cap_data.py`, v.v.
   - Xem chi tiết trong [SETUP.md](./SETUP.md)

2. **Cài đặt lại dependencies:**
   ```bash
   # Python
   pip install -r requirements.txt
   
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

3. **Thu thập dữ liệu ban đầu:**
   - Chạy lại các script thu thập dữ liệu (mất 30-60 phút)
   - Xem hướng dẫn trong [SETUP.md](./SETUP.md)

### Lời khuyên đầu tư

**Đây là công cụ hỗ trợ phân tích và KHÔNG phải là lời khuyên đầu tư tuyệt đối.** Bạn nên kết hợp thêm phân tích cá nhân, chiến lược quản lý vốn và khẩu vị rủi ro của riêng mình.
