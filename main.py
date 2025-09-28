from flask import Flask, jsonify, request, render_template_string
from flask_cors import CORS 
import mysql.connector
from mysql.connector import Error
import pandas as pd
from datetime import datetime, timedelta
import json

app = Flask(__name__)
CORS(app)  # Cho phép CORS

# Cấu hình kết nối MySQL
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '23082004',
    'database': 'crypto_data'
}

def get_db_connection():
    """Tạo kết nối database"""
    try:
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        return connection
    except Error as e:
        return jsonify({"error": f"Database connection error: {e}"}), 500

@app.route("/")
def serve_frontend():
    """Serve simple HTML frontend"""
    return render_template_string(HTML_TEMPLATE)

@app.route("/api/market-data")
def get_market_data():
    """Lấy dữ liệu thị trường với thông tin token"""
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Query để lấy dữ liệu mới nhất của mỗi token với thông tin token
        query = """
        SELECT 
            ti.symbol,
            ti.name,
            ti.icon_url,
            hp.close as price,
            hp.volume,
            hp.quote_asset_volume,
            hp.timestamp
        FROM token_info ti
        LEFT JOIN (
            SELECT symbol, close, volume, quote_asset_volume, timestamp,
                   ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
            FROM historical_prices
        ) hp ON ti.symbol = hp.symbol AND hp.rn = 1
        WHERE hp.close IS NOT NULL
        ORDER BY hp.quote_asset_volume DESC
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        # Tính phần trăm thay đổi 1 ngày và 7 ngày
        market_data = []
        for row in results:
            symbol = row['symbol']
            
            # Lấy giá 1 ngày trước
            cursor.execute("""
                SELECT close FROM historical_prices 
                WHERE symbol = %s AND timestamp = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                ORDER BY timestamp DESC LIMIT 1
            """, (symbol,))
            price_1d_ago = cursor.fetchone()
            
            # Lấy giá 7 ngày trước
            cursor.execute("""
                SELECT close FROM historical_prices 
                WHERE symbol = %s AND timestamp = DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                ORDER BY timestamp DESC LIMIT 1
            """, (symbol,))
            price_7d_ago = cursor.fetchone()
            
            # Tính phần trăm thay đổi
            change_1d = 0.0
            change_7d = 0.0
            
            if price_1d_ago and row['price'] and price_1d_ago['close']:
                change_1d = ((row['price'] - price_1d_ago['close']) / price_1d_ago['close']) * 100
            
            if price_7d_ago and row['price'] and price_7d_ago['close']:
                change_7d = ((row['price'] - price_7d_ago['close']) / price_7d_ago['close']) * 100
            
            market_data.append({
                'symbol': row['symbol'],
                'name': row['name'],
                'icon_url': row['icon_url'],
                'price': float(row['price']) if row['price'] else 0.0,
                'change_1d': float(round(change_1d, 2)) if change_1d is not None else 0.0,
                'change_7d': float(round(change_7d, 2)) if change_7d is not None else 0.0,
                'volume_24h': float(row['volume']) if row['volume'] else 0.0,
                'quote_volume_24h': float(row['quote_asset_volume']) if row['quote_asset_volume'] else 0.0
            })
        
        return jsonify(market_data)
        
    except Error as e:
        return jsonify({"error": f"Database error: {e}"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route("/api/token/<symbol>")
def get_token_detail(symbol):
    """Lấy thông tin chi tiết của một token"""
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Lấy thông tin cơ bản của token
        cursor.execute("""
            SELECT symbol, name, icon_url FROM token_info WHERE symbol = %s
        """, (symbol,))
        token_info = cursor.fetchone()
        
        if not token_info:
            return jsonify({"error": "Token not found"}), 404
        
        # Lấy dữ liệu giá 30 ngày gần nhất
        cursor.execute("""
            SELECT timestamp, open, high, low, close, volume, quote_asset_volume
            FROM historical_prices 
            WHERE symbol = %s 
            ORDER BY timestamp DESC 
            LIMIT 30
        """, (symbol,))
        price_data = cursor.fetchall()
        
        # Lấy thống kê
        cursor.execute("""
            SELECT 
                MAX(high) as all_time_high,
                MIN(low) as all_time_low,
                AVG(volume) as avg_volume,
                COUNT(*) as total_days
            FROM historical_prices 
            WHERE symbol = %s
        """, (symbol,))
        stats = cursor.fetchone()
        
        # Tính các chỉ số
        current_price = price_data[0]['close'] if price_data else 0
        price_1d_ago = price_data[1]['close'] if len(price_data) > 1 else current_price
        price_7d_ago = price_data[7]['close'] if len(price_data) > 7 else current_price
        price_30d_ago = price_data[29]['close'] if len(price_data) > 29 else current_price
        
        change_1d = ((current_price - price_1d_ago) / price_1d_ago * 100) if price_1d_ago else 0
        change_7d = ((current_price - price_7d_ago) / price_7d_ago * 100) if price_7d_ago else 0
        change_30d = ((current_price - price_30d_ago) / price_30d_ago * 100) if price_30d_ago else 0
        
        return {
            'token_info': token_info,
            'current_price': float(current_price),
            'changes': {
                '1d': round(change_1d, 2),
                '7d': round(change_7d, 2),
                '30d': round(change_30d, 2)
            },
            'stats': {
                'all_time_high': float(stats['all_time_high']) if stats['all_time_high'] else 0,
                'all_time_low': float(stats['all_time_low']) if stats['all_time_low'] else 0,
                'avg_volume': float(stats['avg_volume']) if stats['avg_volume'] else 0,
                'total_days': stats['total_days'] or 0
            },
            'price_data': [
                {
                    'date': row['timestamp'],
                    'open': float(row['open']),
                    'high': float(row['high']),
                    'low': float(row['low']),
                    'close': float(row['close']),
                    'volume': float(row['volume'])
                }
                for row in reversed(price_data)  # Đảo ngược để có thứ tự thời gian tăng dần
            ]
        }
        
    except Error as e:
        return jsonify({"error": f"Database error: {e}"}), 500
    finally:
        cursor.close()
        connection.close()

@app.route("/api/token/<symbol>/chart-data")
def get_chart_data(symbol):
    """Lấy dữ liệu biểu đồ cho token"""
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Lấy period từ query parameter
        period = request.args.get('period', '30d')
        # Xác định số ngày dựa trên period
        days_map = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365
        }
        days = days_map.get(period, 30)
        
        cursor.execute("""
            SELECT timestamp, open, high, low, close, volume
            FROM historical_prices 
            WHERE symbol = %s 
            ORDER BY timestamp DESC 
            LIMIT %s
        """, (symbol, days))
        
        data = cursor.fetchall()
        
        # Đảo ngược để có thứ tự thời gian tăng dần
        chart_data = [
            {
                'date': row['timestamp'],
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': float(row['volume'])
            }
            for row in reversed(data)
        ]
        
        return jsonify(chart_data)
        
    except Error as e:
        return jsonify({"error": f"Database error: {e}"}), 500
    finally:
        cursor.close()
        connection.close()

# HTML Template cho frontend
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #0a0a0a; 
            color: #ffffff; 
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { 
            background: linear-gradient(135deg, #00d4aa 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 3rem; 
            margin-bottom: 10px; 
            font-weight: 800;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        .header p { 
            color: #9ca3af; 
            font-size: 1.1rem;
            font-weight: 500;
        }
        .table-container { 
            background-color: #111827; 
            border-radius: 12px; 
            overflow: hidden; 
            border: 1px solid #1f2937; 
        }
        table { width: 100%; border-collapse: collapse; }
        th { 
            background-color: #1f2937; 
            color: #ffffff; 
            font-weight: 600; 
            padding: 15px; 
            text-align: left; 
        }
        td { 
            padding: 15px; 
            border-bottom: 1px solid #1f2937; 
            color: #ffffff; 
        }
        tbody tr:hover { background-color: #1f2937; }
        .token-cell { display: flex; align-items: center; gap: 10px; }
        .token-icon { width: 32px; height: 32px; border-radius: 50%; }
        .token-symbol { font-weight: 600; color: #3b82f6; cursor: pointer; }
        .token-symbol:hover { color: #60a5fa; }
        .token-name { font-size: 14px; color: #9ca3af; }
        .price { font-weight: 600; }
        .change-positive { color: #10b981; }
        .change-negative { color: #ef4444; }
        .loading { text-align: center; padding: 50px; color: #9ca3af; }
        .error { text-align: center; padding: 50px; color: #ef4444; }
        .chart-container { 
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            border-radius: 16px; 
            padding: 25px; 
            margin-top: 30px; 
            border: 1px solid #374151;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            min-height: 600px;
            display: flex;
            flex-direction: column;
        }
        .chart-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px; 
            flex-wrap: wrap;
            gap: 15px;
        }
        .chart-controls { 
            display: flex; 
            gap: 15px; 
            flex-wrap: wrap;
            align-items: center;
        }
        .btn { 
            padding: 10px 20px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
            color: white; 
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .btn.active { 
            background: linear-gradient(135deg, #00d4aa 0%, #00b894 100%);
            box-shadow: 0 4px 16px rgba(0, 212, 170, 0.3);
        }
        .btn:hover { 
            background: linear-gradient(135deg, #4b5563 0%, #6b7280 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .btn.active:hover { 
            background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 212, 170, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Crypto Dashboard</h1>
            <p>Real-time cryptocurrency market data</p>
        </div>
        
        <div id="loading" class="loading">Loading market data...</div>
        <div id="error" class="error" style="display: none;"></div>
        
        <div id="market-table" style="display: none;">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>24h %</th>
                            <th>7d %</th>
                            <th>Volume (24h)</th>
                        </tr>
                    </thead>
                    <tbody id="market-tbody">
                    </tbody>
                </table>
            </div>
        </div>
        
        <div id="token-detail" style="display: none;">
            <div style="margin-bottom: 20px;">
                <button class="btn btn-secondary" onclick="showMarketTable()">← Quay lại bảng giá</button>
            </div>
            <div class="chart-container">
                <div class="chart-header">
                    <h2 id="token-title">Chi tiết Token</h2>
                    <div class="chart-controls">
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="color: #9ca3af; font-size: 14px;">Loại biểu đồ:</span>
                            <button class="btn active" onclick="setChartType('line')">Đường</button>
                            <button class="btn" onclick="setChartType('candlestick')">Nến</button>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="color: #9ca3af; font-size: 14px;">Thời gian:</span>
                            <button class="btn active" onclick="setPeriod('7d')">7 ngày</button>
                            <button class="btn" onclick="setPeriod('30d')">30 ngày</button>
                            <button class="btn" onclick="setPeriod('90d')">90 ngày</button>
                            <button class="btn" onclick="setPeriod('1y')">1 năm</button>
                        </div>
                    </div>
                </div>
                <div style="height: 500px; position: relative; width: 100%;">
                    <canvas id="priceChart" style="width: 100%; height: 100%;"></canvas>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentToken = null;
        let currentChart = null;
        let currentChartType = 'line';
        let currentPeriod = '7d';

        // Load market data
        async function loadMarketData() {
            try {
                const response = await fetch('/api/market-data');
                const data = await response.json();
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                displayMarketData(data);
            } catch (error) {
                showError('Failed to load market data: ' + error.message);
            }
        }

        function displayMarketData(data) {
            const tbody = document.getElementById('market-tbody');
            tbody.innerHTML = '';
            
            data.forEach((token, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div class="token-cell">
                            <img src="${token.icon_url}" alt="${token.symbol}" class="token-icon" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2Mzc0OEEiLz4KPC9zdmc+Cg=='">
                            <div>
                                <div class="token-symbol" onclick="showTokenDetail('${token.symbol}')">${token.symbol}</div>
                                <div class="token-name">${token.name}</div>
                            </div>
                        </div>
                    </td>
                    <td class="price">${formatPrice(token.price)}</td>
                    <td class="${(token.change_1d || 0) >= 0 ? 'change-positive' : 'change-negative'}">
                        ${(token.change_1d || 0) >= 0 ? '+' : ''}${(token.change_1d || 0).toFixed(2)}%
                    </td>
                    <td class="${(token.change_7d || 0) >= 0 ? 'change-positive' : 'change-negative'}">
                        ${(token.change_7d || 0) >= 0 ? '+' : ''}${(token.change_7d || 0).toFixed(2)}%
                    </td>
                    <td>${formatVolume(token.quote_volume_24h)}</td>
                `;
                tbody.appendChild(row);
            });
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('market-table').style.display = 'block';
        }

        async function showTokenDetail(symbol) {
            currentToken = symbol;
            document.getElementById('market-table').style.display = 'none';
            document.getElementById('token-detail').style.display = 'block';
            
            try {
                const response = await fetch(`/api/token/${symbol}`);
                const data = await response.json();
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                document.getElementById('token-title').textContent = 
                    `${data.token_info.name} (${data.token_info.symbol}) - ${formatPrice(data.current_price)}`;
                
                loadChartData();
            } catch (error) {
                showError('Failed to load token data: ' + error.message);
            }
        }

        async function loadChartData() {
            if (!currentToken) return;
            
            try {
                const response = await fetch(`/api/token/${currentToken}/chart-data?period=${currentPeriod}`);
                const data = await response.json();
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                updateChart(data);
            } catch (error) {
                showError('Failed to load chart data: ' + error.message);
            }
        }

        function updateChart(data) {
            const ctx = document.getElementById('priceChart').getContext('2d');
            const canvas = ctx.canvas;
            
            // Cleanup previous chart
            if (currentChart) {
                currentChart.destroy();
            }
            
            // Cleanup resize handler
            if (canvas._resizeHandler) {
                window.removeEventListener('resize', canvas._resizeHandler);
                canvas._resizeHandler = null;
            }
            
            if (!data || data.length === 0) {
                showError('No chart data available');
                return;
            }
            
            if (currentChartType === 'line') {
                createLineChart(ctx, data);
            } else {
                createCandlestickChart(ctx, data);
            }
        }

        function createLineChart(ctx, data) {
            const labels = data.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('vi-VN', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            });
            
            const prices = data.map(d => parseFloat(d.close) || 0);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice;
            
            currentChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Giá',
                        data: prices,
                        borderColor: '#00d4aa',
                        backgroundColor: 'rgba(0, 212, 170, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#00d4aa',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: '#00d4aa',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#00d4aa',
                            borderWidth: 2,
                            cornerRadius: 12,
                            displayColors: false,
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            callbacks: {
                                title: function(context) {
                                    const date = new Date(data[context[0].dataIndex].date);
                                    return date.toLocaleDateString('vi-VN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                },
                                label: function(context) {
                                    return '💰 Giá: ' + formatPrice(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: { 
                                color: 'rgba(255, 255, 255, 0.1)',
                                drawBorder: false
                            },
                            ticks: { 
                                color: '#9ca3af',
                                font: {
                                    size: 11,
                                    weight: '500'
                                }
                            }
                        },
                        y: {
                            display: true,
                            grid: { 
                                color: 'rgba(255, 255, 255, 0.1)',
                                drawBorder: false
                            },
                            ticks: { 
                                color: '#9ca3af',
                                font: {
                                    size: 11,
                                    weight: '500'
                                },
                                callback: function(value) {
                                    return formatPrice(value);
                                }
                            }
                        }
                    }
                }
            });
        }

        function createCandlestickChart(ctx, data) {
            // Vẽ biểu đồ nến bằng Canvas thủ công
            const canvas = ctx.canvas;
            const container = canvas.parentElement;
            
            // Đặt kích thước canvas phù hợp với container
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            
            const width = canvas.width;
            const height = canvas.height;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            if (data.length === 0) return;
            
            // Tính toán giá trị min/max
            const allValues = data.flatMap(d => [d.open, d.high, d.low, d.close]);
            const minPrice = Math.min(...allValues);
            const maxPrice = Math.max(...allValues);
            const priceRange = maxPrice - minPrice;
            
            // Kích thước và khoảng cách
            const padding = 60;
            const chartWidth = width - 2 * padding;
            const chartHeight = height - 2 * padding;
            const candleWidth = Math.max(6, Math.min(20, chartWidth / data.length * 0.7));
            const candleSpacing = chartWidth / data.length;
            
            // Vẽ grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            
            // Vẽ grid ngang
            for (let i = 0; i <= 5; i++) {
                const y = padding + (chartHeight / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }
            
            // Vẽ grid dọc
            for (let i = 0; i <= 10; i++) {
                const x = padding + (chartWidth / 10) * i;
                ctx.beginPath();
                ctx.moveTo(x, padding);
                ctx.lineTo(x, height - padding);
                ctx.stroke();
            }
            
            // Vẽ nến
            data.forEach((d, index) => {
                const open = parseFloat(d.open) || 0;
                const high = parseFloat(d.high) || 0;
                const low = parseFloat(d.low) || 0;
                const close = parseFloat(d.close) || 0;
                
                const isGreen = close >= open;
                const color = isGreen ? '#00d4aa' : '#ff6b6b';
                
                const x = padding + index * candleSpacing + candleSpacing / 2;
                
                // Vẽ wick (bấc nến)
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, padding + chartHeight - ((high - minPrice) / priceRange) * chartHeight);
                ctx.lineTo(x, padding + chartHeight - ((low - minPrice) / priceRange) * chartHeight);
                ctx.stroke();
                
                // Vẽ body (thân nến)
                const openY = padding + chartHeight - ((open - minPrice) / priceRange) * chartHeight;
                const closeY = padding + chartHeight - ((close - minPrice) / priceRange) * chartHeight;
                
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.abs(closeY - openY);
                
                if (bodyHeight < 1) {
                    // Doji - nến có giá mở = giá đóng
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x - candleWidth/2, openY);
                    ctx.lineTo(x + candleWidth/2, openY);
                    ctx.stroke();
                } else {
                    // Nến bình thường
                    ctx.fillStyle = isGreen ? 'rgba(0, 212, 170, 0.8)' : 'rgba(255, 107, 107, 0.8)';
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    
                    ctx.fillRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
                    ctx.strokeRect(x - candleWidth/2, bodyTop, candleWidth, bodyHeight);
                }
            });
            
            // Vẽ labels trục Y
            ctx.fillStyle = '#9ca3af';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 5; i++) {
                const price = minPrice + (priceRange / 5) * (5 - i);
                const y = padding + (chartHeight / 5) * i + 5;
                ctx.fillText(formatPrice(price), padding - 15, y);
            }
            
            // Vẽ labels trục X
            ctx.textAlign = 'center';
            ctx.font = 'bold 12px Arial';
            const step = Math.max(1, Math.floor(data.length / 8));
            for (let i = 0; i < data.length; i += step) {
                const date = new Date(data[i].date);
                const label = date.toLocaleDateString('vi-VN', { 
                    month: 'short', 
                    day: 'numeric' 
                });
                const x = padding + i * candleSpacing + candleSpacing / 2;
                ctx.fillText(label, x, height - 15);
            }
            
            // Tạo tooltip đơn giản
            canvas.addEventListener('mousemove', function(e) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const index = Math.floor((x - padding) / candleSpacing);
                if (index >= 0 && index < data.length) {
                    const d = data[index];
                    const open = parseFloat(d.open) || 0;
                    const high = parseFloat(d.high) || 0;
                    const low = parseFloat(d.low) || 0;
                    const close = parseFloat(d.close) || 0;
                    
                    // Hiển thị tooltip
                    showCandlestickTooltip(e.clientX, e.clientY, d, open, high, low, close);
                }
            });
            
            // Resize handler
            const resizeHandler = () => {
                if (currentChartType === 'candlestick') {
                    createCandlestickChart(ctx, data);
                }
            };
            
            window.addEventListener('resize', resizeHandler);
            
            // Cleanup khi chuyển sang biểu đồ khác
            canvas._resizeHandler = resizeHandler;
        }

        function showCandlestickTooltip(x, y, data, open, high, low, close) {
            // Tạo tooltip element
            let tooltip = document.getElementById('candlestick-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'candlestick-tooltip';
                tooltip.style.cssText = `
                    position: fixed;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 12px;
                    border-radius: 8px;
                    border: 2px solid #00d4aa;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                `;
                document.body.appendChild(tooltip);
            }
            
            const date = new Date(data.date);
            const dateStr = date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const isGreen = close >= open;
            const changeColor = isGreen ? '#00d4aa' : '#ff6b6b';
            
            tooltip.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 4px;">${dateStr}</div>
                <div style="color: ${changeColor};">Mở: ${formatPrice(open)}</div>
                <div style="color: ${changeColor};">Cao: ${formatPrice(high)}</div>
                <div style="color: ${changeColor};">Thấp: ${formatPrice(low)}</div>
                <div style="color: ${changeColor};">Đóng: ${formatPrice(close)}</div>
            `;
            
            tooltip.style.left = (x + 10) + 'px';
            tooltip.style.top = (y - 10) + 'px';
            tooltip.style.display = 'block';
        }

        function getChartOptions(data, chartType) {
            return {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { 
                            color: '#ffffff',
                            font: {
                                family: 'Arial, sans-serif',
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(31, 41, 55, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#374151',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                const date = new Date(data[context[0].dataIndex].date);
                                return date.toLocaleDateString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });
                            },
                            label: function(context) {
                                if (chartType === 'candlestick') {
                                    const point = context.parsed;
                                    return [
                                        'Mở: ' + formatPrice(point.o),
                                        'Cao: ' + formatPrice(point.h),
                                        'Thấp: ' + formatPrice(point.l),
                                        'Đóng: ' + formatPrice(point.c)
                                    ];
                                } else {
                                    return 'Giá: ' + formatPrice(context.parsed.y);
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        type: chartType === 'candlestick' ? 'time' : 'category',
                        time: chartType === 'candlestick' ? {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM dd'
                            }
                        } : undefined,
                        ticks: { 
                            color: '#9ca3af',
                            font: {
                                family: 'Arial, sans-serif',
                                size: 12
                            }
                        },
                        grid: { 
                            color: '#374151',
                            drawBorder: false
                        },
                        border: {
                            color: '#374151'
                        }
                    },
                    y: {
                        display: true,
                        ticks: { 
                            color: '#9ca3af',
                            font: {
                                family: 'Arial, sans-serif',
                                size: 12
                            },
                            callback: function(value) {
                                return formatPrice(value);
                            }
                        },
                        grid: { 
                            color: '#374151',
                            drawBorder: false
                        },
                        border: {
                            color: '#374151'
                        }
                    }
                }
            };
        }

        function setChartType(type) {
            currentChartType = type;
            document.querySelectorAll('.chart-controls .btn').forEach(btn => {
                if (btn.textContent === 'Đường' || btn.textContent === 'Nến') {
                    btn.classList.remove('active');
                }
            });
            event.target.classList.add('active');
            loadChartData();
        }

        function setPeriod(period) {
            currentPeriod = period;
            document.querySelectorAll('.chart-controls .btn').forEach(btn => {
                if (['7 ngày', '30 ngày', '90 ngày', '1 năm'].includes(btn.textContent)) {
                    btn.classList.remove('active');
                }
            });
            event.target.classList.add('active');
            loadChartData();
        }

        function showMarketTable() {
            document.getElementById('token-detail').style.display = 'none';
            document.getElementById('market-table').style.display = 'block';
            currentToken = null;
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
        }

        function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('market-table').style.display = 'none';
            document.getElementById('token-detail').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = message;
        }

        function formatPrice(price) {
            if (!price || isNaN(price)) return '$0.00';
            if (price >= 1) {
                return `$${price.toFixed(2)}`;
            } else if (price >= 0.01) {
                return `$${price.toFixed(4)}`;
            } else {
                return `$${price.toFixed(8)}`;
            }
        }

        function formatVolume(volume) {
            if (!volume || isNaN(volume)) return '$0.00';
            if (volume >= 1e9) {
                return `$${(volume / 1e9).toFixed(2)}B`;
            } else if (volume >= 1e6) {
                return `$${(volume / 1e6).toFixed(2)}M`;
            } else if (volume >= 1e3) {
                return `$${(volume / 1e3).toFixed(2)}K`;
            } else {
                return `$${volume.toFixed(2)}`;
            }
        }

        // Load data when page loads
        loadMarketData();
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
