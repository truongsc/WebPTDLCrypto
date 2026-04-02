import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { motion } from 'framer-motion';
import { generateMockVolumeData } from '../../utils/mockData';
import ChartSkeleton from './ChartSkeleton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const VolumeChart = ({ data, isLoading }) => {
  if (isLoading) {
    return <ChartSkeleton title="Top Volume (24h)" />;
  }

  // Use mock data if no real data available
  const chartData = data && data.length > 0 ? data : generateMockVolumeData();

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 bg-dark-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-dark-400 mb-2">No data available</div>
          <div className="text-sm text-dark-500">Volume data will appear here</div>
        </div>
      </div>
    );
  }

  // Format large numbers
  const formatVolume = (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Prepare chart data - show top 10 tokens by volume
  const sortedData = chartData
    .sort((a, b) => (b.quote_volume_24h || b.volume_24h || 0) - (a.quote_volume_24h || a.volume_24h || 0))
    .slice(0, 10);

  const chartDataConfig = {
    labels: sortedData.map(item => item.symbol),
    datasets: [
      {
        label: '24h Volume',
        data: sortedData.map(item => item.quote_volume_24h || item.volume_24h || 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
            return sortedData[context[0].dataIndex].name || context[0].label;
          },
          label: function(context) {
            const value = context.parsed.y;
            return `Volume: ${formatVolume(value)}`;
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
            return formatVolume(value);
          }
        }
      }
    }
  };

  // Calculate total volume
  const totalVolume = sortedData.reduce((sum, item) => sum + (item.quote_volume_24h || item.volume_24h || 0), 0);
  const avgVolume = totalVolume / sortedData.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-white">📊</span>
          </div>
          Top Volume (24h)
        </h3>
        
        <div className="text-right">
          <div className="text-sm text-dark-400">Total Volume</div>
          <div className="text-lg font-bold text-white">
            {formatVolume(totalVolume)}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 w-full">
        <Bar data={chartDataConfig} options={options} />
      </div>

      {/* Volume Statistics */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-dark-700 rounded-lg">
          <div className="text-sm text-dark-400">Highest Volume</div>
          <div className="font-semibold text-white">
            {sortedData[0]?.symbol}: {formatVolume(sortedData[0]?.quote_volume_24h || sortedData[0]?.volume_24h || 0)}
          </div>
        </div>
        <div className="text-center p-3 bg-dark-700 rounded-lg">
          <div className="text-sm text-dark-400">Average Volume</div>
          <div className="font-semibold text-white">
            {formatVolume(avgVolume)}
          </div>
        </div>
      </div>

      {/* Top Volume Tokens List */}
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-dark-400 mb-3">Top 5 by Volume:</div>
        {sortedData.slice(0, 5).map((token, index) => (
          <div key={token.symbol} className="flex items-center justify-between p-2 bg-dark-750 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-dark-700 flex-shrink-0">
                {token.icon_url ? (
                  <img
                    src={token.icon_url}
                    alt={token.symbol}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold"
                  style={{ display: token.icon_url ? 'none' : 'flex' }}
                >
                  {token.symbol?.charAt(0) || index + 1}
                </div>
              </div>
              <span className="font-medium text-white">{token.symbol}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-white">
                {formatVolume(token.quote_volume_24h || token.volume_24h || 0)}
              </div>
              <div className="text-xs text-dark-400">
                {((token.quote_volume_24h || token.volume_24h || 0) / totalVolume * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default VolumeChart;
