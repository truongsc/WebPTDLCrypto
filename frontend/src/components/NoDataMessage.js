import React from 'react';
import { motion } from 'framer-motion';
import { Database, Wifi, RefreshCw } from 'lucide-react';

const NoDataMessage = ({ 
  title = "No Data Available", 
  message = "Data will appear here when available",
  icon: Icon = Database,
  showRefresh = false,
  onRefresh = null 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="h-64 bg-dark-800 rounded-xl flex flex-col items-center justify-center p-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-dark-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-dark-400 text-sm mb-4 max-w-sm">{message}</p>
        
        {showRefresh && onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default NoDataMessage;
