import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileMenu from './MobileMenu';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <div
      className={`flex h-screen ${
        isDark ? 'bg-dark-900 text-dark-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:z-50">
        <Sidebar isDark={isDark} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm" onClick={toggleSidebar} />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`relative flex-1 flex flex-col max-w-xs w-full ${
                isDark ? 'bg-dark-800' : 'bg-white'
              } shadow-xl`}
            >
              <MobileMenu onClose={toggleSidebar} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-60">
        {/* Header */}
        <Header onMenuClick={toggleSidebar} isDark={isDark} onToggleTheme={toggleTheme} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
