import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { motion } from 'framer-motion';
import ChartSkeleton from './ChartSkeleton';

ChartJS.register(ArcElement, Tooltip, Legend);

const MarketDominanceChart = ({ dominanceData, isLoading, tokensData }) => {
  if (isLoading) {
    return <ChartSkeleton title="Market Dominance" />;
  }

  if (!dominanceData || dominanceData.length === 0) {
    return (
      <div className="card flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-dark-400 mb-2">No dominance data available</div>
        </div>
      </div>
    );
  }

  // Find BTC dominance
  const btcDominance = dominanceData.find(item => item.symbol === 'BTC')?.dominance_percent || 0;
  const altcoinDominance = 100 - btcDominance;

  // Get BTC icon from tokensData if available
  const btcToken = tokensData?.find(token => token.symbol === 'BTC');
  const btcIcon = btcToken?.icon_url;

  // Get top 5 altcoins (excluding BTC and "Altcoin" token) - starting from ETH
  // First, find ETH, then get the next 4 tokens after ETH
  const ethData = dominanceData.find(item => item.symbol === 'ETH');
  const top5Altcoins = ethData 
    ? [
        ethData, // ETH is #1
        ...dominanceData
          .filter(item => 
            item.symbol !== 'BTC' && 
            item.symbol !== 'ETH' && 
            item.symbol?.toUpperCase() !== 'ALTCOIN' &&
            item.symbol?.toLowerCase() !== 'altcoin'
          )
          .sort((a, b) => b.dominance_percent - a.dominance_percent)
          .slice(0, 4) // Get next 4 after ETH
      ]
    : dominanceData
        .filter(item => 
          item.symbol !== 'BTC' && 
          item.symbol?.toUpperCase() !== 'ALTCOIN' &&
          item.symbol?.toLowerCase() !== 'altcoin'
        )
        .sort((a, b) => b.dominance_percent - a.dominance_percent)
        .slice(0, 5);

  // Chart data for Bitcoin vs Altcoin
  const chartData = {
    labels: ['Bitcoin (BTC)', 'Altcoins'],
    datasets: [
      {
        data: [btcDominance, altcoinDominance],
        backgroundColor: [
          '#f59e0b', // BTC - Gold
          '#3b82f6'  // Altcoins - Blue
        ],
        borderColor: [
          '#f59e0b',
          '#3b82f6'
        ],
        borderWidth: 3,
        hoverBorderWidth: 4,
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
            size: 14,
            weight: '600'
          },
          padding: 20,
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
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value.toFixed(2)}%`;
          }
        }
      }
    },
    cutout: '60%'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
        <div className="w-8 h-8 bg-gradient-to-r from-[#f59e0b] to-[#3b82f6] rounded-lg flex items-center justify-center mr-3">
          <span className="text-sm font-bold text-white">MD</span>
        </div>
        Market Dominance
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-xs h-64">
            <Doughnut data={chartData} options={options} />
          </div>
        </div>

        {/* Stats and Top 5 */}
        <div className="space-y-6">
          {/* BTC vs Altcoin Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg border border-dark-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                  {btcIcon ? (
                    <img
                      src={btcIcon}
                      alt="BTC"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span className="text-white font-bold text-sm" style={{ display: btcIcon ? 'none' : 'flex' }}>₿</span>
                </div>
                <span className="font-semibold text-white">Bitcoin (BTC)</span>
              </div>
              <span className="text-xl font-bold text-[#f59e0b]">
                {btcDominance.toFixed(2)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-dark-800 rounded-lg border border-dark-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#3b82f6] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">ALT</span>
                </div>
                <span className="font-semibold text-white">Altcoins</span>
              </div>
              <span className="text-xl font-bold text-[#3b82f6]">
                {altcoinDominance.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Top 5 Altcoins */}
          {top5Altcoins.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Top 5 Altcoins by Dominance</h4>
              <div className="space-y-2">
                {top5Altcoins.map((token, index) => {
                  const tokenInfo = tokensData?.find(t => t.symbol === token.symbol);
                  const tokenIcon = tokenInfo?.icon_url;
                  
                  return (
                    <motion.div
                      key={token.symbol}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-dark-700 flex-shrink-0">
                          {tokenIcon ? (
                            <img
                              src={tokenIcon}
                              alt={token.symbol}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-xs"
                            style={{ display: tokenIcon ? 'none' : 'flex' }}
                          >
                            {token.symbol?.charAt(0) || index + 1}
                          </div>
                        </div>
                        <span className="font-semibold text-white">{token.symbol}</span>
                      </div>
                      <span className="font-semibold text-primary-400">
                        {token.dominance_percent.toFixed(2)}%
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MarketDominanceChart;

