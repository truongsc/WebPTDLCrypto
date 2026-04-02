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
import { generateMockFearGreedData } from '../../utils/mockData';
import { normalizeFearGreedClassification } from '../../utils/fearGreedHelper';
import ChartSkeleton from './ChartSkeleton';
import NoDataMessage from '../NoDataMessage';
import { Database } from 'lucide-react';

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

const FearGreedChart = ({ data, isLoading }) => {
  if (isLoading) {
    return <ChartSkeleton title="Fear & Greed Index" />;
  }

  // Use mock data if no real data available
  const chartData = data && data.length > 0 ? data : generateMockFearGreedData(7);

  if (!chartData || chartData.length === 0) {
    return (
      <NoDataMessage
        title="Fear & Greed Index"
        message="Market sentiment data will appear here when available"
        icon={Database}
      />
    );
  }

  // Prepare chart data
  const chartDataConfig = {
    labels: chartData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('vi-VN', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Fear & Greed Index',
        data: chartData.map(item => item.value),
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00d4aa',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#00d4aa',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3
      }
    ]
  };

  // Get current value and classification
  const currentValue = chartData[chartData.length - 1]?.value;
  const dbClassification = chartData[chartData.length - 1]?.classification;
  // Normalize classification based on value
  const currentClassification = normalizeFearGreedClassification(currentValue, dbClassification);

  const getSentimentColor = (value) => {
    if (value <= 20) return 'text-red-400';
    if (value <= 40) return 'text-orange-400';
    if (value <= 60) return 'text-yellow-400';
    if (value <= 80) return 'text-green-400';
    return 'text-green-500';
  };

  const getBackgroundColor = (value) => {
    if (value <= 20) return 'rgba(239, 68, 68, 0.1)';
    if (value <= 40) return 'rgba(249, 115, 22, 0.1)';
    if (value <= 60) return 'rgba(234, 179, 8, 0.1)';
    if (value <= 80) return 'rgba(34, 197, 94, 0.1)';
    return 'rgba(16, 185, 129, 0.1)';
  };

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
            const date = new Date(chartData[context[0].dataIndex].date);
            return date.toLocaleDateString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          },
          label: function(context) {
            const value = context.parsed.y;
            const classification = chartData[context.dataIndex].classification;
            return `Fear & Greed: ${value} (${classification})`;
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
        min: 0,
        max: 100,
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
            return value;
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
          <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-white">F&G</span>
          </div>
          Fear & Greed Index
        </h3>
        
        <div className="text-right">
          <div className={`text-2xl font-bold ${getSentimentColor(currentValue)}`}>
            {currentValue || '--'}
          </div>
          <div className="text-sm text-dark-400 capitalize">
            {currentClassification || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 w-full">
        <Line data={chartDataConfig} options={options} />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-dark-400">Extreme Fear (0-20)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-dark-400">Fear (21-40)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-dark-400">Neutral (41-60)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-dark-400">Greed (61-80)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-600 rounded-full"></div>
          <span className="text-dark-400">Extreme Greed (81-100)</span>
        </div>
      </div>

      {/* Analysis */}
      <div className="mt-4 p-3 bg-dark-700 rounded-lg">
        <div className="text-sm text-dark-300">
          <strong className="text-white">Tâm lý thị trường:</strong>{' '}
          {currentValue <= 20
            ? 'Thị trường đang ở trạng thái CỰC KỲ SỢ HÃI. Đây thường là vùng giá hấp dẫn cho nhà đầu tư dài hạn nếu chấp nhận rủi ro cao.'
            : currentValue <= 40
            ? 'Nỗi sợ vẫn chiếm ưu thế. Có thể xem xét giải ngân từng phần, tránh mua toàn bộ một lần.'
            : currentValue <= 60
            ? 'Tâm lý thị trường đang TRUNG LẬP. Nên quan sát thêm các tín hiệu xu hướng rõ ràng trước khi ra quyết định lớn.'
            : currentValue <= 80
            ? 'Lòng tham đang gia tăng. Phù hợp để chốt lời dần các vị thế đã tăng mạnh và siết chặt quản lý rủi ro.'
            : 'Thị trường đang ở trạng thái CỰC KỲ THAM LAM. Rủi ro điều chỉnh/đảo chiều mạnh rất cao, nên xem xét giảm tỷ trọng và bảo vệ thành quả.'}
        </div>
      </div>
    </motion.div>
  );
};

export default FearGreedChart;
