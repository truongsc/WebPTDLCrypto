import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3,
  Activity,
  AlertTriangle
} from 'lucide-react';

import { fetchMarketOverview, fetchTokens } from '../services/api';
import { normalizeFearGreedClassification } from '../utils/fearGreedHelper';
import LoadingSpinner from '../components/LoadingSpinner';
import MarketOverviewCard from '../components/MarketOverviewCard';
import TokenTable from '../components/TokenTable';
import TopGainersLosers from '../components/TopGainersLosers';
import MarketHeatmap from '../components/MarketHeatmap';

const Home = () => {
  const navigate = useNavigate();
  const { data: marketData, isLoading: marketLoading, error: marketError } = useQuery(
    'market-overview',
    fetchMarketOverview,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: tokensData, isLoading: tokensLoading, error: tokensError } = useQuery(
    'tokens',
    fetchTokens,
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  // Chỉ giữ các token có dữ liệu giá trong ngày hôm nay (theo timestamp từ backend)
  const todayTokens = (tokensData || []).filter((token) => {
    if (!token.timestamp) return false;
    const ts = new Date(token.timestamp);
    const now = new Date();
    return (
      ts.getFullYear() === now.getFullYear() &&
      ts.getMonth() === now.getMonth() &&
      ts.getDate() === now.getDate()
    );
  });

  if (marketLoading || tokensLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" text="Loading market data..." />
      </div>
    );
  }

  if (marketError || tokensError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Data</h2>
          <p className="text-dark-400">
            {marketError?.message || tokensError?.message || 'Failed to load market data'}
          </p>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-4xl font-bold gradient-text mb-4">
          Crypto Market Dashboard
        </h1>
        <p className="text-dark-400 text-lg">
          Real-time cryptocurrency analysis and insights
        </p>
      </motion.div>

      {/* Market Overview Cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MarketOverviewCard
            title="Total Market Cap"
            value={marketData?.market_cap?.total}
            format="currency"
            icon={<DollarSign className="h-6 w-6" />}
            trend={null}
            onClick={() => navigate('/indicators')}
          />
          
          <MarketOverviewCard
            title="Fear & Greed Index"
            value={marketData?.fear_greed_index?.value}
            format="number"
            icon={<Activity className="h-6 w-6" />}
            trend={normalizeFearGreedClassification(
              marketData?.fear_greed_index?.value,
              marketData?.fear_greed_index?.classification
            )}
            color={
              marketData?.fear_greed_index?.value > 60 ? 'green' :
              marketData?.fear_greed_index?.value < 40 ? 'red' : 'yellow'
            }
            onClick={() => navigate('/indicators')}
          />
          
          <MarketOverviewCard
            title="Market RSI"
            value={marketData?.market_rsi?.average}
            format="decimal"
            icon={<BarChart3 className="h-6 w-6" />}
            trend={
              marketData?.market_rsi?.average > 70 ? 'Overbought' :
              marketData?.market_rsi?.average < 30 ? 'Oversold' : 'Neutral'
            }
            color={
              marketData?.market_rsi?.average > 70 ? 'red' :
              marketData?.market_rsi?.average < 30 ? 'green' : 'blue'
            }
            onClick={() => navigate('/indicators')}
          />
          
          <MarketOverviewCard
            title="Active Tokens"
            value={marketData?.market_cap?.token_count}
            format="number"
            icon={<TrendingUp className="h-6 w-6" />}
            trend="Tracking"
            onClick={() => navigate('/indicators')}
          />
        </div>
      </motion.div>

      {/* Market Heatmap */}
      <motion.div variants={itemVariants}>
        <MarketHeatmap tokens={todayTokens} isLoading={tokensLoading} />
      </motion.div>

      {/* Top Gainers & Losers */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopGainersLosers
            title="Top Gainers (24h)"
            data={marketData?.top_gainers || []}
            type="gainers"
          />
          <TopGainersLosers
            title="Top Losers (24h)"
            data={marketData?.top_losers || []}
            type="losers"
          />
        </div>
      </motion.div>

      {/* Token Table */}
      <motion.div variants={itemVariants} id="all-cryptocurrencies">
        <TokenTable 
          tokens={todayTokens.filter(token => 
            token.symbol !== 'MKR' && 
            token.symbol !== 'XEM' && 
            token.symbol !== 'STX'
          )} 
          title="All Cryptocurrencies"
          showAll={true}
        />
      </motion.div>

      {/* CTA */}
      <motion.div variants={itemVariants}>
        <div className="card text-center p-6">
          <h3 className="text-xl font-semibold text-white mb-2">Need more insights?</h3>
          <p className="text-dark-400 mb-4">Explore full market indicators for macro trends and detailed analytics.</p>
          <button
            onClick={() => navigate('/indicators')}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            View Market Indicators
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Home;
