import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MarketOverviewCard = ({ 
  title, 
  value, 
  format = 'number', 
  icon, 
  trend, 
  color = 'blue',
  className = '',
  onClick
}) => {
  const formatValue = (val, formatType) => {
    if (val === null || val === undefined) return '--';
    
    switch (formatType) {
      case 'currency':
        if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
        return `$${val.toFixed(2)}`;
      
      case 'decimal':
        return val.toFixed(2);
      
      case 'number':
        return val.toLocaleString();
      
      default:
        return val;
    }
  };

  const getColorClasses = (colorType) => {
    switch (colorType) {
      case 'green':
        return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'red':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'yellow':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'blue':
        return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      default:
        return 'text-primary-400 border-primary-500/30 bg-primary-500/10';
    }
  };

  const getTrendIcon = (trendValue) => {
    if (!trendValue) return null;
    
    const isPositive = typeof trendValue === 'string' 
      ? trendValue.toLowerCase().includes('up') || trendValue.toLowerCase().includes('bull') || trendValue.toLowerCase().includes('greed')
      : trendValue > 0;
    
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-400" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-400" />
    );
  };

  const getTrendText = (trendValue) => {
    if (!trendValue) return null;
    
    if (typeof trendValue === 'string') {
      return trendValue;
    }
    
    return trendValue > 0 ? '+' : '';
  };

  const clickable = typeof onClick === 'function';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: clickable ? -2 : 0 }}
      transition={{ duration: 0.3 }}
      className={`card card-hover ${clickable ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
          {icon}
        </div>
        
        {trend && (
          <div className="flex items-center space-x-1 text-sm">
            {getTrendIcon(trend)}
            <span className="text-dark-400">
              {getTrendText(trend)}
            </span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-dark-400 mb-1">
          {title}
        </h3>
        <div className="text-2xl font-bold text-white">
          {formatValue(value, format)}
        </div>
      </div>
      
      {/* Subtle background pattern */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
        <div className="w-full h-full bg-gradient-to-br from-white to-transparent rounded-full" />
      </div>
    </motion.div>
  );
};

export default MarketOverviewCard;
