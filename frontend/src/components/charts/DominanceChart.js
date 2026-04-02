import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { motion } from 'framer-motion';
import { generateMockDominanceData } from '../../utils/mockData';
import ChartSkeleton from './ChartSkeleton';

ChartJS.register(ArcElement, Tooltip, Legend);

const DominanceChart = ({ data, isLoading }) => {
  if (isLoading) {
    return <ChartSkeleton title="Market Dominance" />;
  }

  // Use mock data if no real data available
  const chartData = data && data.length > 0 ? data : generateMockDominanceData();

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 bg-dark-800 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="text-dark-400 mb-2">No data available</div>
          <div className="text-sm text-dark-500">Market dominance will appear here</div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartDataConfig = {
    labels: chartData.map(item => item.symbol),
    datasets: [
      {
        data: chartData.map(item => item.dominance_percent),
        backgroundColor: [
          '#f59e0b', // BTC - Gold
          '#3b82f6', // ETH - Blue
          '#10b981', // BNB - Green
          '#8b5cf6', // SOL - Purple
          '#ef4444', // XRP - Red
          '#06b6d4', // ADA - Cyan
          '#84cc16', // AVAX - Lime
          '#f97316', // DOT - Orange
          '#ec4899', // MATIC - Pink
          '#6b7280'  // Others - Gray
        ],
        borderColor: [
          '#f59e0b',
          '#3b82f6',
          '#10b981',
          '#8b5cf6',
          '#ef4444',
          '#06b6d4',
          '#84cc16',
          '#f97316',
          '#ec4899',
          '#6b7280'
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
          font: {
            size: 11,
            weight: '500'
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const value = context.parsed;
            return `Dominance: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    cutout: '60%',
    radius: '80%'
  };

  // Calculate total dominance
  const totalDominance = chartData.reduce((sum, item) => sum + item.dominance_percent, 0);
  const btcDominance = chartData.find(item => item.symbol === 'BTC')?.dominance_percent || 0;
  const ethDominance = chartData.find(item => item.symbol === 'ETH')?.dominance_percent || 0;
  const altcoinDominance = totalDominance - btcDominance - ethDominance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-sm font-bold text-white">%</span>
          </div>
          Market Dominance
        </h3>
        
        <div className="text-right">
          <div className="text-sm text-dark-400">Top 5 Tokens</div>
          <div className="text-lg font-bold text-white">
            {totalDominance.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 w-full">
        <Doughnut data={chartDataConfig} options={options} />
      </div>

      {/* Detailed Breakdown */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">B</span>
            </div>
            <span className="font-medium text-white">Bitcoin</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-white">{btcDominance.toFixed(1)}%</div>
            <div className="text-xs text-dark-400">BTC</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">E</span>
            </div>
            <span className="font-medium text-white">Ethereum</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-white">{ethDominance.toFixed(1)}%</div>
            <div className="text-xs text-dark-400">ETH</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="font-medium text-white">Altcoins</span>
          </div>
          <div className="text-right">
            <div className="font-bold text-white">{altcoinDominance.toFixed(1)}%</div>
            <div className="text-xs text-dark-400">Others</div>
          </div>
        </div>
      </div>

      {/* Market Phase Analysis */}
      <div className="mt-4 p-3 bg-dark-700 rounded-lg">
        <div className="text-sm text-dark-300">
          <strong className="text-white">Market Phase:</strong> {' '}
          {btcDominance > 60 ? 'Bitcoin dominance phase - BTC leading the market' :
           ethDominance > 25 ? 'Ethereum strength phase - DeFi and ETH ecosystem growing' :
           altcoinDominance > 60 ? 'Alt season - Altcoins outperforming major cryptos' :
           'Balanced market - No clear dominance pattern'}
        </div>
      </div>
    </motion.div>
  );
};

export default DominanceChart;
