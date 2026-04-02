import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const TopGainersLosers = ({ title, data, type = 'gainers' }) => {
  const formatPrice = (price) => {
    if (!price || price === 0) return '$0.00';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const getChangeColor = (change) => {
    if (type === 'gainers') {
      return change >= 0 ? 'text-green-400' : 'text-red-400';
    } else {
      return change <= 0 ? 'text-red-400' : 'text-green-400';
    }
  };

  const getChangeIcon = (change) => {
    if (type === 'gainers') {
      return change >= 0 ? (
        <ArrowUpRight className="h-4 w-4" />
      ) : (
        <ArrowDownRight className="h-4 w-4" />
      );
    } else {
      return change <= 0 ? (
        <ArrowDownRight className="h-4 w-4" />
      ) : (
        <ArrowUpRight className="h-4 w-4" />
      );
    }
  };

  const getIconColor = () => {
    return type === 'gainers' ? 'text-green-400' : 'text-red-400';
  };

  const getBorderColor = () => {
    return type === 'gainers' ? 'border-green-500/30' : 'border-red-500/30';
  };

  const getBackgroundGradient = () => {
    return type === 'gainers' 
      ? 'from-green-500/10 to-green-600/10' 
      : 'from-red-500/10 to-red-600/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          {type === 'gainers' ? (
            <TrendingUp className={`h-5 w-5 mr-2 ${getIconColor()}`} />
          ) : (
            <TrendingDown className={`h-5 w-5 mr-2 ${getIconColor()}`} />
          )}
          {title}
        </h3>
        
        <Link 
          to="/#all-cryptocurrencies" 
          className="text-primary-400 hover:text-primary-300 transition-colors text-sm font-medium"
        >
          View All
        </Link>
      </div>

      {data && data.length > 0 ? (
        <div className="space-y-3">
          {data.slice(0, 3).map((token, index) => (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl border ${getBorderColor()} bg-gradient-to-r ${getBackgroundGradient()} hover:shadow-lg transition-all duration-200`}
            >
              <Link 
                to={`/analysis/${token.symbol}`}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-700">
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
                      className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold"
                      style={{ display: token.icon_url ? 'none' : 'flex' }}
                    >
                      {token.symbol?.charAt(0) || '?'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                      {token.symbol}
                    </div>
                    <div className="text-sm text-dark-400">
                      {token.name}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-white mb-1">
                    {formatPrice(token.price)}
                  </div>
                  <div className={`flex items-center justify-end space-x-1 font-medium ${getChangeColor(token.change_24h)}`}>
                    {getChangeIcon(token.change_24h)}
                    <span>
                      {token.change_24h ? 
                        `${token.change_24h >= 0 ? '+' : ''}${token.change_24h.toFixed(2)}%` : 
                        '--'
                      }
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getBackgroundGradient()} ${getBorderColor()} border`}>
            {type === 'gainers' ? (
              <TrendingUp className={`h-8 w-8 ${getIconColor()}`} />
            ) : (
              <TrendingDown className={`h-8 w-8 ${getIconColor()}`} />
            )}
          </div>
          <h4 className="text-lg font-semibold text-dark-300 mb-2">
            No {type} data available
          </h4>
          <p className="text-dark-400">
            Check back later for updated market data
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default TopGainersLosers;
