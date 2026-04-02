import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const MarketHeatmap = ({ tokens, isLoading }) => {
  if (isLoading) {
    return (
      <div className="card flex items-center justify-center h-64">
        <LoadingSpinner size="md" text="Loading heatmap data..." />
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="card flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-yellow-400 mx-auto mb-4" />
          <p className="text-dark-400">No token data available for heatmap.</p>
        </div>
      </div>
    );
  }

  // Sắp xếp token theo vốn hóa thị trường giảm dần để các token lớn hơn xuất hiện trước
  const sortedTokens = [...tokens].sort((a, b) => 
    (b.market_cap?.market_cap_usd || 0) - (a.market_cap?.market_cap_usd || 0)
  );

  // Lấy tối đa 50 token hoặc ít hơn nếu không đủ
  const heatmapTokens = sortedTokens.slice(0, 50);

  const getHeatmapColor = (change) => {
    if (change === undefined || change === null) return 'bg-dark-600'; // Neutral/No data
    if (change > 5) return 'bg-green-700'; // Strong gain
    if (change > 2) return 'bg-green-600'; // Moderate gain
    if (change > 0) return 'bg-green-500'; // Slight gain
    if (change < -5) return 'bg-red-700'; // Strong loss
    if (change < -2) return 'bg-red-600'; // Moderate loss
    if (change < 0) return 'bg-red-500'; // Slight loss
    return 'bg-dark-600'; // Near zero change
  };

  const formatChange = (change) => {
    if (change === undefined || change === null) return '--';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  const formatPrice = (price) => {
    if (!price || price === 0) return '$0.00';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  // Tính toán số cột và hàng để tạo hình chữ nhật đều
  const totalTokens = heatmapTokens.length;
  const cols = Math.ceil(Math.sqrt(totalTokens));
  const rows = Math.ceil(totalTokens / cols);

  return (
    <motion.div 
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
        <BarChart3 className="h-5 w-5 mr-2 text-primary-400" />
        Market Heatmap
      </h3>
      
      {/* Legend */}
      <div className="mb-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-700 rounded"></div>
          <span className="text-dark-400">+5%+</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-dark-400">+2% to +5%</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-dark-400">0% to +2%</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-dark-600 rounded"></div>
          <span className="text-dark-400">No Data</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-dark-400">0% to -2%</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span className="text-dark-400">-2% to -5%</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-700 rounded"></div>
          <span className="text-dark-400">-5%-</span>
        </div>
      </div>

      {/* Heatmap Grid - Đều nhau */}
      <div 
        className="grid gap-1 overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          height: '400px'
        }}
      >
        {heatmapTokens.map((token, index) => {
          return (
            <motion.div
              key={token.symbol}
              className={`relative flex items-center justify-center text-center p-2 rounded-md cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 ${getHeatmapColor(token.changes?.['1d'])}`}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              title={`${token.name} (${token.symbol})\nPrice: ${formatPrice(token.price)}\n24h Change: ${formatChange(token.changes?.['1d'])}\nMarket Cap: $${((token.market_cap?.market_cap_usd || 0) / 1e9).toFixed(2)}B`}
            >
              <div className="flex flex-col items-center justify-center text-xs text-white font-medium w-full h-full">
                {token.icon_url ? (
                  <img 
                    src={token.icon_url}
                    alt={token.symbol}
                    className="w-6 h-6 object-cover mb-1 rounded-full"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <div 
                  className="w-6 h-6 flex items-center justify-center bg-dark-500 rounded-full mb-1 text-[10px]"
                  style={{ display: token.icon_url ? 'none' : 'block' }}
                >
                  {token.symbol.charAt(0)}
                </div>
                <span className="block font-bold text-[0.7rem]">{token.symbol}</span>
                <span className="block text-[0.6rem] font-semibold">
                  {formatChange(token.changes?.['1d'])}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center text-sm text-dark-400">
        <p>* Tất cả ô có kích thước bằng nhau. Màu sắc thể hiện % thay đổi 24h.</p>
        <p>Di chuột vào từng ô để xem chi tiết.</p>
      </div>
    </motion.div>
  );
};

export default MarketHeatmap;
