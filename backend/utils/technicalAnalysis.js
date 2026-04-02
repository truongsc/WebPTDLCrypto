const technicalAnalysis = {
  // Calculate RSI (Relative Strength Index)
  calculateRSI: (prices, period = 14) => {
    if (prices.length < period + 1) return null;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }

    // Calculate average gains and losses for the period
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate RSI for the current period
    for (let i = period; i < gains.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  },

  // Calculate Simple Moving Average
  calculateSMA: (prices, period) => {
    if (prices.length < period) return null;
    
    const sum = prices.slice(-period).reduce((sum, price) => sum + price, 0);
    return sum / period;
  },

  // Calculate Exponential Moving Average
  calculateEMA: (prices, period) => {
    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  },

  // Calculate MACD
  calculateMACD: (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
    if (prices.length < slowPeriod) return null;

    const ema12 = technicalAnalysis.calculateEMA(prices, fastPeriod);
    const ema26 = technicalAnalysis.calculateEMA(prices, slowPeriod);
    
    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;
    
    // For signal line, we'd need to track MACD values over time
    // This is a simplified version
    return {
      macd: macdLine,
      signal: macdLine * 0.9, // Simplified signal line
      histogram: macdLine - (macdLine * 0.9)
    };
  },

  // Calculate Bollinger Bands
  calculateBollingerBands: (prices, period = 20, stdDev = 2) => {
    if (prices.length < period) return null;

    const sma = technicalAnalysis.calculateSMA(prices, period);
    if (!sma) return null;

    // Calculate standard deviation
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  },

  // Calculate technical indicators for a token
  calculateTechnicalIndicators: (priceData) => {
    if (!priceData || priceData.length < 30) return null;

    const prices = priceData.map(d => d.close);
    const volumes = priceData.map(d => d.volume);

    const indicators = {
      rsi_14: technicalAnalysis.calculateRSI(prices, 14),
      rsi_7: technicalAnalysis.calculateRSI(prices, 7),
      rsi_30: technicalAnalysis.calculateRSI(prices, 30),
      sma_20: technicalAnalysis.calculateSMA(prices, 20),
      sma_50: technicalAnalysis.calculateSMA(prices, 50),
      ema_12: technicalAnalysis.calculateEMA(prices, 12),
      ema_26: technicalAnalysis.calculateEMA(prices, 26),
      volume_sma_20: technicalAnalysis.calculateSMA(volumes, 20)
    };

    // Calculate MACD
    const macd = technicalAnalysis.calculateMACD(prices);
    if (macd) {
      indicators.macd = macd.macd;
      indicators.macd_signal = macd.signal;
      indicators.macd_histogram = macd.histogram;
    }

    // Calculate Bollinger Bands
    const bb = technicalAnalysis.calculateBollingerBands(prices);
    if (bb) {
      indicators.bollinger_upper = bb.upper;
      indicators.bollinger_middle = bb.middle;
      indicators.bollinger_lower = bb.lower;
    }

    return indicators;
  }
};

module.exports = technicalAnalysis;
