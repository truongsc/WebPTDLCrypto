import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { motion } from 'framer-motion';
import { generateMockMarketCapData } from '../../utils/mockData';
import ChartSkeleton from './ChartSkeleton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MarketCapChart = ({ data, isLoading }) => {
  if (isLoading) {
    return <ChartSkeleton title="Market Cap Trend" />;
  }

  // Use real data if available, fallback to single day mock data if empty
  const chartData = data && data.length > 0 ? data : null;

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 bg-dark-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-dark-400 mb-2">No data available</div>
          <div className="text-sm text-dark-500">Market cap trend will appear here</div>
        </div>
      </div>
    );
  }

  // Format large numbers
  const formatMarketCap = (value) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  // Sample data if too many points for better performance (max 100 points)
  const maxPoints = 100;
  const sampledData = chartData.length > maxPoints 
    ? chartData.filter((_, index) => index % Math.ceil(chartData.length / maxPoints) === 0 || index === chartData.length - 1)
    : chartData;
  
  // Prepare chart data
  // If only 1 data point, duplicate it to show a point on chart
  const chartDataForChart = sampledData.length === 1 
    ? [sampledData[0], sampledData[0]] 
    : sampledData;
  
  const chartDataConfig = {
    labels: chartDataForChart.map(item => {
      const date = new Date(item.date);
      // Format based on data range
      if (sampledData.length === 1) {
        return date.toLocaleDateString('vi-VN', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (sampledData.length <= 30) {
        // Show month and day for short periods
        return date.toLocaleDateString('vi-VN', { 
          month: 'short', 
          day: 'numeric'
        });
      } else {
        // Show month and year for long periods
        return date.toLocaleDateString('vi-VN', { 
          month: 'short', 
          year: '2-digit'
        });
      }
    }),
    datasets: [
      {
        label: 'Total Market Cap',
        data: chartDataForChart.map(item => item.total_market_cap || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: sampledData.length === 1 ? 0 : 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: sampledData.length === 1 ? 6 : (sampledData.length <= 30 ? 4 : 0), // Hide points if too many
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3
      }
    ]
  };

  // Calculate trend - only if we have at least 2 data points
  const currentValue = chartData[chartData.length - 1]?.total_market_cap || 0;
  const previousValue = chartData.length >= 2 ? chartData[chartData.length - 2]?.total_market_cap : null;
  const changePercent = previousValue && previousValue > 0 
    ? ((currentValue - previousValue) / previousValue * 100) 
    : 0;

  const options = {
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
        borderColor: '#3b82f6',
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
            if (!context || context.length === 0 || !context[0]) {
              return '';
            }
            const dataIndex = context[0].dataIndex;
            if (dataIndex === undefined || dataIndex < 0 || dataIndex >= chartDataForChart.length) {
              return '';
            }
            const item = chartDataForChart[dataIndex];
            if (!item || !item.date) {
              return '';
            }
            const date = new Date(item.date);
            return date.toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          },
          label: function(context) {
            if (!context || context.parsed === undefined) {
              return '';
            }
            const value = context.parsed.y;
            return `Market Cap: ${formatMarketCap(value)}`;
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
            return formatMarketCap(value);
          }
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-white">$</span>
          </div>
          Total Market Cap Trend
        </h3>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {formatMarketCap(currentValue)}
          </div>
          <div className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 w-full">
        <Line data={chartDataConfig} options={options} />
      </div>

      {/* Statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-dark-400">
            {chartData.length > 1 ? 'Period High' : 'Current'}
          </div>
          <div className="font-semibold text-white">
            {formatMarketCap(Math.max(...chartData.map(d => d.total_market_cap || 0)))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-dark-400">
            {chartData.length > 1 ? 'Period Low' : 'Market Cap'}
          </div>
          <div className="font-semibold text-white">
            {formatMarketCap(Math.min(...chartData.map(d => d.total_market_cap || 0)))}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-dark-400">Average</div>
          <div className="font-semibold text-white">
            {formatMarketCap(chartData.reduce((sum, d) => sum + (d.total_market_cap || 0), 0) / chartData.length)}
          </div>
        </div>
      </div>

      {/* Analysis */}
      <div className="mt-4 p-3 bg-dark-700 rounded-lg">
        <div className="text-sm text-dark-300">
          <strong className="text-white">Phân tích vốn hóa thị trường:</strong>{' '}
          {changePercent > 5
            ? 'Tổng vốn hóa thị trường đang tăng mạnh, cho thấy xu hướng TĂNG rõ rệt và tâm lý tích cực trên toàn thị trường.'
            : changePercent > 0
            ? 'Vốn hóa thị trường tăng nhẹ, xu hướng tăng trung hạn vẫn được duy trì nhưng chưa quá bùng nổ.'
            : changePercent > -5
            ? 'Vốn hóa thị trường tương đối ổn định, dao động nhẹ. Thị trường đang trong giai đoạn tích lũy hoặc đi ngang.'
            : 'Vốn hóa thị trường suy giảm đáng kể, cho thấy xu hướng GIẢM và tâm lý bi quan đang chiếm ưu thế.'}
        </div>
      </div>
    </motion.div>
  );
};

export default MarketCapChart;
