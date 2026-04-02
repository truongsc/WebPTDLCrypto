import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  AlertTriangle,
  Target,
  Search
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { fetchTokenDetail, fetchTokenChart, fetchTokenPrediction, fetchTokens } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CandlestickChart from '../components/charts/CandlestickChart';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const TokenAnalysis = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [chartType, setChartType] = useState('candlestick');
  const [period, setPeriod] = useState('90d');
  const [chartInterval, setChartInterval] = useState('1d');
  const [predictionDays, setPredictionDays] = useState(7);
  const [selectedModels, setSelectedModels] = useState(['statistical', 'machineLearning', 'deepLearning']);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const lineChartRef = useRef(null);
  const candlestickChartRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    // Ensure interval is compatible with selected period
    if (period === '7d' && chartInterval === '1w') {
      setChartInterval('1d');
    }
    if (period === '1d' && chartInterval === '1w') {
      setChartInterval('1d');
    }
  }, [period, chartInterval]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const zoomConfig = {
    pan: {
      enabled: true,
      mode: 'x'
    },
    zoom: {
      wheel: {
        enabled: true
      },
      pinch: {
        enabled: true
      },
      drag: {
        enabled: false
      },
      mode: 'x'
    },
    limits: {
      x: { min: 'original', max: 'original' },
      y: { min: 'original', max: 'original' }
    }
  };

  const handleResetZoom = () => {
    if (chartType === 'candlestick') {
      if (candlestickChartRef.current) {
        candlestickChartRef.current.resetZoom();
      }
    } else if (lineChartRef.current) {
      lineChartRef.current.resetZoom();
    }
  };

  // Fetch all tokens for search
  const { data: allTokens, isLoading: tokensLoading } = useQuery(
    'all-tokens',
    fetchTokens,
    {
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  // Filter tokens based on search term
  const filteredTokens = allTokens?.filter(token =>
    token.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Fetch token detail
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery(
    ['token-detail', symbol],
    () => fetchTokenDetail(symbol),
    {
      enabled: !!symbol,
      refetchInterval: 60000, // Refetch every minute
      retry: 1,
      onError: (error) => {
        console.error('Error fetching token detail:', error);
      }
    }
  );

  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery(
    ['token-chart', symbol, period, chartInterval],
    () => fetchTokenChart(symbol, period, chartInterval),
    {
      enabled: !!symbol,
      refetchInterval: 60000,
    }
  );

  // Fetch predictions
  const { data: predictionData, isLoading: predictionLoading } = useQuery(
    ['token-prediction', symbol, predictionDays],
    () => fetchTokenPrediction(symbol, predictionDays),
    {
      enabled: !!symbol,
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0.00';
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatChange = (change) => {
    if (change === null || change === undefined) return '--';
    const isPositive = change >= 0;
    return (
      <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
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

const formatMetaLabel = (key) => key
  .replace(/_/g, ' ')
  .replace(/([A-Z])/g, ' $1')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, char => char.toUpperCase());

  const formatMetaValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000) return value.toFixed(0);
    if (Math.abs(value) >= 100) return value.toFixed(2);
    return value.toFixed(4);
  }
  return value;
};

  // Handle token selection
  const handleTokenSelect = (selectedSymbol) => {
    navigate(`/analysis/${selectedSymbol}`);
    setSearchTerm('');
    setShowDropdown(false);
  };

  // If no symbol, show token selector FIRST (before any other checks)
  if (!symbol) {
    return (
      <div className="space-y-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-4"
        >
          <Link
            to="/"
            className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Token Analysis</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">Select a Token to Analyze</h2>
            <p className="text-dark-400">Search and select a cryptocurrency to view detailed analysis</p>
          </div>

          <div className="relative max-w-2xl mx-auto" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search by symbol or name (e.g., BTC, Bitcoin)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-12 pr-4 py-4 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {showDropdown && searchTerm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-50 w-full mt-2 bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-96 overflow-y-auto"
              >
                {filteredTokens.length > 0 ? (
                  filteredTokens.slice(0, 20).map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenSelect(token.symbol)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-dark-700 flex-shrink-0">
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
                          className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-sm"
                          style={{ display: token.icon_url ? 'none' : 'flex' }}
                        >
                          {token.symbol?.charAt(0) || '?'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{token.symbol}</div>
                        <div className="text-sm text-dark-400 truncate">{token.name}</div>
                      </div>
                      {token.price && (
                        <div className="text-right">
                          <div className="font-semibold text-white">
                            {token.price >= 1 ? `$${token.price.toFixed(2)}` : `$${token.price.toFixed(4)}`}
                          </div>
                          {token.changes?.['1d'] !== undefined && (
                            <div className={`text-sm ${token.changes['1d'] >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {token.changes['1d'] >= 0 ? '+' : ''}{token.changes['1d'].toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-dark-400">
                    No tokens found matching "{searchTerm}"
                  </div>
                )}
              </motion.div>
            )}

            {!searchTerm && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {allTokens?.slice(0, 12).map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleTokenSelect(token.symbol)}
                    className="card p-4 hover:bg-dark-700 transition-colors text-center"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-dark-700 mx-auto mb-2">
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
                    <div className="font-semibold text-white text-sm">{token.symbol}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const buildIndicatorSeries = (key) => {
    if (!chartData) return null;
    const series = chartData.map(item => {
      const value = item[key];
      if (value === null || value === undefined) return null;
      const num = typeof value === 'number' ? value : parseFloat(value);
      return Number.isFinite(num) ? num : null;
    });
    return series.every(value => value === null) ? null : series;
  };

  // Prepare chart data for Chart.js
  const prepareChartData = () => {
    if (!chartData || chartData.length === 0) return null;

    const labels = chartData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const volumeValues = chartData.map(item =>
      parseFloat(item.quote_volume ?? item.quoteVolume ?? item.volume ?? 0) || 0
    );
    const maxVolume = Math.max(...volumeValues) || 1;
    const normalizedVolumes = volumeValues.map(value => (value / maxVolume) * 100);

    if (chartType === 'line') {
      const datasets = [
        {
          label: 'Price (USD)',
          data: chartData.map(item => item.close),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          yAxisID: 'price'
        }
      ];

      const indicatorConfigs = [
        { key: 'sma_20', label: 'SMA (20)', color: 'rgba(248, 250, 252, 0.8)', dash: [6, 4] },
        { key: 'sma_50', label: 'SMA (50)', color: 'rgba(251, 191, 36, 0.9)', dash: [4, 4] },
        { key: 'ema_12', label: 'EMA (12)', color: 'rgba(34, 197, 94, 0.9)', dash: [] },
        { key: 'ema_26', label: 'EMA (26)', color: 'rgba(99, 102, 241, 0.9)', dash: [3, 3] }
      ];

      indicatorConfigs.forEach(config => {
        const series = buildIndicatorSeries(config.key);
        if (!series) return;
        datasets.push({
          label: config.label,
          data: series,
          borderColor: config.color,
          borderDash: config.dash,
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          spanGaps: true,
          yAxisID: 'price'
        });
      });

      const rsiConfigs = [
        { key: 'rsi_14', label: 'RSI (14)', color: 'rgb(248, 113, 113)' }
      ];

      rsiConfigs.forEach(config => {
        const series = buildIndicatorSeries(config.key);
        if (!series) return;
        datasets.push({
          label: config.label,
          data: series,
          borderColor: config.color,
          borderWidth: 1.5,
          borderDash: [5, 2],
          fill: false,
          pointRadius: 0,
          spanGaps: true,
          yAxisID: 'indicator'
        });
      });

      datasets.push({
        label: 'Volume',
        type: 'bar',
        data: chartData.map(item =>
          parseFloat(item.quote_volume ?? item.quoteVolume ?? item.volume ?? 0) || 0
        ),
        yAxisID: 'volume',
        backgroundColor: 'rgba(14,165,233,0.25)',
        borderWidth: 0,
        volumeValues: chartData.map(item =>
          parseFloat(item.quote_volume ?? item.quoteVolume ?? item.volume ?? 0) || 0
        )
      });

      return { labels, datasets };
    } else {
      // OHLC Chart using multiple datasets
      const openData = chartData.map(item => item.open);
      const highData = chartData.map(item => item.high);
      const lowData = chartData.map(item => item.low);
      const closeData = chartData.map(item => item.close);

      return {
        labels,
        datasets: [
          {
            label: 'High',
            data: highData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderWidth: 2,
            type: 'line',
            pointRadius: 0,
          },
          {
            label: 'Close',
            data: closeData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            borderWidth: 2,
            type: 'line',
            pointRadius: 0,
          },
          {
            label: 'Open',
            data: openData,
            borderColor: 'rgb(251, 146, 60)',
            backgroundColor: 'rgba(251, 146, 60, 0.2)',
            borderWidth: 2,
            type: 'line',
            pointRadius: 0,
          },
          {
            label: 'Low',
            data: lowData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderWidth: 2,
            type: 'line',
            pointRadius: 0,
          },
        ],
      };
    }
  };

  // Prepare prediction chart data with selected models
  const preparePredictionChartData = () => {
    if (!predictionData || !predictionData.predictions) return null;

    const { predictions, currentPrice } = predictionData;
    
    const modelConfigs = {
      statistical: { 
        label: 'Statistical',
        color: 'rgb(59, 130, 246)',
        data: predictions.statistical?.predictions || []
      },
      machineLearning: { 
        label: 'Machine Learning',
        color: 'rgb(34, 197, 94)',
        data: predictions.machineLearning?.predictions || []
      },
      deepLearning: { 
        label: 'Deep Learning',
        color: 'rgb(236, 72, 153)',
        data: predictions.deepLearning?.predictions || []
      }
    };

    // Get max days from all selected models
    if (selectedModels.length === 0) return null;

    const maxDays = Math.max(0, ...selectedModels.map(key => {
      const model = modelConfigs[key];
      return model.data.length > 0 ? Math.max(...model.data.map(p => p.day)) : 0;
    }));

    const baseDateSource =
      chartData?.[chartData.length - 1]?.date ||
      tokenData?.price_data?.[tokenData.price_data.length - 1]?.date ||
      new Date().toISOString();
    const baseDate = new Date(baseDateSource);

    const labels = Array.from({ length: maxDays + 1 }, (_, idx) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + idx);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Create datasets for each selected model
    const datasets = selectedModels.map((key, index) => {
      const config = modelConfigs[key];
      if (!config || config.data.length === 0) return null;
      
      const prices = [currentPrice];
      for (let day = 1; day <= maxDays; day++) {
        const prediction = config.data.find(p => p.day === day);
        prices.push(prediction ? prediction.price : null);
      }
      
      return {
        label: config.label,
        data: prices,
        borderColor: config.color,
        backgroundColor: config.color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        borderWidth: 2,
        borderDash: index > 0 ? [5, 5] : [],
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      };
    }).filter(Boolean);

    return {
      labels,
      datasets
    };
  };

  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            if (context.dataset.label === 'Volume' && context.dataset.volumeValues) {
              const rawVolume = context.dataset.volumeValues[context.dataIndex] || 0;
              return `Volume: ${formatVolume(rawVolume)}`;
            }
            if (context.dataset.label === 'Price (USD)') {
              return `Close: ${formatPrice(context.parsed.y)}`;
            }
            if (context.dataset.label?.startsWith('RSI')) {
              const value = context.parsed.y ?? context.parsed;
              return `${context.dataset.label}: ${value?.toFixed(2) || '0.00'}`;
            }
            return null;
          },
          labelColor: () => ({
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(0,0,0,0)'
          })
        }
      },
      zoom: zoomConfig
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45
        }
      },
      price: {
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return formatPrice(value);
          }
        },
        position: 'left',
        stack: 'combined',
        stackWeight: 3,
        border: {
          display: false
        }
      },
      volume: {
        position: 'right',
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: '#475569',
          callback: function(value) {
            return formatVolume(value);
          }
        }
      },
      indicator: {
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
          color: 'rgba(55, 65, 81, 0.12)',
        },
        ticks: {
          color: '#fbbf24',
          stepSize: 20
        },
        border: {
          display: true,
          color: 'rgba(55, 65, 81, 0.2)'
        }
      }
    }
  };

  const predictionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatPrice(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return formatPrice(value);
          }
        }
      }
    }
  };

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" text="Loading token data..." />
      </div>
    );
  }

  if (tokenError) {
    const errorMessage = tokenError?.response?.data?.error || 
                         tokenError?.message || 
                         'Failed to load token data';
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Token</h2>
          <p className="text-dark-400 mb-2">
            {errorMessage}
          </p>
          {symbol && (
            <p className="text-sm text-dark-500 mb-4">
              Token: {symbol.toUpperCase()}
            </p>
          )}
          <div className="flex items-center justify-center space-x-4">
            <Link 
              to="/analysis" 
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Select Another Token</span>
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenLoading && !tokenData && symbol) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">No Data Available</h2>
          <p className="text-dark-400 mb-4">
            Token data is not available at the moment.
          </p>
          <Link 
            to="/analysis" 
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Select Another Token</span>
          </Link>
        </div>
      </div>
    );
  }

  const chartDataForDisplay = prepareChartData();
  const predictionChartData = preparePredictionChartData();
  const recommendation = predictionData?.recommendation;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Link
            to="/analysis"
            className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div className="flex items-center space-x-4">
            {tokenData.token_info?.icon_url && (
              <img
                src={tokenData.token_info.icon_url}
                alt={tokenData.token_info.symbol}
                className="w-12 h-12 rounded-full"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">
                {tokenData.token_info?.name || symbol} ({symbol})
              </h1>
              <p className="text-2xl font-semibold text-primary-400">
                {formatPrice(tokenData.current_price)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">24h Change</div>
          <div className="text-xl font-semibold text-white">
            {formatChange(tokenData.changes?.['1d'])}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">7d Change</div>
          <div className="text-xl font-semibold text-white">
            {formatChange(tokenData.changes?.['7d'])}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">30d Change</div>
          <div className="text-xl font-semibold text-white">
            {formatChange(tokenData.changes?.['30d'])}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">Market Cap</div>
          <div className="text-xl font-semibold text-white">
            {formatMarketCap(tokenData.market_cap?.market_cap_usd || 0)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">Volume 24h</div>
          <div className="text-xl font-semibold text-white">
            {formatVolume(tokenData.volume_24h || tokenData.quote_volume_24h || 0)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-dark-400 mb-1">All Time High</div>
          <div className="text-xl font-semibold text-white">
            {formatPrice(tokenData.stats?.all_time_high || 0)}
          </div>
        </div>
      </motion.div>

      {/* Price Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary-400" />
            Price Chart
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'line'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'candlestick'
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                Candlestick
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {['7d', '30d', '90d', '1y'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-dark-400 hover:text-white'
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2 bg-dark-700 rounded-lg p-1">
                {['1d', '1w'].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setChartInterval(interval)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      chartInterval === interval
                        ? 'bg-primary-500 text-white'
                        : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    {interval.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={handleResetZoom}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-dark-700 hover:bg-dark-600 border border-dark-500 text-white transition-colors"
              >
                Reset Zoom
              </button>
            </div>
          </div>
        </div>
        <div className="h-96">
          {chartLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : chartDataForDisplay ? (
            chartType === 'candlestick' ? (
              <CandlestickChart
                ref={candlestickChartRef}
                data={chartData}
                period={period}
                interval={chartInterval}
                zoomOptions={zoomConfig}
              />
            ) : (
              <Line ref={lineChartRef} data={chartDataForDisplay} options={priceChartOptions} />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-dark-400">
              No chart data available
            </div>
          )}
        </div>
      </motion.div>

      {/* Technical Indicators */}
      {tokenData.indicators && tokenData.indicators.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary-400" />
            Technical Indicators
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tokenData.indicators[0] && (
              <>
                {tokenData.indicators[0].rsi_14 && (
                  <div className="p-4 bg-dark-700 rounded-lg">
                    <div className="text-sm text-dark-400 mb-1">RSI (14)</div>
                    <div className="text-xl font-semibold text-white">
                      {tokenData.indicators[0].rsi_14.toFixed(2)}
                    </div>
                  </div>
                )}
                {tokenData.indicators[0].macd && (
                  <div className="p-4 bg-dark-700 rounded-lg">
                    <div className="text-sm text-dark-400 mb-1">MACD</div>
                    <div className="text-xl font-semibold text-white">
                      {tokenData.indicators[0].macd.toFixed(4)}
                    </div>
                  </div>
                )}
                {tokenData.indicators[0].sma_20 && (
                  <div className="p-4 bg-dark-700 rounded-lg">
                    <div className="text-sm text-dark-400 mb-1">SMA (20)</div>
                    <div className="text-xl font-semibold text-white">
                      {formatPrice(tokenData.indicators[0].sma_20)}
                    </div>
                  </div>
                )}
                {tokenData.indicators[0].ema_12 && (
                  <div className="p-4 bg-dark-700 rounded-lg">
                    <div className="text-sm text-dark-400 mb-1">EMA (12)</div>
                    <div className="text-xl font-semibold text-white">
                      {formatPrice(tokenData.indicators[0].ema_12)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Price Prediction Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Target className="h-5 w-5 mr-2 text-primary-400" />
            Price Prediction
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-dark-400">Predict for:</span>
            <select
              value={predictionDays}
              onChange={(e) => setPredictionDays(parseInt(e.target.value))}
              className="bg-dark-700 text-white px-3 py-1 rounded-md text-sm border border-dark-600"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
        </div>

        {predictionLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner text="Generating predictions..." />
          </div>
        ) : predictionData?.error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {predictionData.error}
          </div>
        ) : predictionData?.predictions ? (
          <div className="space-y-6">
            {/* Prediction Chart */}
            {predictionChartData && (
              <div className="h-64">
                <Line data={predictionChartData} options={predictionChartOptions} />
              </div>
            )}

            {/* Model Selection */}
            <div className="p-4 bg-dark-700 rounded-lg">
              <div className="text-sm font-medium text-white mb-3">Select Models to Compare:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'statistical', label: 'Statistical' },
                  { key: 'machineLearning', label: 'Machine Learning' },
                  { key: 'deepLearning', label: 'Deep Learning' }
                ].map(model => {
                  const isSelected = selectedModels.includes(model.key);
                  const modelData = predictionData.predictions[model.key];
                  return (
                    <label
                      key={model.key}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-500/20 border border-primary-500'
                          : 'bg-dark-600 border border-dark-600 hover:bg-dark-600/80'
                      } ${!modelData ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModels([...selectedModels, model.key]);
                          } else {
                            setSelectedModels(selectedModels.filter(m => m !== model.key));
                          }
                        }}
                        disabled={!modelData}
                        className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-white">{model.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Prediction Methods with Validation Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(predictionData.predictions).map(([key, model]) => {
                if (!model || !model.predictions || model.predictions.length === 0) return null;
                
                const validation = predictionData.validation?.[key];
                const firstPrediction = model.predictions[0];
                
                return (
                  <div key={key} className="p-4 bg-dark-700 rounded-lg border border-dark-600">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-dark-400">{model.category}</div>
                        <div className="text-sm font-medium text-white">{model.method}</div>
                      </div>
                      {selectedModels.includes(key) && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-white mb-3">
                      {formatPrice(firstPrediction?.price)}
                    </div>
                    <div className="space-y-2 text-xs text-dark-400">
                      <div>
                        Confidence:{' '}
                        <span className="text-white">
                          {firstPrediction?.confidence !== undefined ? `${firstPrediction.confidence.toFixed(0)}%` : 'N/A'}
                        </span>
                      </div>
                      {model.metadata && (
                        <div className="pt-2 border-t border-dark-600 space-y-1">
                          <div className="font-medium text-white">Model Stats:</div>
                          {Object.entries(model.metadata)
                            .filter(
                              ([metaKey]) =>
                                metaKey !== 'indicators' && metaKey !== 'maxDeviation'
                            )
                            .map(([metaKey, metaValue]) => (
                              <div key={metaKey}>
                                {formatMetaLabel(metaKey)}:{' '}
                                <span className="text-white">
                                  {formatMetaValue(metaValue)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                      {validation && (
                        <div className="pt-2 border-t border-dark-600 space-y-1">
                          <div className="font-medium text-white">Validation:</div>
                          <div>Accuracy: <span className="text-green-400">{validation.accuracy}%</span></div>
                          <div>MAE: <span className="text-white">{validation.mae}</span></div>
                          <div>RMSE: <span className="text-white">{validation.rmse}</span></div>
                          <div>MAPE: <span className="text-white">{validation.mape}%</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Investment Recommendation */}
            {recommendation && (
              <div
                className={`p-6 rounded-lg border-2 ${
                  recommendation.action === 'BUY'
                    ? 'bg-green-500/10 border-green-500/30'
                    : recommendation.action === 'SELL'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Khuyến nghị đầu tư:{' '}
                      <span className="text-primary-300">
                        {recommendation.action_vi || recommendation.action}
                      </span>
                    </h3>
                    <p className="text-xs text-dark-400">
                      (Action: {recommendation.action} - Time horizon:{' '}
                      {recommendation.timeHorizon_vi || recommendation.timeHorizon})
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-dark-300">
                      <span>
                        Độ tin cậy:{' '}
                        <span className="text-white">
                          {recommendation.confidence
                            ? `${recommendation.confidence.toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </span>
                      <span>
                        Mức rủi ro:{' '}
                        <span className="text-white">
                          {recommendation.riskLevel_vi || recommendation.riskLevel}
                        </span>
                      </span>
                      {recommendation.predictedChange !== undefined && (
                        <span
                          className={
                            recommendation.predictedChange >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          Dự kiến thay đổi:{' '}
                          {recommendation.predictedChange >= 0 ? '+' : ''}
                          {recommendation.predictedChange.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {recommendation.action === 'BUY' && (
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  )}
                  {recommendation.action === 'SELL' && (
                    <TrendingDown className="h-6 w-6 text-red-400" />
                  )}
                  {recommendation.action === 'HOLD' && (
                    <Activity className="h-6 w-6 text-yellow-400" />
                  )}
                </div>

                {/* Tóm tắt tiếng Việt */}
                {recommendation.summary_vi && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-white mb-1">
                      Tóm tắt nhận định:
                    </div>
                    <p className="text-sm text-dark-200 leading-relaxed">
                      {recommendation.summary_vi}
                    </p>
                  </div>
                )}

                {/* Chi tiết phân tích tiếng Việt */}
                {recommendation.details_vi && recommendation.details_vi.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="text-sm font-medium text-white">
                      Phân tích chi tiết (tổng hợp tín hiệu):
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-dark-300">
                      {recommendation.details_vi.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Phân tích riêng từng mô hình */}
                {recommendation.models && recommendation.models.length > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-dark-600">
                    <div className="text-sm font-medium text-white">
                      Đánh giá riêng từng mô hình dự báo:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {recommendation.models.map((m) => (
                        <div
                          key={m.key}
                          className="bg-dark-700/80 rounded-lg p-3 border border-dark-500"
                        >
                          <div className="text-[11px] uppercase tracking-wide text-dark-400 mb-1">
                            {m.name}
                          </div>
                          <div className="text-sm mb-1">
                            Hành động: <span className="text-primary-300">{m.action_vi}</span>
                          </div>
                          <div className="text-sm">
                            Dự kiến ngày đầu:{" "}
                            <span
                              className={
                                m.change >= 0 ? "text-green-400 font-medium" : "text-red-400 font-medium"
                              }
                            >
                              {m.change >= 0 ? "+" : ""}
                              {m.change.toFixed(2)}%
                            </span>{" "}
                            so với giá hiện tại.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Giá dự báo */}
                {recommendation.predictedPrice && (
                  <div className="mt-4 pt-4 border-t border-dark-600">
                    <div className="text-sm text-dark-400">
                      Giá dự báo trung bình ({recommendation.timeHorizon_vi ||
                      recommendation.timeHorizon}):
                    </div>
                    <div className="text-xl font-semibold text-white">
                      {formatPrice(recommendation.predictedPrice)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-dark-400">
            No prediction data available
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TokenAnalysis;
