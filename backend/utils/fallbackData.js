// Fallback data generators for when APIs are rate limited

function generateMockMarketCapTrend(days = 7) {
  const data = [];
  const today = new Date();
  const baseValue = 2100000000000; // $2.1T
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate market cap with some volatility
    const volatility = (Math.random() - 0.5) * 0.1; // ±5% daily volatility
    const trend = 1 + (i * 0.005); // Slight upward trend
    const marketCap = baseValue * trend * (1 + volatility);
    
    data.push({
      date: date.toISOString().split('T')[0],
      total_market_cap: marketCap,
      token_count: 8500 + Math.floor(Math.random() * 100)
    });
  }
  
  return data;
}

function generateMockDominanceData() {
  // Your actual 50 tokens from data.py
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'TRX', name: 'TRON' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'SUI', name: 'Sui' },
    { symbol: 'BCH', name: 'Bitcoin Cash' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'SHIB', name: 'Shiba Inu' },
    { symbol: 'TON', name: 'Toncoin' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'MNT', name: 'Mantle' },
    { symbol: 'XMR', name: 'Monero' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'NEAR', name: 'NEAR Protocol' },
    { symbol: 'PEPE', name: 'Pepe' },
    { symbol: 'APT', name: 'Aptos' },
    { symbol: 'ICP', name: 'Internet Computer' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'OP', name: 'Optimism' },
    { symbol: 'INJ', name: 'Injective' },
    { symbol: 'HBAR', name: 'Hedera' },
    { symbol: 'STX', name: 'Stacks' },
    { symbol: 'VET', name: 'VeChain' },
    { symbol: 'FIL', name: 'Filecoin' },
    { symbol: 'MKR', name: 'Maker' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'GRT', name: 'The Graph' },
    { symbol: 'AXS', name: 'Axie Infinity' },
    { symbol: 'LDO', name: 'Lido DAO' },
    { symbol: 'QNT', name: 'Quant' },
    { symbol: 'EOS', name: 'EOS' },
    { symbol: 'XTZ', name: 'Tezos' },
    { symbol: 'KSM', name: 'Kusama' },
    { symbol: 'THETA', name: 'Theta Network' },
    { symbol: 'BSV', name: 'Bitcoin SV' },
    { symbol: 'DASH', name: 'Dash' },
    { symbol: 'ZEC', name: 'Zcash' },
    { symbol: 'XEM', name: 'NEM' },
    { symbol: 'IOTA', name: 'IOTA' },
    { symbol: 'WAVES', name: 'Waves' },
    { symbol: 'ALGO', name: 'Algorand' },
    { symbol: 'XLM', name: 'Stellar' },
    { symbol: 'NEO', name: 'NEO' },
    { symbol: 'ETC', name: 'Ethereum Classic' }
  ];
  
  // Generate realistic dominance percentages
  const btcDominance = 42 + Math.random() * 6; // 42-48%
  const ethDominance = 18 + Math.random() * 4; // 18-22%
  const remaining = 100 - btcDominance - ethDominance;
  
  const data = [
    { 
      symbol: 'BTC', 
      name: 'Bitcoin',
      market_cap_usd: btcDominance * 1e11,
      dominance_percent: btcDominance 
    },
    { 
      symbol: 'ETH', 
      name: 'Ethereum',
      market_cap_usd: ethDominance * 1e11,
      dominance_percent: ethDominance 
    }
  ];
  
  // Distribute remaining percentage among other tokens
  let remainingPercent = remaining;
  for (let i = 2; i < tokens.length && remainingPercent > 0; i++) {
    const percent = Math.min(remainingPercent, 2 + Math.random() * 3); // 2-5% each
    data.push({
      symbol: tokens[i].symbol,
      name: tokens[i].name,
      market_cap_usd: percent * 1e10,
      dominance_percent: percent
    });
    remainingPercent -= percent;
  }
  
  return data.sort((a, b) => b.dominance_percent - a.dominance_percent);
}

function generateMockMarketOverview() {
  const totalMarketCap = 2100000000000; // $2.1T
  const change24h = (Math.random() - 0.5) * 10; // ±5% daily change
  
  return {
    total_market_cap: totalMarketCap,
    market_cap_change_24h: change24h,
    total_volume_24h: totalMarketCap * 0.1, // ~10% of market cap
    active_cryptocurrencies: 8500,
    markets: 800,
    market_cap_percentage: {
      btc: 42.5,
      eth: 18.2
    },
    dominance_data: [
      {
        symbol: 'BTC',
        dominance_percent: 42.5
      },
      {
        symbol: 'ETH', 
        dominance_percent: 18.2
      }
    ]
  };
}

module.exports = {
  generateMockMarketCapTrend,
  generateMockDominanceData,
  generateMockMarketOverview
};
