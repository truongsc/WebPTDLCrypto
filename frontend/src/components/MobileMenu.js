import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';

const MobileMenu = ({ onClose }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Close Button */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <span className="text-lg font-semibold text-white">Menu</span>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
        >
          <X className="h-5 w-5 text-dark-300" />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto">
        <Sidebar />
      </div>
    </div>
  );
};

export default MobileMenu;
