import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

const MarketSummaryCard = ({ summary }) => {
  if (!summary) return null;

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
      case 'positive':
      case 'greed':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'bearish':
      case 'negative':
      case 'fear':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'neutral':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'bullish':
      case 'positive':
      case 'greed':
        return <TrendingUp className="h-5 w-5" />;
      case 'bearish':
      case 'negative':
      case 'fear':
        return <TrendingDown className="h-5 w-5" />;
      case 'neutral':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getRSILevel = (rsiLevel) => {
    switch (rsiLevel?.toLowerCase()) {
      case 'overbought':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'oversold':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'neutral':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-dark-400 bg-dark-700 border-dark-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
        <CheckCircle className="h-5 w-5 mr-2 text-primary-400" />
        Tổng quan thị trường
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Market Sentiment */}
        <div className={`p-4 rounded-xl border ${getSentimentColor(summary.sentiment)}`}>
          <div className="flex items-center space-x-2 mb-2">
            {getSentimentIcon(summary.sentiment)}
            <span className="font-medium">Tâm lý thị trường</span>
          </div>
          <div className="text-lg font-bold capitalize">
            {summary.sentiment || 'Unknown'}
          </div>
        </div>

        {/* Market Condition */}
        <div className={`p-4 rounded-xl border ${getSentimentColor(summary.market_condition)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Tình trạng thị trường</span>
          </div>
          <div className="text-lg font-bold capitalize">
            {summary.market_condition || 'Unknown'}
          </div>
        </div>

        {/* RSI Level */}
        <div className={`p-4 rounded-xl border ${getRSILevel(summary.rsi_level)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium">Mức RSI</span>
          </div>
          <div className="text-lg font-bold capitalize">
            {summary.rsi_level || 'Unknown'}
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-4 rounded-xl border border-primary-500/30 bg-primary-500/10">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-primary-400" />
            <span className="font-medium text-primary-400">Khuyến nghị nhanh</span>
          </div>
          <div className="text-lg font-bold text-primary-400">
            {summary.recommendation || 'Monitor Market'}
          </div>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="mt-6 p-4 bg-dark-700 rounded-xl">
        <h4 className="font-semibold text-white mb-3">Phân tích thị trường chi tiết</h4>
        <p className="text-dark-300 leading-relaxed">
          {summary.recommendation ||
            'Thị trường hiện đang cho thấy các tín hiệu đan xen. Nên kết hợp theo dõi chỉ số tâm lý (Fear & Greed), xu hướng vốn hóa và khối lượng để xác định điểm vào/ra hợp lý. Luôn ưu tiên quản lý rủi ro, đặt điểm cắt lỗ rõ ràng và phân bổ vốn phù hợp với khẩu vị rủi ro của bạn.'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
        >
          View Detailed Analysis
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 border border-primary-500 text-primary-400 rounded-lg font-medium hover:bg-primary-500 hover:text-white transition-all duration-200"
        >
          Set Price Alerts
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 border border-dark-600 text-dark-300 rounded-lg font-medium hover:bg-dark-600 hover:text-white transition-all duration-200"
        >
          Market Calendar
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MarketSummaryCard;
