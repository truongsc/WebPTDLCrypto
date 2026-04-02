import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Menu, 
  Bell, 
  Search, 
  Sun, 
  Moon,
  TrendingUp,
  Settings
} from 'lucide-react';
import { useQuery } from 'react-query';
import { fetchMarketOverview } from '../services/api';

const Header = ({ onMenuClick, isDark, onToggleTheme }) => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch market overview for header stats
  const { data: marketData } = useQuery(
    'market-overview',
    fetchMarketOverview,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const formatMarketCap = (value) => {
    if (!value) return '$0';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
        return 'Dashboard';
      case '/analysis':
        return 'Token Analysis';
      case '/indicators':
        return 'Market Indicators';
      case '/tools':
        return 'Investment Tools';
      case '/news':
        return 'News & Events';
      case '/community':
        return 'Community & Education';
      default:
        return 'Crypto Analysis';
    }
  };

  return (
    <header
      className={
        isDark
          ? 'bg-dark-800 border-b border-dark-700 shadow-lg'
          : 'bg-white border-b border-slate-200 shadow-sm'
      }
    >
      <div className="flex items-center justify-between px-4 py-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <Menu className="h-6 w-6 text-dark-300" />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:block text-xl font-bold gradient-text">
              Crypto Analysis
            </span>
          </Link>

          {/* Page Title */}
          <div className="hidden md:block">
            <h1
              className={`text-lg font-semibold ${
                isDark ? 'text-dark-100' : 'text-slate-800'
              }`}
            >
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search tokens, news, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all border ${
                isDark
                  ? 'bg-dark-700 border-dark-600 text-dark-100 placeholder-dark-400'
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Market Stats */}
          <div className="hidden xl:flex items-center space-x-6 text-sm">
            {marketData && (
              <>
                <div className="text-center">
                  <div className="text-dark-400">Market Cap</div>
                  <div
                    className={`font-semibold ${
                      isDark ? 'text-dark-100' : 'text-slate-800'
                    }`}
                  >
                    {formatMarketCap(marketData.market_cap?.total)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-dark-400">Fear & Greed</div>
                  <div className={`font-semibold ${
                    marketData.fear_greed_index?.value > 50 
                      ? 'text-green-400' 
                      : marketData.fear_greed_index?.value < 30 
                      ? 'text-red-400' 
                      : 'text-yellow-400'
                  }`}>
                    {marketData.fear_greed_index?.value || '--'}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-dark-400">Market RSI</div>
                  <div className={`font-semibold ${
                    marketData.market_rsi?.average > 70 
                      ? 'text-red-400' 
                      : marketData.market_rsi?.average < 30 
                      ? 'text-green-400' 
                      : 'text-dark-100'
                  }`}>
                    {marketData.market_rsi?.average?.toFixed(1) || '--'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            className={`relative p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-dark-700' : 'hover:bg-slate-100'
            }`}
          >
            <Bell className={`h-5 w-5 ${isDark ? 'text-dark-300' : 'text-slate-500'}`} />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-dark-700' : 'hover:bg-slate-100'
            }`}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </button>

          {/* Settings */}
          <button
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-dark-700' : 'hover:bg-slate-100'
            }`}
          >
            <Settings className={`h-5 w-5 ${isDark ? 'text-dark-300' : 'text-slate-500'}`} />
          </button>

          {/* User Avatar */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">U</span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Stats Mobile */}
      {marketData && (
        <div className="xl:hidden px-4 pb-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-center flex-1">
              <div className="text-dark-400">Market Cap</div>
              <div className="font-semibold text-dark-100">
                {formatMarketCap(marketData.market_cap?.total)}
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-dark-400">Fear & Greed</div>
              <div className={`font-semibold ${
                marketData.fear_greed_index?.value > 50 
                  ? 'text-green-400' 
                  : marketData.fear_greed_index?.value < 30 
                  ? 'text-red-400' 
                  : 'text-yellow-400'
              }`}>
                {marketData.fear_greed_index?.value || '--'}
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className="text-dark-400">Market RSI</div>
              <div className={`font-semibold ${
                marketData.market_rsi?.average > 70 
                  ? 'text-red-400' 
                  : marketData.market_rsi?.average < 30 
                  ? 'text-green-400' 
                  : 'text-dark-100'
              }`}>
                {marketData.market_rsi?.average?.toFixed(1) || '--'}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;