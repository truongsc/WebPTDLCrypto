import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

const TokenTable = ({ tokens, title = "Cryptocurrencies", showAll = true }) => {
  const [sortBy, setSortBy] = useState('quote_volume_24h'); // Default sort by volume
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const tokensPerPage = 10;

  const formatPrice = (price) => {
    if (!price || price === 0) return '$0.00';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatVolume = (volume) => {
    if (!volume || volume === 0) return '$0';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap) => {
    if (!marketCap || marketCap === 0) return '$0';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toFixed(2)}`;
  };

  const getChangeColor = (change) => {
    if (!change) return 'text-dark-400';
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeIcon = (change) => {
    if (!change) return null;
    return change >= 0 ? (
      <ArrowUpRight className="h-3 w-3" />
    ) : (
      <ArrowDownRight className="h-3 w-3" />
    );
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Filter and sort tokens
  const filteredAndSortedTokens = tokens
    .filter(token => 
      token.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle nested properties
      if (sortBy === 'market_cap' && a.market_cap) {
        aValue = a.market_cap.market_cap_usd || 0;
      }
      if (sortBy === 'market_cap' && b.market_cap) {
        bValue = b.market_cap.market_cap_usd || 0;
      }

          if (sortBy === 'change_1d') {
            aValue = a.changes?.['1d'] || 0;
            bValue = b.changes?.['1d'] || 0;
          }


      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedTokens.length / tokensPerPage);
  const startIndex = (currentPage - 1) * tokensPerPage;
  const endIndex = startIndex + tokensPerPage;
  
  // Get tokens for current page
  const paginatedTokens = showAll 
    ? filteredAndSortedTokens.slice(startIndex, endIndex)
    : filteredAndSortedTokens.slice(0, 10);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        
        {showAll && (
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-64"
            />
            <button className="btn-outline">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="cursor-pointer hover:text-primary-400" onClick={() => handleSort('rank')}>
                #
              </th>
              <th className="cursor-pointer hover:text-primary-400" onClick={() => handleSort('name')}>
                Name
              </th>
              <th className="cursor-pointer hover:text-primary-400" onClick={() => handleSort('price')}>
                Price
              </th>
              <th className="cursor-pointer hover:text-primary-400" onClick={() => handleSort('change_1d')}>
                24h %
              </th>
              <th className="cursor-pointer hover:text-primary-400" onClick={() => handleSort('market_cap')}>
                Market Cap
              </th>
              <th className="cursor-pointer hover:text-primary-400" onClick={() => handleSort('quote_volume_24h')}>
                Volume (24h)
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTokens.map((token, index) => (
              <motion.tr
                key={token.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-dark-750 transition-colors duration-200"
              >
                <td className="text-dark-400 font-medium">
                  {startIndex + index + 1}
                </td>
                <td>
                  <Link 
                    to={`/analysis/${token.symbol}`}
                    className="flex items-center space-x-3 hover:text-primary-400 transition-colors"
                  >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-dark-700">
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
                          className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold"
                          style={{ display: token.icon_url ? 'none' : 'flex' }}
                        >
                          {token.symbol?.charAt(0) || '?'}
                        </div>
                      </div>
                    <div>
                      <div className="font-semibold text-white">{token.symbol}</div>
                      <div className="text-sm text-dark-400">{token.name}</div>
                    </div>
                  </Link>
                </td>
                <td className="font-semibold text-white">
                  {formatPrice(token.price)}
                </td>
                <td>
                  <div className={`flex items-center space-x-1 font-medium ${getChangeColor(token.changes?.['1d'])}`}>
                    {getChangeIcon(token.changes?.['1d'])}
                    <span>
                      {token.changes?.['1d'] !== undefined && token.changes?.['1d'] !== null ? 
                        `${token.changes['1d'] >= 0 ? '+' : ''}${token.changes['1d'].toFixed(2)}%` : 
                        '--'
                      }
                    </span>
                  </div>
                </td>
                <td className="text-white">
                  {token.market_cap && token.market_cap.market_cap_usd > 0 ? formatMarketCap(token.market_cap.market_cap_usd) : '--'}
                </td>
                <td className="text-white">
                  {formatVolume(token.quote_volume_24h || token.volume_24h)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {showAll && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-dark-400">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedTokens.length)} of {filteredAndSortedTokens.length} tokens
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1 
                  ? 'bg-dark-700 text-dark-500 cursor-not-allowed' 
                  : 'bg-dark-700 text-white hover:bg-dark-600'
              }`}
            >
              Previous
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-white hover:bg-dark-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === totalPages 
                  ? 'bg-dark-700 text-dark-500 cursor-not-allowed' 
                  : 'bg-dark-700 text-white hover:bg-dark-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {!showAll && tokens.length > 10 && (
        <div className="mt-6 text-center">
          <Link 
            to="/analysis" 
            className="btn-primary inline-flex items-center space-x-2"
          >
            <span>View All Tokens</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default TokenTable;
