import React from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { fetchMarketOverview, fetchTokens, fetchFearGreedIndex, fetchMarketTrends, fetchDominance } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import MarketSummaryCard from '../components/MarketSummaryCard';
import FearGreedChart from '../components/charts/FearGreedChart';
import MarketCapChart from '../components/charts/MarketCapChart';
import VolumeChart from '../components/charts/VolumeChart';
import MarketDominanceChart from '../components/charts/MarketDominanceChart';

const MarketIndicators = () => {
  const { data: marketData, isLoading: marketLoading, error: marketError } = useQuery(
    'market-overview',
    fetchMarketOverview,
    { refetchInterval: 300000 }
  );

  const { data: tokensData, isLoading: tokensLoading, error: tokensError } = useQuery(
    'tokens',
    fetchTokens,
    { refetchInterval: 300000 }
  );

  const { data: fearGreedData, isLoading: fearGreedLoading } = useQuery(
    'fear-greed-index',
    () => fetchFearGreedIndex('30d'),
    { refetchInterval: 300000 }
  );

  const { data: marketTrendsData, isLoading: trendsLoading } = useQuery(
    'market-trends-90d',
    () => fetchMarketTrends('90d'),
    { refetchInterval: 300000 }
  );

  const { data: dominanceData, isLoading: dominanceLoading } = useQuery(
    'market-dominance',
    () => fetchDominance(),
    { refetchInterval: 300000 }
  );

  if (marketLoading || tokensLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" text="Loading market indicators..." />
      </div>
    );
  }

  if (marketError || tokensError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Indicators</h2>
          <p className="text-dark-400">
            {marketError?.message || tokensError?.message || 'Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Market Indicators</h1>
        <p className="text-dark-400 text-lg">
          Macro analytics, sentiment, dominance, and sector flows in one place.
        </p>
      </motion.div>

      {marketData?.market_summary && (
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <MarketSummaryCard summary={marketData.market_summary} />
        </motion.div>
      )}

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FearGreedChart data={fearGreedData?.data || []} isLoading={fearGreedLoading} />
          <MarketCapChart data={marketTrendsData?.market_cap_trend || []} isLoading={trendsLoading} />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <VolumeChart data={tokensData || []} isLoading={tokensLoading} />
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <MarketDominanceChart 
          dominanceData={dominanceData?.data || marketData?.market_dominance || []} 
          isLoading={dominanceLoading || marketLoading}
          tokensData={tokensData || []}
        />
      </motion.div>
    </div>
  );
};

export default MarketIndicators;
