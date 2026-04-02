import React from 'react';

const ChartSkeleton = ({ title = "Loading Chart", height = "h-64" }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mr-3 animate-pulse">
            <div className="w-4 h-4 bg-white rounded opacity-50"></div>
          </div>
          {title}
        </h3>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-dark-400 animate-pulse">--</div>
          <div className="text-sm text-dark-500 animate-pulse">Loading...</div>
        </div>
      </div>

      {/* Chart Skeleton */}
      <div className={`${height} bg-dark-800 rounded-xl relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-dark-800 via-dark-750 to-dark-800 animate-pulse"></div>
        
        {/* Animated loading dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
        
        {/* Chart grid lines skeleton */}
        <div className="absolute inset-4 opacity-20">
          <div className="grid grid-cols-6 grid-rows-4 h-full gap-2">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="bg-dark-600 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom skeleton content */}
      <div className="mt-4 space-y-3">
        <div className="h-4 bg-dark-700 rounded animate-pulse"></div>
        <div className="h-4 bg-dark-700 rounded animate-pulse w-3/4"></div>
      </div>
    </div>
  );
};

export default ChartSkeleton;
