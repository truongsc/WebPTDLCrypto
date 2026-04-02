// Mock data for development and testing
import { getFearGreedClassification } from './fearGreedHelper';

export const generateMockFearGreedData = (days = 7) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate realistic FGI values with some randomness
    let value = 45 + Math.random() * 20; // 45-65 range
    value += (Math.random() - 0.5) * 10; // Add some volatility
    
    value = Math.max(0, Math.min(100, value)); // Clamp between 0-100
    
    // Use helper function for consistent classification
    const classification = getFearGreedClassification(value);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
      classification
    });
  }
  
  return data;
};

export const generateMockMarketCapData = (days = 7) => {
  const data = [];
  const today = new Date();
  const baseValue = 2.1e12; // $2.1T base market cap
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate market cap with some growth trend and volatility
    const trendFactor = 1 + (i * 0.01); // Slight upward trend
    const volatility = (Math.random() - 0.5) * 0.1; // ±5% daily volatility
    const marketCap = baseValue * trendFactor * (1 + volatility);
    
    data.push({
      date: date.toISOString().split('T')[0],
      total_market_cap: marketCap,
      token_count: 15 + Math.floor(Math.random() * 5)
    });
  }
  
  return data;
};

export const generateMockDominanceData = () => {
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' }
  ];
  
  // Generate realistic dominance percentages
  const btcDominance = 42 + Math.random() * 8; // 42-50%
  const ethDominance = 18 + Math.random() * 4; // 18-22%
  const remaining = 100 - btcDominance - ethDominance;
  
  const data = [
    { 
      symbol: 'BTC', 
      market_cap_usd: btcDominance * 1e11, // Rough estimate
      dominance_percent: btcDominance 
    },
    { 
      symbol: 'ETH', 
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
      market_cap_usd: percent * 1e10,
      dominance_percent: percent
    });
    remainingPercent -= percent;
  }
  
  return data.sort((a, b) => b.dominance_percent - a.dominance_percent);
};

export const generateMockVolumeData = () => {
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' }
  ];
  
  return tokens.map(token => ({
    symbol: token.symbol,
    name: token.name,
    price: 1000 + Math.random() * 50000, // Random price
    quote_volume_24h: (1e6 + Math.random() * 9e8), // 1M to 1B volume
    volume_24h: (1e5 + Math.random() * 9e5), // 100K to 1M volume
    icon_url: `https://cryptologos.cc/logos/${token.symbol.toLowerCase()}-${token.symbol.toLowerCase()}-logo.png`
  })).sort((a, b) => (b.quote_volume_24h || 0) - (a.quote_volume_24h || 0));
};

export const generateMockTokenData = () => {
  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'LTC', name: 'Litecoin' },
    { symbol: 'BCH', name: 'Bitcoin Cash' },
    { symbol: 'XLM', name: 'Stellar' },
    { symbol: 'ATOM', name: 'Cosmos' }
  ];
  
  return tokens.map(token => {
    const basePrice = token.symbol === 'BTC' ? 45000 : 
                     token.symbol === 'ETH' ? 3000 :
                     token.symbol === 'BNB' ? 300 :
                     token.symbol === 'SOL' ? 100 :
                     token.symbol === 'XRP' ? 0.5 :
                     10 + Math.random() * 100;
    
    const change1d = (Math.random() - 0.5) * 20; // ±10% daily change
    const change7d = (Math.random() - 0.5) * 40; // ±20% weekly change
    
    return {
      symbol: token.symbol,
      name: token.name,
      price: basePrice + (basePrice * (Math.random() - 0.5) * 0.2),
      changes: {
        change_1d: change1d,
        change_7d: change7d,
        change_30d: (Math.random() - 0.5) * 60
      },
      volume_24h: (1e5 + Math.random() * 9e5),
      quote_volume_24h: (1e6 + Math.random() * 9e8),
      icon_url: `https://cryptologos.cc/logos/${token.symbol.toLowerCase()}-${token.symbol.toLowerCase()}-logo.png`,
      market_cap: {
        market_cap_usd: basePrice * (1e6 + Math.random() * 9e6)
      }
    };
  }).sort((a, b) => (b.quote_volume_24h || 0) - (a.quote_volume_24h || 0));
};
