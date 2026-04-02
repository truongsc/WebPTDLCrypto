import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  TrendingUp,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      description: 'Market overview and key metrics'
    },
    {
      name: 'Token Analysis',
      href: '/analysis',
      icon: TrendingUp,
      description: 'Detailed token analysis and charts'
    },
    {
      name: 'Market Indicators',
      href: '/indicators',
      icon: BarChart3,
      description: 'Fear & Greed, RSI, market trends'
    },
    // Các mục khác đã được loại bỏ theo yêu cầu, chỉ giữ lại 3 trang chính
  ];

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-dark-800 border-r border-dark-700 lg:w-60">
      {/* Logo Section */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-dark-700">
        <Link to="/" className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white">Crypto</span>
            <span className="text-xs text-primary-400 font-medium">Analysis</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className="group relative"
            >
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 border border-primary-500/30 text-primary-400'
                    : 'text-dark-300 hover:text-white hover:bg-dark-700'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary-400' : 'text-dark-400 group-hover:text-white'}`} />
                <div className="flex-1">
                  <div className={`font-medium text-sm ${active ? 'text-primary-400' : 'text-dark-200 group-hover:text-white'}`}>
                    {item.name}
                  </div>
                  <div className="text-[11px] text-dark-400 group-hover:text-dark-300">
                    {item.description}
                  </div>
                </div>
              </motion.div>
              
              {/* Active indicator */}
              {active && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-primary-600 rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-4 border-t border-dark-700">
        <div className="space-y-2">
          <Link
            to="/settings"
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-dark-300 hover:text-white hover:bg-dark-700 transition-all duration-200"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </Link>
          
          <Link
            to="/help"
            className="flex items-center space-x-3 px-3 py-2 rounded-xl text-dark-300 hover:text-white hover:bg-dark-700 transition-all duration-200"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="font-medium">Help & Support</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="mt-4 p-3 bg-dark-700 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">U</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">User</div>
              <div className="text-xs text-dark-400">Free Plan</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
