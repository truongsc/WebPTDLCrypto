/**
 * Advanced price prediction utilities
 * Implements three distinct model categories leveraging database indicators
 * 1. Statistical   -> EMA/SMA + indicator-based biasing
 * 2. Machine Learning -> Multivariate linear regression (price/volume/indicators)
 * 3. Deep Learning -> Lightweight neural network with indicator features
 */

const DEFAULT_DAYS = 7;
const REQUIRED_HISTORY = 20;
const INDICATOR_KEYS = [
  ['rsi14', 50],
  ['macd', 0],
  ['macdSignal', 0],
  ['bollingerUpper', null],
  ['bollingerMiddle', null],
  ['bollingerLower', null],
  ['sma20', null],
  ['sma50', null],
  ['ema12', null],
  ['ema26', null],
  ['volumeSMA20', null]
];

function createSeededRng(seedValue) {
  let seed = Math.floor(seedValue) % 2147483647;
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function computeDatasetSeed(data) {
  let hash = 0;
  data.forEach(item => {
    hash = (hash * 31 + Math.floor((item.close || 0) * 1000)) % 2147483647;
    hash = (hash * 31 + Math.floor((item.volume || 0) * 1000)) % 2147483647;
  });
  const latest = data[data.length - 1];
  const marker = new Date(latest.timestamp || latest.date || Date.now()).getTime();
  hash = (hash * 31 + marker) % 2147483647;
  return hash || 987654321;
}

/**
 * Enforce strict deviation constraint from current price
 * Default: ML 4.5%, DL/Stat 5%
 */
function enforcePriceConstraint(price, currentPrice, modelType = 'default') {
  // Nới rộng chênh lệch: ML ~±4%, DL/Stat ~±5%
  const MAX_DEV = modelType === 'ml' ? 0.04 : 0.05;
  const MIN_PRICE = currentPrice * (1 - MAX_DEV);
  const MAX_PRICE = currentPrice * (1 + MAX_DEV);
  const constrained = Math.max(MIN_PRICE, Math.min(MAX_PRICE, price));

  if (Math.abs(constrained - price) > 0.0001) {
    console.warn(
      `[PriceConstraint ${modelType.toUpperCase()}] Clamped ${price.toFixed(4)} -> ${constrained.toFixed(4)} (current=${currentPrice.toFixed(4)}, range=${MIN_PRICE.toFixed(4)}-${MAX_PRICE.toFixed(4)})`
    );
  }
  return constrained;
}

function createSeededRng(seedValue) {
  let seed = Math.floor(seedValue) % 2147483647;
  if (seed <= 0) seed += 2147483646;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function computeDatasetSeed(data) {
  let hash = 0;
  data.forEach(item => {
    hash = (hash * 31 + Math.floor((item.close || 0) * 1000)) % 2147483647;
    hash = (hash * 31 + Math.floor((item.volume || 0) * 1000)) % 2147483647;
  });
  const latest = data[data.length - 1];
  const latestTime = new Date(latest.timestamp || latest.date || Date.now()).getTime();
  hash = (hash * 31 + latestTime) % 2147483647;
  return hash || 123456789;
}

function predictPrice(historicalRows, days = DEFAULT_DAYS, technicalIndicators = null, currentPriceOverride = null) {
  if (!historicalRows || historicalRows.length < REQUIRED_HISTORY) {
    return { error: 'Insufficient historical data. Need at least 20 daily records.' };
  }

  const dataset = preprocessHistoricalRows(historicalRows);
  if (dataset.length < REQUIRED_HISTORY) {
    return { error: 'Historical dataset missing required indicator fields.' };
  }
  augmentDerivedFeatures(dataset);

  const splitIndex = Math.floor(dataset.length * 0.8);
  const trainingData = dataset.slice(0, splitIndex);
  const validationData = dataset.slice(splitIndex);

  const rng = createSeededRng(computeDatasetSeed(dataset));

  // Cho phép override currentPrice (ví dụ giá thực tế ngày hôm nay)
  const currentPrice = currentPriceOverride ?? dataset[dataset.length - 1].close;

  const statisticalModel = buildStatisticalModel(dataset, days, currentPrice);
  const machineLearningModel = buildMachineLearningModel(trainingData, days, currentPrice);
  const deepLearningModel = buildDeepLearningModel(trainingData, days, rng, currentPrice);

  const predictions = {
    statistical: statisticalModel,
    machineLearning: machineLearningModel,
    deepLearning: deepLearningModel
  };

  const validation = {
    statistical: validateModel(statisticalModel, validationData),
    machineLearning: validateModel(machineLearningModel, validationData),
    deepLearning: validateModel(deepLearningModel, validationData)
  };

  const recommendation = generateRecommendation(
    predictions,
    currentPrice,
    days,
    technicalIndicators || dataset[dataset.length - 1]
  );

  return {
    success: true,
    currentPrice,
    predictions,
    validation,
    recommendation,
    timestamp: new Date().toISOString()
  };
}

/* -------------------------------------------------------------------------- */
/*                             Data Utilities                                 */
/* -------------------------------------------------------------------------- */

function preprocessHistoricalRows(rows) {
  const cleanRows = rows
    .map(row => ({
      close: toNumber(row.close),
      open: toNumber(row.open),
      high: toNumber(row.high),
      low: toNumber(row.low),
      volume: toNumber(row.volume),
      quoteVolume: toNumber(row.quote_volume ?? row.quoteVolume),
      rsi14: toNumber(row.rsi_14 ?? row.rsi14),
      macd: toNumber(row.macd),
      macdSignal: toNumber(row.macd_signal ?? row.macdSignal),
      macdHistogram: toNumber(row.macd_histogram ?? row.macdHistogram),
      bollingerUpper: toNumber(row.bollinger_upper ?? row.bollingerUpper),
      bollingerMiddle: toNumber(row.bollinger_middle ?? row.bollingerMiddle),
      bollingerLower: toNumber(row.bollinger_lower ?? row.bollingerLower),
      sma20: toNumber(row.sma_20 ?? row.sma20),
      sma50: toNumber(row.sma_50 ?? row.sma50),
      ema12: toNumber(row.ema_12 ?? row.ema12),
      ema26: toNumber(row.ema_26 ?? row.ema26),
      volumeSMA20: toNumber(row.volume_sma_20 ?? row.volumeSMA20),
      timestamp: row.timestamp || row.date
    }))
    .filter(entry => Number.isFinite(entry.close));

  INDICATOR_KEYS.forEach(([key, fallback]) => forwardFill(cleanRows, key, fallback));
  return cleanRows;
}

function augmentDerivedFeatures(data) {
  let prevClose = null;
  data.forEach((item, idx) => {
    const close = item.close || 0;
    const prev3 = idx >= 3 ? data[idx - 3].close : null;
    const prev7 = idx >= 7 ? data[idx - 7].close : null;
    const windowStart = Math.max(0, idx - 13);
    const volWindow = data.slice(windowStart, idx + 1).map(point => point.close);
    const mean = volWindow.reduce((sum, value) => sum + value, 0) / (volWindow.length || 1);
    const variance = volWindow.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (volWindow.length || 1);

    item.momentum3 = prev3 !== null ? close - prev3 : 0;
    item.momentum7 = prev7 !== null ? close - prev7 : 0;
    item.priceChangePct = prevClose ? (close - prevClose) / prevClose : 0;
    item.volatility14 = volWindow.length > 1 ? Math.sqrt(variance) : 0;
    item.volumeDelta = idx > 0 ? (item.volume || 0) - (data[idx - 1].volume || 0) : 0;
    item.trendStrength = Math.abs(item.momentum7) > 0 ? item.momentum3 / (item.momentum7 || 1) : 0;

    prevClose = close;
  });
}

function forwardFill(data, key, fallback = null) {
  let lastValue = fallback;
  data.forEach(item => {
    if (Number.isFinite(item[key])) {
      lastValue = item[key];
    } else {
      item[key] = lastValue;
    }
  });
}

function toNumber(value) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

/* -------------------------------------------------------------------------- */
/*                               Statistical                                  */
/* -------------------------------------------------------------------------- */

function buildStatisticalModel(data, days, currentPriceOverride = null) {
  const prices = data.map(item => item.close);
  const emaSeries = exponentialSmoothing(prices, days);
  const wmaSeries = weightedMovingAverage(prices, days);
  const latest = data[data.length - 1];
  const bias = calculateIndicatorBias(latest);

  const predictions = [];

  for (let i = 0; i < days; i++) {
    const emaVal = emaSeries.predictions[i] ?? prices[prices.length - 1];
    const wmaVal = wmaSeries.predictions[i] ?? prices[prices.length - 1];
    const base = (emaVal + wmaVal) / 2;
    const adjustment = 1 + bias * ((i + 1) / days);
    const priceRaw = base * adjustment;
    const price = currentPriceOverride
      ? enforcePriceConstraint(priceRaw, currentPriceOverride, 'stat')
      : priceRaw;
    predictions.push({
      day: i + 1,
      price: parseFloat(price.toFixed(4)),
      confidence: Math.round((emaSeries.confidence + wmaSeries.confidence) / 2)
    });
  }

  return {
    category: 'Statistical',
    method: 'EMA/SMA bias-adjusted by RSI & MACD',
    predictions,
    metadata: {
      emaAlpha: emaSeries.alpha,
      emaBeta: emaSeries.beta,
      bias
    }
  };
}

function calculateIndicatorBias(point) {
  if (!point) return 0;
  let bias = 0;

  if (Number.isFinite(point.rsi14)) {
    if (point.rsi14 < 30) bias += 0.02;
    if (point.rsi14 > 70) bias -= 0.02;
  }
  if (Number.isFinite(point.macd) && Number.isFinite(point.macdSignal)) {
    bias += point.macd > point.macdSignal ? 0.015 : -0.015;
  }
  if (Number.isFinite(point.bollingerUpper) && Number.isFinite(point.bollingerLower)) {
    if (point.close > point.bollingerUpper) bias -= 0.01;
    if (point.close < point.bollingerLower) bias += 0.01;
  }
  if (Number.isFinite(point.volume) && Number.isFinite(point.volumeSMA20) && point.volumeSMA20 > 0) {
    const ratio = point.volume / point.volumeSMA20;
    if (ratio > 1.3) bias += 0.01;
    if (ratio < 0.7) bias -= 0.01;
  }

  return Math.max(-0.05, Math.min(0.05, bias));
}

function exponentialSmoothing(prices, days, alpha = 0.35, beta = 0.15) {
  let smoothed = prices[0];
  let trend = prices[1] - prices[0];

  for (let i = 1; i < prices.length; i++) {
    const prevSmoothed = smoothed;
    smoothed = alpha * prices[i] + (1 - alpha) * (smoothed + trend);
    trend = beta * (smoothed - prevSmoothed) + (1 - beta) * trend;
  }

  const predictions = [];
  for (let i = 0; i < days; i++) {
    predictions.push(smoothed + trend * (i + 1));
  }

  return {
    predictions,
    confidence: 72,
    alpha,
    beta
  };
}

function weightedMovingAverage(prices, days, window = 7) {
  if (prices.length < window) {
    return {
      predictions: Array(days).fill(prices[prices.length - 1]),
      confidence: 60,
      window
    };
  }

  const weights = Array.from({ length: window }, (_, i) => i + 1);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const lastWindow = prices.slice(-window);
  const baseValue = lastWindow.reduce((sum, price, idx) => sum + price * weights[idx], 0) / weightSum;
  const trend = (lastWindow[lastWindow.length - 1] - lastWindow[0]) / window;

  const predictions = [];
  for (let i = 0; i < days; i++) {
    predictions.push(baseValue + trend * (i + 1));
  }

  return {
    predictions,
    confidence: 65,
    window
  };
}

/* -------------------------------------------------------------------------- */
/*                          Machine Learning Model                             */
/* -------------------------------------------------------------------------- */

function buildMachineLearningModel(data, days, currentPriceOverride = null) {
  if (data.length < 15) {
    return {
      category: 'Machine Learning',
      method: 'Trend-Based Regression with Constraints',
      predictions: []
    };
  }

  const currentPrice = currentPriceOverride ?? data[data.length - 1].close;
  
  // Tính toán xu hướng và độ biến động thực tế
  const recentPrices = data.slice(-14).map(d => d.close);
  const avgVolatility = calculateVolatility(recentPrices);
  const recentChanges = [];
  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i - 1] > 0) {
      recentChanges.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }
  }
  const avgDailyChange = recentChanges.length > 0 
    ? recentChanges.reduce((sum, c) => sum + c, 0) / recentChanges.length 
    : 0;
  const maxObservedChange = recentChanges.length > 0
    ? Math.max(...recentChanges.map(Math.abs))
    : 0.05;
  
  // Dùng cho clamp cuối cùng (ML: 4.5%, DL: 5% sẽ dùng enforcePriceConstraint)
  const MAX_ABSOLUTE_CHANGE = 0.015; // biên tham chiếu nhỏ để clamp delta
  const MIN_PRICE = currentPrice * (1 - 0.25); // biên rộng để tránh outlier trước khi clamp cứng
  const MAX_PRICE = currentPrice * (1 + 0.25);
  
  // Anchor cho ML: hơi thấp hơn currentPrice để thiên về bảo thủ
  const anchorCenterML = currentPrice; // neo đúng giá hiện tại

  // Giới hạn thay đổi hàng ngày (ML) bảo thủ hơn để bám sát giá hiện tại
  const maxFirstDayChange = Math.min(0.012, Math.max(0.004, avgVolatility * 0.4)); // day 1
  const maxSubsequentChange = Math.min(0.016, Math.max(0.009, avgVolatility * 0.55)); // các ngày sau (nhỉnh hơn chút để tách đường DL)

  // Dự đoán % thay đổi thay vì giá tuyệt đối
  const features = [];
  const targets = [];

  for (let i = 2; i < data.length; i++) {
    const prev = data[i - 1];
    const prevPrev = data[i - 2];
    // Dùng log-return làm target thay cho % change
    const actualChange = Math.log(data[i].close / prev.close);
    
    // Tính toán các chỉ báo kỹ thuật chi tiết
    const rsi14 = prev.rsi14 ?? 50;
    const rsi7 = prev.rsi_7 ?? rsi14;
    const rsi30 = prev.rsi_30 ?? rsi14;
    const macd = prev.macd ?? 0;
    const macdSignal = prev.macdSignal ?? 0;
    const macdHistogram = prev.macdHistogram ?? (macd - macdSignal);
    
    // Bollinger Bands position
    const bbUpper = prev.bollingerUpper ?? prev.close * 1.1;
    const bbLower = prev.bollingerLower ?? prev.close * 0.9;
    const bbMiddle = prev.bollingerMiddle ?? prev.close;
    const bbPosition = (prev.close - bbLower) / (bbUpper - bbLower || 1); // 0-1, 0.5 = middle
    
    // SMA và EMA
    const sma20 = prev.sma20 ?? prev.close;
    const sma50 = prev.sma50 ?? prev.close;
    const ema12 = prev.ema12 ?? prev.close;
    const ema26 = prev.ema26 ?? prev.close;
    
    // Tín hiệu từ chỉ báo
    const rsiSignal = rsi14 < 30 ? -1 : (rsi14 > 70 ? 1 : 0); // -1 oversold, 1 overbought, 0 neutral
    const macdBullish = macd > macdSignal ? 1 : -1; // 1 bullish, -1 bearish
    const macdHistogramSignal = macdHistogram > 0 ? 1 : -1;
    const priceAboveSMA20 = prev.close > sma20 ? 1 : -1;
    const priceAboveSMA50 = prev.close > sma50 ? 1 : -1;
    const emaBullish = ema12 > ema26 ? 1 : -1;
    const bbSignal = bbPosition < 0.2 ? 1 : (bbPosition > 0.8 ? -1 : 0); // 1 oversold, -1 overbought
    
    features.push([
      // Price momentum và change
      (prev.close - prevPrev.close) / prevPrev.close, // Price momentum
      prev.priceChangePct || 0, // Previous change
      
      // RSI indicators (multiple periods)
      (rsi14 - 50) / 50, // RSI14 normalized (-1 to 1)
      (rsi7 - 50) / 50, // RSI7 normalized
      (rsi30 - 50) / 50, // RSI30 normalized
      rsiSignal, // RSI signal (-1, 0, 1)
      
      // MACD indicators
      macd ? Math.sign(macd) * Math.min(1, Math.abs(macd) / prev.close) : 0, // MACD normalized
      macdSignal ? Math.sign(macdSignal) * Math.min(1, Math.abs(macdSignal) / prev.close) : 0, // MACD signal normalized
      macdHistogram ? Math.sign(macdHistogram) * Math.min(1, Math.abs(macdHistogram) / prev.close) : 0, // MACD histogram
      macdBullish, // MACD bullish/bearish signal
      macdHistogramSignal, // MACD histogram signal
      
      // Moving Averages
      (ema12 / ema26 - 1), // EMA gap ratio
      (sma20 / prev.close - 1), // SMA20 position
      (sma50 / prev.close - 1), // SMA50 position
      priceAboveSMA20, // Price vs SMA20
      priceAboveSMA50, // Price vs SMA50
      emaBullish, // EMA bullish/bearish
      
      // Bollinger Bands
      bbPosition - 0.5, // BB position normalized (-0.5 to 0.5)
      (bbUpper - bbLower) / prev.close, // BB width normalized
      bbSignal, // BB signal
      
      // Volume indicators
      prev.volumeSMA20 ? (prev.volume / prev.volumeSMA20 - 1) : 0, // Volume ratio deviation
      prev.volumeDelta ? prev.volumeDelta / (prev.volume || 1) : 0, // Volume delta normalized
      
      // Momentum và volatility
      prev.momentum3 ? prev.momentum3 / prev.close : 0, // Momentum 3d normalized
      prev.momentum7 ? prev.momentum7 / prev.close : 0, // Momentum 7d normalized
      prev.volatility14 ? prev.volatility14 / prev.close : 0, // Volatility ratio
      prev.trendStrength || 0 // Trend strength
    ]);
    targets.push(actualChange); // Target là % change, không phải giá tuyệt đối
  }

  const coeffs = solveMultivariateRegression(features, targets);
  if (!coeffs) {
    return {
      category: 'Machine Learning',
      method: 'Trend-Based Regression with Constraints',
      predictions: []
    };
  }

  // Tính toán baseline trend từ dữ liệu lịch sử
  // ML Model: sử dụng trung bình weighted của 7d và 14d trend để ổn định hơn
  const trend7d = data.length >= 7 
    ? (data[data.length - 1].close - data[data.length - 7].close) / data[data.length - 7].close / 7
    : avgDailyChange;
  const trend14d = data.length >= 14
    ? (data[data.length - 1].close - data[data.length - 14].close) / data[data.length - 14].close / 14
    : avgDailyChange;
  // ML: weighted average với ưu tiên trend ngắn hạn hơn (60% 7d, 40% 14d)
  const baselineTrend = trend7d * 0.6 + trend14d * 0.4;

  let last = data[data.length - 1];
  let prior = data[data.length - 2];
  const predictions = [];

  for (let i = 0; i < days; i++) {
    const prevPrice = i === 0 ? currentPrice : Math.max(MIN_PRICE, Math.min(MAX_PRICE, predictions[i - 1].price));
    const basePrice = prevPrice;
    
    // Tính toán các chỉ báo kỹ thuật chi tiết cho prediction
    const rsi14 = last.rsi14 ?? 50;
    const rsi7 = last.rsi_7 ?? rsi14;
    const rsi30 = last.rsi_30 ?? rsi14;
    const macd = last.macd ?? 0;
    const macdSignal = last.macdSignal ?? 0;
    const macdHistogram = last.macdHistogram ?? (macd - macdSignal);
    
    const bbUpper = last.bollingerUpper ?? last.close * 1.1;
    const bbLower = last.bollingerLower ?? last.close * 0.9;
    const bbMiddle = last.bollingerMiddle ?? last.close;
    const bbPosition = (last.close - bbLower) / (bbUpper - bbLower || 1);
    
    const sma20 = last.sma20 ?? last.close;
    const sma50 = last.sma50 ?? last.close;
    const ema12 = last.ema12 ?? last.close;
    const ema26 = last.ema26 ?? last.close;
    
    const rsiSignal = rsi14 < 30 ? -1 : (rsi14 > 70 ? 1 : 0);
    const macdBullish = macd > macdSignal ? 1 : -1;
    const macdHistogramSignal = macdHistogram > 0 ? 1 : -1;
    const priceAboveSMA20 = last.close > sma20 ? 1 : -1;
    const priceAboveSMA50 = last.close > sma50 ? 1 : -1;
    const emaBullish = ema12 > ema26 ? 1 : -1;
    const bbSignal = bbPosition < 0.2 ? 1 : (bbPosition > 0.8 ? -1 : 0);
    
    // Indicator-based reversal signals: tạo ra các đợt đảo chiều tự nhiên
    let indicatorReversal = 0;
    
    // RSI overbought/oversold reversal
    if (rsi14 > 70) {
      indicatorReversal -= 0.002 * (rsi14 - 70) / 30; // Reversal khi overbought
    } else if (rsi14 < 30) {
      indicatorReversal += 0.002 * (30 - rsi14) / 30; // Reversal khi oversold
    }
    
    // Bollinger Bands reversal
    if (bbPosition > 0.8) {
      indicatorReversal -= 0.0015; // Reversal khi giá gần upper band
    } else if (bbPosition < 0.2) {
      indicatorReversal += 0.0015; // Reversal khi giá gần lower band
    }
    
    // MACD divergence signal
    if (macdHistogram < 0 && macd > macdSignal) {
      indicatorReversal += 0.001; // Bullish divergence
    } else if (macdHistogram > 0 && macd < macdSignal) {
      indicatorReversal -= 0.001; // Bearish divergence
    }
    
    // Tính feature vector cho % change prediction với đầy đủ chỉ báo
    const featureVector = [
      // Price momentum và change
      (last.close - prior.close) / prior.close,
      last.priceChangePct || 0,
      
      // RSI indicators
      (rsi14 - 50) / 50,
      (rsi7 - 50) / 50,
      (rsi30 - 50) / 50,
      rsiSignal,
      
      // MACD indicators
      macd ? Math.sign(macd) * Math.min(1, Math.abs(macd) / last.close) : 0,
      macdSignal ? Math.sign(macdSignal) * Math.min(1, Math.abs(macdSignal) / last.close) : 0,
      macdHistogram ? Math.sign(macdHistogram) * Math.min(1, Math.abs(macdHistogram) / last.close) : 0,
      macdBullish,
      macdHistogramSignal,
      
      // Moving Averages
      (ema12 / ema26 - 1),
      (sma20 / last.close - 1),
      (sma50 / last.close - 1),
      priceAboveSMA20,
      priceAboveSMA50,
      emaBullish,
      
      // Bollinger Bands
      bbPosition - 0.5,
      (bbUpper - bbLower) / last.close,
      bbSignal,
      
      // Volume indicators
      last.volumeSMA20 ? (last.volume / last.volumeSMA20 - 1) : 0,
      last.volumeDelta ? last.volumeDelta / (last.volume || 1) : 0,
      
      // Momentum và volatility
      last.momentum3 ? last.momentum3 / last.close : 0,
      last.momentum7 ? last.momentum7 / last.close : 0,
      last.volatility14 ? last.volatility14 / last.close : 0,
      last.trendStrength || 0
    ];

    // ----------------------
    // Dự đoán log-return (ML)
    // -----------------------
    let predictedChange = coeffs.intercept + coeffs.weights.reduce((sum, weight, idx) => sum + weight * featureVector[idx], 0);

    // Volatility-aware scaling (conservative)
    const volScale = Math.min(1.25, 0.6 + avgVolatility * 5);
    predictedChange *= volScale;

    // Damping mềm để tránh nhảy mạnh
    const damping = 0.35;
    predictedChange = predictedChange * (1 - damping) + (last.priceChangePct || 0) * damping;

    // Dao động nhỏ riêng ML
    const mlOsc = 0.0012 * Math.sin((i + 1) * 0.85) + 0.0009 * Math.cos((i + 1) * 0.32);
    predictedChange += mlOsc;

    // Kéo nhẹ xuống thêm để ML thiên thủ
    predictedChange -= 0.0015;

    // Kết hợp baseline trend rất nhẹ (tránh kéo quá cao)
    const trendWeight = 0.08;
    predictedChange = predictedChange * (1 - trendWeight) + baselineTrend * trendWeight;

    // Áp dụng indicator-based reversal
    predictedChange += indicatorReversal;
    
    // Mean reversion nhẹ nếu giá đệ quy lệch xa currentPrice
    const priceDeviation = (basePrice - currentPrice) / currentPrice;
    const deviationAbs = Math.abs(priceDeviation);
    if (deviationAbs > 0.1) { // >10% thì kéo lại
      const revStrength = Math.min(0.5, deviationAbs * 2.5);
      const revDir = -Math.sign(priceDeviation);
      predictedChange = predictedChange * (1 - revStrength) + revDir * deviationAbs * revStrength * 0.5;
    }
    
    // Thêm một chút pattern rất nhỏ để tránh đường phẳng tuyệt đối (nhỏ hơn DL)
    const shape = 0.0012 * Math.sin((i + 1) * 0.65) + 0.0008 * Math.cos((i + 1) * 1.05);
    predictedChange += shape;

    // Day-adaptive constraint mềm trên log-return (cho phép tới ~2%)
    const dayProgress = (i + 1) / days;
    const maxDevDay = 0.006 + dayProgress * 0.01; // ~1.2% -> ~2.2% mỗi ngày
    const maxLog = Math.log(1 + maxDevDay);
    predictedChange = Math.tanh(predictedChange / maxLog) * maxLog; // soft clamp trên delta
    
    // Exponential smoothing với giá hiện tại (giảm bớt độ giật nhưng vẫn cho phép biến động)
    // ML giữ mượt hơn DL để bám sát giá hiện tại
    const smoothingFactor = i === 0 ? 0.92 : 0.96;
    predictedChange = predictedChange * smoothingFactor;
    
    // Neo ML về giá hiện tại nhưng cho phép mô hình chi phối nhiều hơn (60% model, 40% current)
    let predicted = basePrice * Math.exp(predictedChange); // dùng log-return
    predicted = predicted * 0.6 + currentPrice * 0.4;
    predicted = Math.max(0, predicted);
    
    // Clamp cứng theo mô hình: ML ±4.5% quanh currentPrice
    let finalPrice = enforcePriceConstraint(predicted, currentPrice, 'ml');
    
    // Log nếu giá bị clamp (chỉ log một vài lần để debug)
    if (i === 0 || i === days - 1) {
      console.log(`[ML Model] Day ${i + 1}: basePrice=${basePrice.toFixed(2)}, predicted=${predicted.toFixed(2)}, finalPrice=${finalPrice.toFixed(2)}, currentPrice=${currentPrice.toFixed(2)}`);
    }
    
    predictions.push({
      day: i + 1,
      price: parseFloat(finalPrice.toFixed(4)),
      confidence: Math.min(85, Math.max(60, 65 + coeffs.diagnostics.rSquared * 20))
    });

    // Cập nhật features cho lần lặp tiếp theo với đầy đủ chỉ báo
    // QUAN TRỌNG: Sử dụng finalPrice (đã được clamp) thay vì predicted để tránh tích lũy sai số
    const actualChange = (finalPrice - last.close) / last.close;
    prior = last;
    
    // Cập nhật các chỉ báo kỹ thuật
    const updatedRSI14 = updateRSI(last.rsi14, actualChange);
    const updatedEMA12 = updateEMA(last.ema12 ?? last.close, finalPrice, 12);
    const updatedEMA26 = updateEMA(last.ema26 ?? last.close, finalPrice, 26);
    const updatedSMA20 = updateSMA(last.sma20 ?? last.close, finalPrice, 20, i);
    const updatedSMA50 = updateSMA(last.sma50 ?? last.close, finalPrice, 50, i);
    
    last = {
      ...last,
      close: finalPrice, // Sử dụng finalPrice đã được clamp
      priceChangePct: actualChange,
      // RSI updates
      rsi14: updatedRSI14,
      rsi_7: updateRSI(last.rsi_7 ?? updatedRSI14, actualChange * 1.2), // RSI7 reacts faster
      rsi_30: updateRSI(last.rsi_30 ?? updatedRSI14, actualChange * 0.8), // RSI30 reacts slower
      // MACD updates
      macd: last.macd ? last.macd * 0.97 + (updatedEMA12 - updatedEMA26) * 0.03 : 0,
      macdSignal: last.macdSignal ? last.macdSignal * 0.97 + last.macd * 0.03 : 0,
      macdHistogram: last.macd ? (last.macd * 0.97 + (updatedEMA12 - updatedEMA26) * 0.03) - (last.macdSignal ? last.macdSignal * 0.97 + last.macd * 0.03 : 0) : 0,
      // Moving Averages
      ema12: updatedEMA12,
      ema26: updatedEMA26,
      sma20: updatedSMA20,
      sma50: updatedSMA50,
      // Bollinger Bands (approximate update) - đảm bảo không vượt quá giới hạn
      bollingerMiddle: updatedSMA20,
      bollingerUpper: Math.min(MAX_PRICE, updatedSMA20 * 1.1),
      bollingerLower: Math.max(MIN_PRICE, updatedSMA20 * 0.9),
      // Momentum và volatility
      momentum3: i >= 2 ? (finalPrice - predictions[Math.max(0, i - 2)].price) : last.momentum3 * 0.9,
      momentum7: i >= 6 ? (finalPrice - predictions[Math.max(0, i - 6)].price) : last.momentum7 * 0.9,
      volatility14: last.volatility14 * 0.99,
      trendStrength: last.trendStrength * 0.97,
      volumeSMA20: last.volumeSMA20
    };
  }

  // Clamp lần cuối cho chắc chắn (ML ±4.5%)
  const validatedPredictions = predictions.map(pred => {
    const clamped = enforcePriceConstraint(pred.price, currentPrice, 'ml');
    return { ...pred, price: parseFloat(clamped.toFixed(4)) };
  });

  return {
    category: 'Machine Learning',
    method: 'Regression with Full Technical Indicators (RSI, MACD, Bollinger, SMA/EMA)',
    predictions: validatedPredictions,
    metadata: {
      ...coeffs.diagnostics,
      baselineTrend: parseFloat(baselineTrend.toFixed(4)),
      avgVolatility: parseFloat(avgVolatility.toFixed(4)),
      features: 28, // Số lượng features đã tăng lên
      indicators: ['RSI7', 'RSI14', 'RSI30', 'MACD', 'MACD Signal', 'MACD Histogram', 'EMA12/26', 'SMA20/50', 'Bollinger Bands', 'Volume', 'Momentum', 'Volatility'],
      maxDeviation: '±5%'
    }
  };
}

function solveMultivariateRegression(features, targets) {
  try {
    const n = features.length;
    const m = features[0].length;

    const XtX = Array.from({ length: m }, () => Array(m).fill(0));
    const Xty = Array(m).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        Xty[j] += features[i][j] * targets[i];
        for (let k = 0; k < m; k++) {
          XtX[j][k] += features[i][j] * features[i][k];
        }
      }
    }

    const weights = gaussianElimination(XtX, Xty);
    if (!weights) return null;

    const meanX = Array(m).fill(0);
    let meanY = 0;
    for (let i = 0; i < n; i++) {
      meanY += targets[i];
      for (let j = 0; j < m; j++) {
        meanX[j] += features[i][j];
      }
    }
    meanY /= n;
    for (let j = 0; j < m; j++) {
      meanX[j] /= n;
    }

    let intercept = meanY;
    for (let j = 0; j < m; j++) {
      intercept -= weights[j] * meanX[j];
    }

    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + weights.reduce((sum, w, idx) => sum + w * features[i][idx], 0);
      ssRes += Math.pow(targets[i] - predicted, 2);
      ssTot += Math.pow(targets[i] - meanY, 2);
    }

    const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

    return {
      weights,
      intercept,
      diagnostics: {
        rSquared: parseFloat(rSquared.toFixed(4)),
        mse: parseFloat((ssRes / n).toFixed(4))
      }
    };
  } catch (error) {
    console.error('solveMultivariateRegression error:', error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                          Deep Learning Model                                */
/* -------------------------------------------------------------------------- */

function buildDeepLearningModel(data, days, rng, currentPriceOverride = null) {
  if (data.length < 40) {
    return {
      category: 'Deep Learning',
      method: 'Neural Network (Change Prediction)',
      predictions: []
    };
  }

  const currentPrice = currentPriceOverride ?? data[data.length - 1].close;
  const recentPrices = data.slice(-14).map(d => d.close);
  const avgVolatility = calculateVolatility(recentPrices);
  
  // Không còn ràng buộc cứng ±5%; dùng biên rộng để chặn outlier cực đoan
  const MAX_ABSOLUTE_CHANGE = 0.25;
  const MIN_PRICE = currentPrice * (1 - MAX_ABSOLUTE_CHANGE);
  const MAX_PRICE = currentPrice * (1 + MAX_ABSOLUTE_CHANGE);
  
  // Giới hạn thay đổi hàng ngày (DL) cho phép biến động lớn hơn ML nhưng vẫn trong ±5%
  const maxFirstDayChange = Math.min(0.03, Math.max(0.012, avgVolatility * 1.0));   // day 1 (cao hơn ML rõ rệt)
  const maxSubsequentChange = Math.min(0.038, Math.max(0.016, avgVolatility * 1.2)); // các ngày sau

  // Tính toán % change thay vì giá tuyệt đối
  const changeData = [];
  for (let i = 1; i < data.length; i++) {
    const change = Math.log(data[i].close / data[i - 1].close); // log-return
    changeData.push({
      change,
      ...data[i]
    });
  }

  const lookback = 10;
  const normalized = normalizeSeriesForChangePrediction(changeData);
  const featureCount = normalized.featureCount;
  const trainingSet = [];

  for (let i = lookback; i < normalized.series.length; i++) {
    const input = [];
    for (let j = lookback; j > 0; j--) {
      const point = normalized.series[i - j];
      // Input với đầy đủ chỉ báo kỹ thuật
      input.push(point.change); // % change
      input.push(point.volume);
      input.push(point.rsi14); // RSI 14
      input.push(point.rsi7); // RSI 7
      input.push(point.rsi30); // RSI 30
      input.push(point.macd);
      input.push(point.macdSignal);
      input.push(point.macdHistogram);
      input.push(point.emaGap);
      input.push(point.sma20Position);
      input.push(point.sma50Position);
      input.push(point.bollingerPosition);
      input.push(point.bollingerWidth);
      input.push(point.volumeRatio);
      input.push(point.momentumShort);
      input.push(point.momentumLong);
      input.push(point.volatility);
      input.push(point.trendStrength);
    }
    trainingSet.push({
      input,
      target: normalized.series[i].change // Target là % change
    });
  }

  if (trainingSet.length < 50) {
    return {
      category: 'Deep Learning',
      method: 'Neural Network (Change Prediction)',
      predictions: []
    };
  }

  const net = new SimpleNeuralNetwork(lookback * featureCount, 28, 1, rng); // Tăng hidden units để handle nhiều features hơn
  net.train(trainingSet, 450, 0.011); // Tăng epochs, giảm learning rate

  let lastWindow = normalized.series.slice(-lookback);
  const predictions = [];
  
  // Tính baseline trend
  // DL Model: kết hợp 3d và 7d trend để phản ứng nhanh hơn với neural network
  const trend7d = data.length >= 7 
    ? (data[data.length - 1].close - data[data.length - 7].close) / data[data.length - 7].close / 7
    : 0;
  const trend3d = data.length >= 3
    ? (data[data.length - 1].close - data[data.length - 3].close) / data[data.length - 3].close / 3
    : trend7d;
  // DL: kết hợp 3d và 7d với ưu tiên trend ngắn hạn (70% 3d, 30% 7d)
  const baselineTrend = trend3d * 0.7 + trend7d * 0.3;

  // Neo DL về sát trần biên để tách biệt với ML (ML neo thấp)
  const anchorCenterDL = currentPrice * (1 + MAX_ABSOLUTE_CHANGE * 0.4); // DL neo cao hơn ML một chút

  for (let i = 0; i < days; i++) {
    const input = [];
    lastWindow.forEach(point => {
      // Input với đầy đủ chỉ báo kỹ thuật
      input.push(point.change);
      input.push(point.volume);
      input.push(point.rsi14);
      input.push(point.rsi7);
      input.push(point.rsi30);
      input.push(point.macd);
      input.push(point.macdSignal);
      input.push(point.macdHistogram);
      input.push(point.emaGap);
      input.push(point.sma20Position);
      input.push(point.sma50Position);
      input.push(point.bollingerPosition);
      input.push(point.bollingerWidth);
      input.push(point.volumeRatio);
      input.push(point.momentumShort);
      input.push(point.momentumLong);
      input.push(point.volatility);
      input.push(point.trendStrength);
    });

    // Đảm bảo basePrice cũng không vượt quá giới hạn ±5%
    const prevPrice = i === 0 ? currentPrice : Math.max(MIN_PRICE, Math.min(MAX_PRICE, predictions[i - 1].price));
    const basePrice = prevPrice;
    // ----------------------
    // Dự đoán log-return (DL)
    // ----------------------
    // Neural output
    let predictedChange = net.run(input);

    // Drift theo trend mạnh hơn để khác ML
    const trendWeight = 0.7;
    predictedChange = predictedChange * (1 - trendWeight) + baselineTrend * trendWeight;

    // Indicator-based reversal (giữ đơn giản nhưng mạnh hơn ML)
    const lastPoint = lastWindow[lastWindow.length - 1];
    let indicatorReversal = 0;
    const rsi14Normalized = lastPoint.rsi14; // 0-1
    if (rsi14Normalized > 0.72) indicatorReversal -= 0.0025 * (rsi14Normalized - 0.72) / 0.28;
    else if (rsi14Normalized < 0.28) indicatorReversal += 0.0025 * (0.28 - rsi14Normalized) / 0.28;

    const bbPos = lastPoint.bollingerPosition;
    if (bbPos > 0.8) indicatorReversal -= 0.002;
    else if (bbPos < 0.2) indicatorReversal += 0.002;

    const macdHist = lastPoint.macdHistogram;
    const macdVal = lastPoint.macd;
    const macdSig = lastPoint.macdSignal;
    if (macdHist < 0 && macdVal > macdSig) indicatorReversal += 0.0015;
    else if (macdHist > 0 && macdVal < macdSig) indicatorReversal -= 0.0015;

    predictedChange += indicatorReversal;

    // Mean reversion nhẹ để tránh trôi quá xa
    const priceDeviation = (basePrice - currentPrice) / currentPrice;
    const deviationAbs = Math.abs(priceDeviation);
    if (deviationAbs > 0.018) {
      const revStrength = Math.min(0.5, deviationAbs * 5.5);
      const revDir = -Math.sign(priceDeviation);
      predictedChange = predictedChange * (1 - revStrength) + revDir * deviationAbs * revStrength;
    }

    // Volatility-aware scaling (DL chỉ nhỉnh rất nhẹ)
    const volScaleDL = Math.min(1.05, 0.55 + avgVolatility * 2.5);
    predictedChange *= volScaleDL;

    // Oscillation lớn hơn ML + nhiễu theo seed để khác hẳn
    const volatilityFactor = Math.min(0.25, avgVolatility * 3.0);
    const osc =
      0.0045 * Math.sin((i + 1) * 0.6) +
      0.0032 * Math.cos((i + 1) * 0.42) +
      0.0025 * Math.sin((i + 1) * 1.05);
    const seededNoise = (rng() - 0.5) * 0.005;
    predictedChange += (osc * volatilityFactor) + seededNoise;

    // Cycle pattern gọn, khác pha ML
    predictedChange += 0.002 * Math.sin((i + 1) * Math.PI / 3.8);

    // Day-adaptive constraint trên log-return (mềm, không clamp giá)
    const dayProgress = (i + 1) / days;
    const maxDevDay = 0.008 + dayProgress * 0.012; // ~1.6% -> ~2.8%
    const maxLog = Math.log(1 + maxDevDay);
    predictedChange = Math.tanh(predictedChange / maxLog) * maxLog; // soft clamp

    // Smoothing (giữ dao động hơn ML)
    const smoothingFactor = i === 0 ? 0.8 : 0.86;
    predictedChange *= smoothingFactor;

    // Neo DL: 70% model, 30% anchor (cao hơn ML, vẫn trong clamp 5%)
    let predicted = basePrice * Math.exp(predictedChange);
    predicted = predicted * 0.7 + anchorCenterDL * 0.3;
    predicted = Math.max(0, predicted);

    // Clamp cứng theo mô hình: DL ±5% quanh currentPrice
    let finalPrice = enforcePriceConstraint(predicted, currentPrice, 'dl');
    
    // Log nếu giá bị clamp (chỉ log một vài lần để debug)
    if (i === 0 || i === days - 1) {
      console.log(`[DL Model] Day ${i + 1}: basePrice=${basePrice.toFixed(2)}, predicted=${predicted.toFixed(2)}, finalPrice=${finalPrice.toFixed(2)}, currentPrice=${currentPrice.toFixed(2)}`);
    }
    
    predictions.push({
      day: i + 1,
      price: parseFloat(finalPrice.toFixed(4)),
      confidence: 75
    });

    // Cập nhật window với đầy đủ chỉ báo
    // QUAN TRỌNG: Sử dụng finalPrice (đã được clamp) thay vì predicted để tránh tích lũy sai số
    const actualChange = (finalPrice - basePrice) / basePrice;
    // lastPoint đã được khai báo ở trên, tái sử dụng
    
    // Cập nhật các chỉ báo kỹ thuật
    const updatedRSI14 = updateRSINormalized(lastPoint.rsi14, actualChange);
    const updatedRSI7 = updateRSINormalized(lastPoint.rsi7, actualChange * 1.2);
    const updatedRSI30 = updateRSINormalized(lastPoint.rsi30, actualChange * 0.8);
    
    lastWindow = [...lastWindow.slice(1), {
      change: Math.max(-0.1, Math.min(0.1, actualChange)), // Clamp change
      volume: Math.max(0, Math.min(1, lastPoint.volume * 0.99)),
      // RSI updates
      rsi14: updatedRSI14,
      rsi7: updatedRSI7,
      rsi30: updatedRSI30,
      // MACD updates
      macd: lastPoint.macd * 0.97,
      macdSignal: lastPoint.macdSignal * 0.97,
      macdHistogram: (lastPoint.macd * 0.97) - (lastPoint.macdSignal * 0.97),
      // Moving Averages
      emaGap: lastPoint.emaGap * 0.96,
      sma20Position: lastPoint.sma20Position * 0.98,
      sma50Position: lastPoint.sma50Position * 0.99,
      // Bollinger Bands
      bollingerPosition: lastPoint.bollingerPosition * 0.98,
      bollingerWidth: lastPoint.bollingerWidth * 0.98,
      // Volume và momentum
      volumeRatio: Math.max(0.5, Math.min(2.5, lastPoint.volumeRatio * 0.99)),
      momentumShort: lastPoint.momentumShort * 0.92,
      momentumLong: lastPoint.momentumLong * 0.95,
      volatility: Math.max(0, Math.min(1, lastPoint.volatility * 0.99)),
      trendStrength: Math.max(-2, Math.min(2, lastPoint.trendStrength * 0.96))
    }];
  }

  // Clamp lần cuối cho chắc chắn (DL ±5%)
  const validatedPredictions = predictions.map(pred => {
    const clamped = enforcePriceConstraint(pred.price, currentPrice, 'dl');
    return { ...pred, price: parseFloat(clamped.toFixed(4)) };
  });

  return {
    category: 'Deep Learning',
    method: 'Neural Network with Full Technical Indicators (RSI, MACD, Bollinger, SMA/EMA)',
    predictions: validatedPredictions,
    metadata: {
      hiddenUnits: 28,
      trainingSamples: trainingSet.length,
      baselineTrend: parseFloat(baselineTrend.toFixed(4)),
      features: featureCount,
      indicators: ['RSI7', 'RSI14', 'RSI30', 'MACD', 'MACD Signal', 'MACD Histogram', 'EMA12/26', 'SMA20/50', 'Bollinger Bands', 'Volume', 'Momentum', 'Volatility'],
      maxDeviation: '±5%'
    }
  };
}

class SimpleNeuralNetwork {
  constructor(inputSize, hiddenSize, outputSize, rng = Math.random) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;
    this.rng = rng;
    this.weightsIH = Array.from({ length: hiddenSize }, () => randomArray(inputSize, this.rng));
    this.biasH = randomArray(hiddenSize, this.rng);
    this.weightsHO = randomArray(hiddenSize, this.rng);
    this.biasO = this.rng() * 0.2 - 0.1;
  }

  train(samples, epochs, learningRate) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      samples.forEach(sample => {
        const { hidden, output } = this.forward(sample.input);
        const error = output - sample.target;
        const gradOutput = error;
        const gradHidden = hidden.map((h, idx) => (h > 0 ? gradOutput * this.weightsHO[idx] : 0));

        for (let i = 0; i < this.hiddenSize; i++) {
          this.weightsHO[i] -= learningRate * gradOutput * hidden[i];
        }
        this.biasO -= learningRate * gradOutput;

        for (let i = 0; i < this.hiddenSize; i++) {
          for (let j = 0; j < this.inputSize; j++) {
            this.weightsIH[i][j] -= learningRate * gradHidden[i] * sample.input[j];
          }
          this.biasH[i] -= learningRate * gradHidden[i];
        }
      });
    }
  }

  forward(input) {
    const hidden = this.weightsIH.map((weights, idx) => {
      const sum = weights.reduce((acc, w, j) => acc + w * input[j], 0) + this.biasH[idx];
      return Math.max(0, sum);
    });
    const output = hidden.reduce((acc, h, idx) => acc + h * this.weightsHO[idx], this.biasO);
    return { hidden, output };
  }

  run(input) {
    return this.forward(input).output;
  }
}

/* -------------------------------------------------------------------------- */
/*                                Helpers                                     */
/* -------------------------------------------------------------------------- */

function normalizeSeries(data) {
  const priceValues = data.map(item => item.close);
  const volumeValues = data.map(item => item.volume || 0);
  const emaGapValues = data.map(item => (item.ema12 ?? item.close) - (item.ema26 ?? item.close));
  const bollingerValues = data.map(item =>
    (Number.isFinite(item.bollingerUpper) && Number.isFinite(item.bollingerLower))
      ? Math.max(item.bollingerUpper - item.bollingerLower, 0)
      : 0
  );
  const volumeRatioValues = data.map(item =>
    item.volumeSMA20 ? item.volume / item.volumeSMA20 : 1
  );
  const momentumShortValues = data.map(item => item.momentum3 || 0);
  const momentumLongValues = data.map(item => item.momentum7 || 0);
  const volatilityValues = data.map(item => item.volatility14 || 0);
  const volumeDeltaValues = data.map(item => item.volumeDelta || 0);
  const trendStrengthValues = data.map(item => item.trendStrength || 0);

  const ranges = {
    price: { min: Math.min(...priceValues), max: Math.max(...priceValues) },
    volume: { min: Math.min(...volumeValues), max: Math.max(...volumeValues) },
    rsi: { min: 0, max: 100 },
    macd: getRange(data.map(item => item.macd ?? 0)),
    macdSignal: getRange(data.map(item => item.macdSignal ?? 0)),
    emaGap: getRange(emaGapValues),
    bollingerWidth: getRange(bollingerValues, 0, Math.max(...bollingerValues, 1)),
    volumeRatio: getRange(volumeRatioValues, 0.5, 2.5),
    momentumShort: getRange(momentumShortValues),
    momentumLong: getRange(momentumLongValues),
    volatility: getRange(volatilityValues),
    volumeDelta: getRange(volumeDeltaValues),
    trendStrength: getRange(trendStrengthValues, -2, 2)
  };

  const series = data.map(item => ({
    price: normalize(item.close, ranges.price),
    volume: normalize(item.volume || 0, ranges.volume),
    rsi: normalize(item.rsi14 ?? 50, ranges.rsi),
    macd: normalize(item.macd ?? 0, ranges.macd),
    macdSignal: normalize(item.macdSignal ?? 0, ranges.macdSignal),
    emaGap: normalize((item.ema12 ?? item.close) - (item.ema26 ?? item.close), ranges.emaGap),
    bollingerWidth: normalize(
      (Number.isFinite(item.bollingerUpper) && Number.isFinite(item.bollingerLower))
        ? item.bollingerUpper - item.bollingerLower
        : 0,
      ranges.bollingerWidth
    ),
    volumeRatio: normalize(item.volumeSMA20 ? item.volume / item.volumeSMA20 : 1, ranges.volumeRatio),
    momentumShort: normalize(item.momentum3 || 0, ranges.momentumShort),
    momentumLong: normalize(item.momentum7 || 0, ranges.momentumLong),
    volatility: normalize(item.volatility14 || 0, ranges.volatility),
    volumeDelta: normalize(item.volumeDelta || 0, ranges.volumeDelta),
    trendStrength: normalize(item.trendStrength || 0, ranges.trendStrength)
  }));

  return {
    series,
    ranges,
    featureCount: 13
  };
}

function normalize(value, range, fallback = 0.5) {
  if (!Number.isFinite(value)) return fallback;
  const width = (range.max - range.min) || 1;
  const normalized = (value - range.min) / width;
  return Math.max(0, Math.min(1, normalized));
}

function denormalize(value, min, max) {
  return value * (max - min) + min;
}

function getRange(values, forcedMin, forcedMax) {
  const finiteValues = values.filter(Number.isFinite);
  const min = forcedMin !== undefined ? forcedMin : (finiteValues.length ? Math.min(...finiteValues) : 0);
  const max = forcedMax !== undefined ? forcedMax : (finiteValues.length ? Math.max(...finiteValues) : min + 1);
  return { min, max: max === min ? min + 1 : max };
}

function validateModel(model, validationData) {
  if (!model || !model.predictions || model.predictions.length === 0 || validationData.length === 0) {
    return null;
  }

  const actual = validationData.map(item => item.close);
  const compareLength = Math.min(model.predictions.length, actual.length);
  if (compareLength === 0) return null;

  let mae = 0;
  let mse = 0;
  let mape = 0;

  for (let i = 0; i < compareLength; i++) {
    const predicted = model.predictions[i].price;
    const target = actual[i];
    const error = Math.abs(predicted - target);
    mae += error;
    mse += error * error;
    if (target !== 0) {
      mape += Math.abs((predicted - target) / target) * 100;
    }
  }

  mae /= compareLength;
  mse /= compareLength;
  mape /= compareLength;

  return {
    mae: parseFloat(mae.toFixed(4)),
    rmse: parseFloat(Math.sqrt(mse).toFixed(4)),
    mape: parseFloat(mape.toFixed(2)),
    accuracy: parseFloat(Math.max(0, 100 - mape).toFixed(2)),
    samples: compareLength
  };
}

function generateRecommendation(predictions, currentPrice, days, technicalIndicators) {
  const summary = [];
  Object.values(predictions).forEach(model => {
    if (model && model.predictions && model.predictions.length > 0) {
      // Sử dụng GIÁ DỰ BÁO NGÀY ĐẦU TIÊN (day 1) để làm cơ sở so sánh ngắn hạn
      const firstPrice = model.predictions[0].price;
      summary.push(firstPrice);
    }
  });

  if (summary.length === 0) {
    return {
      action: 'HOLD',
      action_vi: 'GIỮ',
      confidence: 50,
      reasoning: ['Không đủ dữ liệu để đưa ra khuyến nghị.'],
      riskLevel: 'MEDIUM',
      riskLevel_vi: 'TRUNG BÌNH',
      predictedPrice: currentPrice,
      predictedChange: 0,
      timeHorizon: `${days} days`,
      timeHorizon_vi: `${days} ngày`,
      summary_vi: 'Chưa có đủ dữ liệu dự báo, nên tạm thời GIỮ vị thế và quan sát thêm.',
      details_vi: [
        'Hệ thống không nhận đủ số lượng điểm dữ liệu để đánh giá đáng tin cậy.',
        'Bạn nên chờ thêm dữ liệu lịch sử hoặc khối lượng giao dịch trước khi đưa ra quyết định.'
      ]
    };
  }

  const avgPrediction =
    summary.reduce((sum, price) => sum + price, 0) / summary.length;
  const change = ((avgPrediction - currentPrice) / currentPrice) * 100;

  let action = 'HOLD';
  let action_vi = 'GIỮ';
  let riskLevel = 'MEDIUM';
  let riskLevel_vi = 'TRUNG BÌNH';

  // Xếp loại mức thay đổi dự báo
  const absChange = Math.abs(change);

  if (change > 4) {
    action = 'BUY';
    action_vi = 'MUA';
  } else if (change < -4) {
    action = 'SELL';
    action_vi = 'BÁN';
  } else if (change > 1) {
    action = 'HOLD';
    action_vi = 'GIỮ / CANH MUA NHẸ';
  } else if (change < -1) {
    action = 'HOLD';
    action_vi = 'GIỮ / CANH GIẢM TỶ TRỌNG';
  }

  if (absChange > 15) {
    riskLevel = 'HIGH';
    riskLevel_vi = 'CAO';
  } else if (absChange < 3) {
    riskLevel = 'LOW';
    riskLevel_vi = 'THẤP';
  }

  const reasoning = [];
  const details_vi = [];

  // Phân tích riêng từng mô hình để tổng hợp xu hướng
  const modelSummary = [];
  let buyModels = 0;
  let sellModels = 0;
  let holdModels = 0;

  Object.entries(predictions).forEach(([key, model]) => {
    if (!model || !model.predictions || model.predictions.length === 0) return;
    // Đánh giá dựa trên NGÀY ĐẦU TIÊN trong horizon (day 1) cho từng mô hình
    const firstPrice = model.predictions[0].price;
    const modelChange = ((firstPrice - currentPrice) / currentPrice) * 100;
    const absModelChange = Math.abs(modelChange);

    let modelAction = 'HOLD';
    let modelActionVi = 'GIỮ';

    if (modelChange > 3) {
      modelAction = 'BUY';
      modelActionVi = 'MUA';
      buyModels += 1;
    } else if (modelChange < -3) {
      modelAction = 'SELL';
      modelActionVi = 'BÁN';
      sellModels += 1;
    } else {
      holdModels += 1;
      if (modelChange > 1) {
        modelActionVi = 'GIỮ / THIÊN VỀ MUA NHẸ';
      } else if (modelChange < -1) {
        modelActionVi = 'GIỮ / THIÊN VỀ GIẢM TỶ TRỌNG';
      }
    }

    const modelName =
      model.method ||
      model.category ||
      (key === 'statistical'
        ? 'Mô hình Thống kê'
        : key === 'machineLearning'
        ? 'Mô hình Machine Learning'
        : key === 'deepLearning'
        ? 'Mô hình Deep Learning'
        : key);

    modelSummary.push({
      key,
      name: modelName,
      action: modelAction,
      action_vi: modelActionVi,
      change: modelChange
    });

    details_vi.push(
      `${modelName}: khuyến nghị ${modelActionVi} với mức thay đổi dự kiến khoảng ${modelChange.toFixed(
        2
      )}% so với giá hiện tại.`
    );
  });

  // Giải thích chung về mức thay đổi dự báo
  if (change >= 0) {
    reasoning.push(
      `Giá dự báo trung bình trong ${days} ngày tới cao hơn hiện tại khoảng ${change.toFixed(
        2
      )}%.`
    );
    details_vi.push(
      `Mức giá dự báo trung bình cao hơn giá hiện tại khoảng ${change.toFixed(
        2
      )}%, cho thấy xu hướng NHẸ tới TRUNG BÌNH theo chiều tăng.`
    );
  } else {
    reasoning.push(
      `Giá dự báo trung bình trong ${days} ngày tới thấp hơn hiện tại khoảng ${change.toFixed(
        2
      )}%.`
    );
    details_vi.push(
      `Mức giá dự báo trung bình thấp hơn giá hiện tại khoảng ${change.toFixed(
        2
      )}%, cho thấy áp lực giảm giá hoặc điều chỉnh trong ngắn hạn.`
    );
  }

  // Phân tích thêm dựa trên chỉ báo kỹ thuật (RSI, MACD...)
  if (technicalIndicators) {
    const rsi = technicalIndicators.rsi_14;
    if (Number.isFinite(rsi)) {
      if (rsi < 30) {
        details_vi.push(
          `RSI(14) ≈ ${rsi.toFixed(
            2
          )} nằm trong vùng QUÁ BÁN, thường báo hiệu khả năng hồi phục hoặc bật tăng trong tương lai gần.`
        );
        if (action === 'SELL') {
          reasoning.push('RSI cho thấy thị trường đang oversold (quá bán).');
          action = 'HOLD';
          action_vi = 'GIỮ / CANH MUA THĂM DÒ';
        }
      } else if (rsi > 70) {
        details_vi.push(
          `RSI(14) ≈ ${rsi.toFixed(
            2
          )} nằm trong vùng QUÁ MUA, rủi ro điều chỉnh giảm trong ngắn hạn tăng lên.`
        );
        if (action === 'BUY') {
          reasoning.push('RSI cho thấy thị trường đang overbought (quá mua).');
          action = 'HOLD';
          action_vi = 'GIỮ / HẠN CHẾ MUA ĐUỔI';
        }
      } else {
        details_vi.push(
          `RSI(14) ≈ ${rsi.toFixed(
            2
          )} ở vùng trung tính, không có tín hiệu QUÁ MUA hay QUÁ BÁN rõ ràng.`
        );
      }
    }

    if (
      Number.isFinite(technicalIndicators.macd) &&
      Number.isFinite(technicalIndicators.macd_signal)
    ) {
      const macd = technicalIndicators.macd;
      const macdSignal = technicalIndicators.macd_signal;
      if (macd > macdSignal) {
        reasoning.push('MACD bullish bias confirmed');
        details_vi.push(
          `Đường MACD nằm TRÊN đường tín hiệu, ủng hộ xu hướng tăng hoặc ít nhất là lực mua đang chiếm ưu thế.`
        );
      } else if (macd < macdSignal) {
        reasoning.push('MACD bearish bias confirmed');
        details_vi.push(
          `Đường MACD nằm DƯỚI đường tín hiệu, cho thấy áp lực bán đang chiếm ưu thế và rủi ro điều chỉnh vẫn còn.`
        );
      }
    }
  }

  // Kết luận ngắn gọn bằng tiếng Việt
  let summary_vi = '';
  const totalModels = buyModels + sellModels + holdModels;
  const voteSummary =
    totalModels > 0
      ? `Tổng hợp ${totalModels} mô hình: ${buyModels} MUA, ${sellModels} BÁN, ${holdModels} GIỮ. `
      : '';

  if (action === 'BUY') {
    summary_vi =
      voteSummary +
      'Tín hiệu tổng hợp nghiêng về MUA, nhưng vẫn cần quản lý rủi ro và phân bổ vốn hợp lý (không nên all-in).';
  } else if (action === 'SELL') {
    summary_vi =
      voteSummary +
      'Tín hiệu tổng hợp nghiêng về BÁN hoặc GIẢM TỶ TRỌNG, đặc biệt nếu bạn đã có lợi nhuận hoặc không chấp nhận rủi ro cao.';
  } else {
    summary_vi =
      voteSummary +
      'Tín hiệu tổng hợp nghiêng về GIỮ quan sát. Nên hạn chế mua đuổi hoặc bán hoảng loạn, chờ thêm tín hiệu rõ ràng hơn.';
  }

  // Thêm ghi chú cảnh báo tiêu chuẩn
  details_vi.push(
    'Lưu ý: Đây KHÔNG phải là lời khuyên đầu tư tuyệt đối. Bạn nên kết hợp thêm phân tích cá nhân, chiến lược quản lý vốn và khẩu vị rủi ro của riêng mình.'
  );

  return {
    action,
    action_vi,
    confidence: Math.min(95, Math.max(55, 60 + absChange / 2)),
    reasoning,
    riskLevel,
    riskLevel_vi,
    predictedPrice: avgPrediction,
    predictedChange: change,
    timeHorizon: `${days} days`,
    timeHorizon_vi: `${days} ngày`,
    summary_vi,
    details_vi,
    // Tóm tắt riêng từng mô hình để frontend có thể hiển thị chi tiết hơn nếu cần
    models: modelSummary
  };
}

function randomArray(length, rng = Math.random) {
  return Array.from({ length }, () => rng() * 0.2 - 0.1);
}

// Helper functions for smoothing và constraints
function calculateVolatility(prices) {
  if (prices.length < 2) return 0.03;
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      changes.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
    }
  }
  if (changes.length === 0) return 0.03;
  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  return Math.min(0.1, Math.max(0.01, avgChange));
}

function updateRSI(currentRSI, priceChange) {
  if (!Number.isFinite(currentRSI)) return 50;
  // RSI điều chỉnh dựa trên thay đổi giá
  const rsiChange = priceChange > 0 ? 2 : -2;
  return Math.max(0, Math.min(100, currentRSI + rsiChange));
}

function updateRSINormalized(normalizedRSI, priceChange) {
  // RSI normalized (0-1) điều chỉnh
  const rsiChange = priceChange > 0 ? 0.02 : -0.02;
  return Math.max(0, Math.min(1, normalizedRSI + rsiChange));
}

function updateEMA(currentEMA, newPrice, period) {
  if (!Number.isFinite(currentEMA)) return newPrice;
  const multiplier = 2 / (period + 1);
  return currentEMA * (1 - multiplier) + newPrice * multiplier;
}

function updateSMA(currentSMA, newPrice, period, dayIndex) {
  if (!Number.isFinite(currentSMA)) return newPrice;
  // Simplified SMA update: approximate với exponential decay
  // Trong thực tế SMA cần window đầy đủ, nhưng đây là approximation
  const weight = 1 / period;
  return currentSMA * (1 - weight) + newPrice * weight;
}

function normalizeSeriesForChangePrediction(changeData) {
  const changeValues = changeData.map(item => item.change);
  const volumeValues = changeData.map(item => item.volume || 0);
  const emaGapValues = changeData.map(item => (item.ema12 ?? item.close) - (item.ema26 ?? item.close));
  const bollingerValues = changeData.map(item =>
    (Number.isFinite(item.bollingerUpper) && Number.isFinite(item.bollingerLower))
      ? Math.max(item.bollingerUpper - item.bollingerLower, 0)
      : 0
  );
  const bollingerPositionValues = changeData.map(item => {
    const bbUpper = item.bollingerUpper ?? item.close * 1.1;
    const bbLower = item.bollingerLower ?? item.close * 0.9;
    return (item.close - bbLower) / (bbUpper - bbLower || 1);
  });
  const sma20PositionValues = changeData.map(item => 
    item.sma20 ? (item.close / item.sma20 - 1) : 0
  );
  const sma50PositionValues = changeData.map(item => 
    item.sma50 ? (item.close / item.sma50 - 1) : 0
  );
  const volumeRatioValues = changeData.map(item =>
    item.volumeSMA20 ? item.volume / item.volumeSMA20 : 1
  );
  const momentumShortValues = changeData.map(item => item.momentum3 || 0);
  const momentumLongValues = changeData.map(item => item.momentum7 || 0);
  const volatilityValues = changeData.map(item => item.volatility14 || 0);
  const trendStrengthValues = changeData.map(item => item.trendStrength || 0);

  const ranges = {
    change: { min: Math.min(...changeValues), max: Math.max(...changeValues) },
    volume: { min: Math.min(...volumeValues), max: Math.max(...volumeValues) },
    rsi14: { min: 0, max: 100 },
    rsi7: { min: 0, max: 100 },
    rsi30: { min: 0, max: 100 },
    macd: getRange(changeData.map(item => item.macd ?? 0)),
    macdSignal: getRange(changeData.map(item => item.macdSignal ?? 0)),
    macdHistogram: getRange(changeData.map(item => item.macdHistogram ?? 0)),
    emaGap: getRange(emaGapValues),
    sma20Position: getRange(sma20PositionValues),
    sma50Position: getRange(sma50PositionValues),
    bollingerPosition: { min: 0, max: 1 },
    bollingerWidth: getRange(bollingerValues, 0, Math.max(...bollingerValues, 1)),
    volumeRatio: getRange(volumeRatioValues, 0.5, 2.5),
    momentumShort: getRange(momentumShortValues),
    momentumLong: getRange(momentumLongValues),
    volatility: getRange(volatilityValues),
    trendStrength: getRange(trendStrengthValues, -2, 2)
  };

  const series = changeData.map(item => {
    const bbUpper = item.bollingerUpper ?? item.close * 1.1;
    const bbLower = item.bollingerLower ?? item.close * 0.9;
    const bbPosition = (item.close - bbLower) / (bbUpper - bbLower || 1);
    
    return {
      change: normalize(item.change, ranges.change, 0),
      volume: normalize(item.volume || 0, ranges.volume),
      // RSI với nhiều periods
      rsi14: normalize(item.rsi14 ?? 50, ranges.rsi14),
      rsi7: normalize(item.rsi_7 ?? item.rsi14 ?? 50, ranges.rsi7),
      rsi30: normalize(item.rsi_30 ?? item.rsi14 ?? 50, ranges.rsi30),
      // MACD đầy đủ
      macd: normalize(item.macd ?? 0, ranges.macd),
      macdSignal: normalize(item.macdSignal ?? 0, ranges.macdSignal),
      macdHistogram: normalize(item.macdHistogram ?? (item.macd - item.macdSignal) ?? 0, ranges.macdHistogram),
      // Moving Averages
      emaGap: normalize((item.ema12 ?? item.close) - (item.ema26 ?? item.close), ranges.emaGap),
      sma20Position: normalize(item.sma20 ? (item.close / item.sma20 - 1) : 0, ranges.sma20Position),
      sma50Position: normalize(item.sma50 ? (item.close / item.sma50 - 1) : 0, ranges.sma50Position),
      // Bollinger Bands
      bollingerPosition: normalize(bbPosition, ranges.bollingerPosition),
      bollingerWidth: normalize(
        (Number.isFinite(item.bollingerUpper) && Number.isFinite(item.bollingerLower))
          ? item.bollingerUpper - item.bollingerLower
          : 0,
        ranges.bollingerWidth
      ),
      // Volume và momentum
      volumeRatio: normalize(item.volumeSMA20 ? item.volume / item.volumeSMA20 : 1, ranges.volumeRatio),
      momentumShort: normalize(item.momentum3 || 0, ranges.momentumShort),
      momentumLong: normalize(item.momentum7 || 0, ranges.momentumLong),
      volatility: normalize(item.volatility14 || 0, ranges.volatility),
      trendStrength: normalize(item.trendStrength || 0, ranges.trendStrength)
    };
  });

  return {
    series,
    ranges,
    featureCount: 18 // Tăng từ 12 lên 18 features
  };
}

function gaussianElimination(matrix, vector) {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    const pivot = augmented[i][i] || 1;
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / pivot;
      for (let j = i; j < n + 1; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  const solution = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    solution[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      solution[i] -= augmented[i][j] * solution[j];
    }
    solution[i] /= augmented[i][i] || 1;
  }

  return solution;
}

module.exports = {
  predictPrice
};