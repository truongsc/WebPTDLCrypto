const express = require('express');
const router = express.Router();

const MAX_PREDICTION_CACHE = 200;
const predictionCache = new Map();

function buildPredictionCacheKey(symbol, days, dataset) {
  const latestPoint = dataset?.[dataset.length - 1];
  const marker = latestPoint?.date || latestPoint?.timestamp || '';
  return `${symbol.toUpperCase()}-${days}-${marker}`;
}

function setPredictionCache(key, value) {
  if (predictionCache.size >= MAX_PREDICTION_CACHE) {
    const firstKey = predictionCache.keys().next().value;
    if (firstKey) predictionCache.delete(firstKey);
  }
  predictionCache.set(key, value);
}
const { executeQuery } = require('../config/database');
const { calculateTechnicalIndicators } = require('../utils/technicalAnalysis');
const { predictPrice } = require('../utils/pricePrediction');
const axios = require('axios');

// GET /api/tokens - Get all tokens with latest data
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        ti.symbol,
        ti.name,
        ti.icon_url,
        hp.close as price,
        hp.volume,
        hp.quote_asset_volume,
        hp.timestamp,
        hp.high,
        hp.low,
        hp.open
      FROM token_info ti
      LEFT JOIN (
        SELECT 
          symbol, 
          close, 
          volume, 
          quote_asset_volume, 
          timestamp, 
          high, 
          low, 
          open,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM historical_prices
        WHERE close IS NOT NULL 
          AND close > 0
          AND DATE(timestamp) = CURDATE()
      ) hp ON ti.symbol = hp.symbol AND hp.rn = 1
      WHERE hp.close IS NOT NULL
      ORDER BY hp.quote_asset_volume DESC
      LIMIT 50
    `;
    
    const tokens = await executeQuery(query);
    
    // Lấy tất cả market cap từ market_dominance_history một lần (dữ liệu mới nhất)
    const symbolList = tokens.map(t => t.symbol);
    let marketCapMap = {};
    
    if (symbolList.length > 0) {
      try {
        // Lấy market cap mới nhất cho tất cả token cùng lúc
        const placeholders = symbolList.map(() => '?').join(',');
        const maxDateQuery = `
          SELECT MAX(date) as max_date FROM market_dominance_history
        `;
        const maxDateResult = await executeQuery(maxDateQuery);
        const maxDate = maxDateResult[0]?.max_date;
        
        if (maxDate) {
          const marketCapQuery = `
            SELECT symbol, market_cap_usd
            FROM market_dominance_history 
            WHERE symbol IN (${placeholders}) AND date = ?
          `;
          const marketCaps = await executeQuery(marketCapQuery, [...symbolList, maxDate]);
          
          // Tạo map để tra cứu nhanh
          marketCaps.forEach(row => {
            marketCapMap[row.symbol] = parseFloat(row.market_cap_usd) || 0;
          });
        }
      } catch (error) {
        console.log(`Error getting market caps:`, error.message);
      }
    }
    
    // Calculate price changes and add technical indicators
    const tokensWithData = await Promise.all(tokens.map(async (token, index) => {
      const changes = await calculatePriceChanges(token.symbol, token.price);
      const indicators = await calculateTechnicalIndicators(token.symbol);
      
      // Get market cap from map (đã lấy ở trên)
      const marketCapUsd = marketCapMap[token.symbol] || 0;
      const marketCap = {
        market_cap_usd: marketCapUsd,
        market_cap_change_24h: 0, // Can calculate from previous day if needed
        circulating_supply: 0, // market_dominance_history không có field này
        total_supply: 0 // market_dominance_history không có field này
      };
      
      return {
        ...token,
        price: parseFloat(token.price),
        volume_24h: parseFloat(token.volume) || 0,
        quote_volume_24h: parseFloat(token.quote_asset_volume) || 0,
        high_24h: parseFloat(token.high) || 0,
        low_24h: parseFloat(token.low) || 0,
        open_24h: parseFloat(token.open) || 0,
        changes,
        indicators,
        market_cap: {
          market_cap_usd: marketCap.market_cap_usd || 0,
          market_cap_change_24h: marketCap.market_cap_change_24h || 0,
          circulating_supply: marketCap.circulating_supply || 0,
          total_supply: marketCap.total_supply || 0
        }
      };
    }));
    
    res.json(tokensWithData);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens data' });
  }
});

// GET /api/tokens/:symbol - Get detailed data for a specific token
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '30d' } = req.query;
    
    console.log(`[Token Detail] Fetching data for symbol: ${symbol.toUpperCase()}`);
    
    // Get token basic info - try token_info first, fallback to historical_prices
    let tokenQuery = `
      SELECT symbol, name, icon_url FROM token_info WHERE symbol = ?
    `;
    let tokenInfo = await executeQuery(tokenQuery, [symbol.toUpperCase()]);
    
    console.log(`[Token Detail] Token info found: ${tokenInfo.length > 0}`);
    
    // If not found in token_info, check if it exists in historical_prices
    if (!tokenInfo.length) {
      const checkQuery = `
        SELECT DISTINCT symbol FROM historical_prices WHERE symbol = ? LIMIT 1
      `;
      const exists = await executeQuery(checkQuery, [symbol.toUpperCase()]);
      
      if (exists.length > 0) {
        // Create a temporary token_info object
        tokenInfo = [{
          symbol: symbol.toUpperCase(),
          name: symbol.toUpperCase(),
          icon_url: null
        }];
      } else {
        return res.status(404).json({ error: 'Token not found' });
      }
    }
    
    // Get historical data
    const days = getDaysFromPeriod(period);
    
    // Ensure days is a valid integer
    if (!days || isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'Invalid period parameter' });
    }
    
    // Use template string for LIMIT to avoid prepared statement issues
    const limitValue = parseInt(days, 10);
    const historyQuery = `
      SELECT timestamp, open, high, low, close, volume, quote_asset_volume
      FROM historical_prices 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT ${limitValue}
    `;
    const priceData = await executeQuery(historyQuery, [symbol.toUpperCase()]);
    
    console.log(`[Token Detail] Price data found: ${priceData?.length || 0} records`);
    
    if (!priceData || priceData.length === 0) {
      console.log(`[Token Detail] No price data for ${symbol.toUpperCase()}`);
      return res.status(404).json({ error: 'No price data found for this token' });
    }
    
    // Get technical indicators (optional - may not exist)
    let indicators = [];
    try {
      const limitValue = parseInt(days, 10);
      const indicatorsQuery = `
        SELECT date, rsi_14, rsi_7, rsi_30, sma_20, sma_50, ema_12, ema_26,
               macd, macd_signal, macd_histogram, bollinger_upper, bollinger_middle,
               bollinger_lower, volume_sma_20
        FROM technical_indicators 
        WHERE symbol = ?
        ORDER BY date DESC 
        LIMIT ${limitValue}
      `;
      indicators = await executeQuery(indicatorsQuery, [symbol.toUpperCase()]);
    } catch (error) {
      console.log('Technical indicators not available:', error.message);
    }
    
    // Get market cap data (optional - may not exist)
    let marketCapData = [];
    try {
      const limitValue = parseInt(days, 10);
      const marketCapQuery = `
        SELECT date, market_cap_usd, circulating_supply, total_supply
        FROM market_cap_data 
        WHERE symbol = ?
        ORDER BY date DESC 
        LIMIT ${limitValue}
      `;
      marketCapData = await executeQuery(marketCapQuery, [symbol.toUpperCase()]);
    } catch (error) {
      console.log('Market cap data not available:', error.message);
    }
    
    // Try to get market cap from market_dominance_history
    let marketCapFromDominance = null;
    try {
      const dominanceQuery = `
        SELECT market_cap_usd
        FROM market_dominance_history 
        WHERE symbol = ?
        ORDER BY date DESC 
        LIMIT 1
      `;
      const dominanceResult = await executeQuery(dominanceQuery, [symbol.toUpperCase()]);
      if (dominanceResult && dominanceResult.length > 0) {
        marketCapFromDominance = parseFloat(dominanceResult[0].market_cap_usd) || 0;
      }
    } catch (error) {
      console.log('Market dominance data not available:', error.message);
    }
    
    // Calculate statistics
    const stats = await calculateTokenStats(symbol.toUpperCase());
    
    // Generate investment recommendation (if indicators available)
    let recommendation = null;
    try {
      recommendation = await generateRecommendation(symbol.toUpperCase(), indicators[0] || null, stats);
    } catch (error) {
      console.log('Could not generate recommendation:', error.message);
    }
    
    const currentPrice = parseFloat(priceData[0]?.close) || 0;
    const changes = await calculatePriceChanges(symbol.toUpperCase(), currentPrice);
    
    res.json({
      token_info: tokenInfo[0],
      current_price: currentPrice,
      changes,
      stats,
      price_data: priceData.reverse().map(row => ({
        date: row.timestamp,
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume)
      })),
      indicators: indicators.reverse().map(row => ({
        date: row.date,
        rsi_14: parseFloat(row.rsi_14) || null,
        rsi_7: parseFloat(row.rsi_7) || null,
        rsi_30: parseFloat(row.rsi_30) || null,
        sma_20: parseFloat(row.sma_20) || null,
        sma_50: parseFloat(row.sma_50) || null,
        ema_12: parseFloat(row.ema_12) || null,
        ema_26: parseFloat(row.ema_26) || null,
        macd: parseFloat(row.macd) || null,
        macd_signal: parseFloat(row.macd_signal) || null,
        macd_histogram: parseFloat(row.macd_histogram) || null,
        bollinger_upper: parseFloat(row.bollinger_upper) || null,
        bollinger_middle: parseFloat(row.bollinger_middle) || null,
        bollinger_lower: parseFloat(row.bollinger_lower) || null,
        volume_sma_20: parseFloat(row.volume_sma_20) || null
      })),
      market_cap_data: marketCapData.reverse().map(row => ({
        date: row.date,
        market_cap_usd: parseFloat(row.market_cap_usd) || 0,
        circulating_supply: parseFloat(row.circulating_supply) || 0,
        total_supply: parseFloat(row.total_supply) || 0
      })),
      market_cap: {
        market_cap_usd: marketCapFromDominance || marketCapData[0]?.market_cap_usd || 0,
        market_cap_change_24h: 0,
        circulating_supply: marketCapData[0]?.circulating_supply || 0,
        total_supply: marketCapData[0]?.total_supply || 0
      },
      volume_24h: parseFloat(priceData[0]?.quote_asset_volume || priceData[0]?.volume || 0),
      quote_volume_24h: parseFloat(priceData[0]?.quote_asset_volume || 0),
      recommendation
    });
    
    console.log(`[Token Detail] Successfully returned data for ${symbol.toUpperCase()}`);
  } catch (error) {
    console.error(`[Token Detail] Error fetching token detail for ${symbol}:`, error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch token data',
      message: error.message,
      symbol: symbol.toUpperCase()
    });
  }
});

// GET /api/tokens/:symbol/chart - Get chart data for a token
router.get('/:symbol/chart', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '30d', interval = '1d' } = req.query;
    
    const days = getDaysFromPeriod(period);
    
    // Ensure days is a valid integer
    if (!days || isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'Invalid period parameter' });
    }

    const intervalConfig = getIntervalConfig(interval);
    if (!intervalConfig) {
      return res.status(400).json({ error: 'Invalid interval parameter' });
    }
    
    const limitValue = parseInt(days, 10);
    
    const query = `
      SELECT 
        ${intervalConfig.bucketSelect} AS bucket,
        SUBSTRING_INDEX(GROUP_CONCAT(open ORDER BY timestamp ASC), ',', 1) AS open,
        MAX(high) AS high,
        MIN(low) AS low,
        SUBSTRING_INDEX(GROUP_CONCAT(close ORDER BY timestamp DESC), ',', 1) AS close,
        SUM(volume) AS volume,
        SUM(quote_asset_volume) AS quote_volume
      FROM historical_prices 
      WHERE symbol = ?
        AND timestamp >= DATE_SUB(NOW(), INTERVAL ${limitValue} DAY)
      GROUP BY bucket
      ORDER BY bucket ASC
      LIMIT ${intervalConfig.maxPoints(limitValue)}
    `;
    
    const data = await executeQuery(query, [symbol.toUpperCase()]);

    const indicatorBucketSelect = intervalConfig.indicatorBucketSelect || intervalConfig.bucketSelect.replace(/timestamp/g, 'date');
    const indicatorQuery = `
      SELECT 
        ${indicatorBucketSelect} AS bucket,
        AVG(rsi_14) AS rsi_14,
        AVG(rsi_7) AS rsi_7,
        AVG(rsi_30) AS rsi_30,
        AVG(sma_20) AS sma_20,
        AVG(sma_50) AS sma_50,
        AVG(ema_12) AS ema_12,
        AVG(ema_26) AS ema_26,
        AVG(macd) AS macd,
        AVG(macd_signal) AS macd_signal,
        AVG(macd_histogram) AS macd_histogram,
        AVG(bollinger_upper) AS bollinger_upper,
        AVG(bollinger_middle) AS bollinger_middle,
        AVG(bollinger_lower) AS bollinger_lower,
        AVG(volume_sma_20) AS volume_sma_20
      FROM technical_indicators 
      WHERE symbol = ?
        AND date >= DATE_SUB(CURDATE(), INTERVAL ${limitValue} DAY)
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const indicatorRows = await executeQuery(indicatorQuery, [symbol.toUpperCase()]);
    const indicatorMap = new Map();
    indicatorRows.forEach(row => {
      const key = intervalConfig.formatBucket(row.bucket);
      indicatorMap.set(key, row);
    });

    const parseValue = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };

    const chartData = data.map(row => {
      const dateKey = intervalConfig.formatBucket(row.bucket);
      const indicators = indicatorMap.get(dateKey) || {};
      return {
        date: dateKey,
        open: parseValue(row.open),
        high: parseValue(row.high),
        low: parseValue(row.low),
        close: parseValue(row.close),
        volume: parseValue(row.volume),
        quote_volume: parseValue(row.quote_volume),
        rsi_14: parseValue(indicators.rsi_14),
        rsi_7: parseValue(indicators.rsi_7),
        rsi_30: parseValue(indicators.rsi_30),
        sma_20: parseValue(indicators.sma_20),
        sma_50: parseValue(indicators.sma_50),
        ema_12: parseValue(indicators.ema_12),
        ema_26: parseValue(indicators.ema_26),
        macd: parseValue(indicators.macd),
        macd_signal: parseValue(indicators.macd_signal),
        macd_histogram: parseValue(indicators.macd_histogram),
        bollinger_upper: parseValue(indicators.bollinger_upper),
        bollinger_middle: parseValue(indicators.bollinger_middle),
        bollinger_lower: parseValue(indicators.bollinger_lower),
        volume_sma_20: parseValue(indicators.volume_sma_20)
      };
    });
    
    res.json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// GET /api/tokens/:symbol/predict - Get price predictions for a token
router.get('/:symbol/predict', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 7 } = req.query;

    const predictionDays = Math.max(parseInt(days, 10) || 7, 7);
    const historyWindow = Math.max(predictionDays * 4, 180);
    const historyStart = new Date();
    historyStart.setDate(historyStart.getDate() - historyWindow);
    const historyStartDate = historyStart.toISOString().slice(0, 10);

    // Aggregate daily price/volume data
    const priceHistoryQuery = `
      SELECT
        DATE(timestamp) AS date,
        SUBSTRING_INDEX(GROUP_CONCAT(open ORDER BY timestamp ASC), ',', 1) AS open,
        MAX(high) AS high,
        MIN(low) AS low,
        SUBSTRING_INDEX(GROUP_CONCAT(close ORDER BY timestamp DESC), ',', 1) AS close,
        SUM(volume) AS volume,
        SUM(quote_asset_volume) AS quote_volume
      FROM historical_prices 
      WHERE symbol = ?
        AND DATE(timestamp) >= ?
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) ASC
      LIMIT 450
    `;
    const priceHistory = await executeQuery(priceHistoryQuery, [symbol.toUpperCase(), historyStartDate]);

    if (!priceHistory || priceHistory.length < 20) {
      return res.status(400).json({
        error: 'Insufficient historical data for prediction. Need at least 20 daily candles.'
      });
    }

    // Fetch technical indicators for the same period
    const indicatorQuery = `
      SELECT date, rsi_14, rsi_7, rsi_30, sma_20, sma_50, ema_12, ema_26,
             macd, macd_signal, macd_histogram, bollinger_upper, bollinger_middle,
             bollinger_lower, volume_sma_20
      FROM technical_indicators 
      WHERE symbol = ?
        AND date >= ?
      ORDER BY date ASC
    `;
    const indicatorRows = await executeQuery(indicatorQuery, [symbol.toUpperCase(), historyStartDate]);
    const indicatorMap = new Map();
    indicatorRows.forEach(row => {
      indicatorMap.set(formatDateKey(row.date), row);
    });

    const historicalDataset = priceHistory
      .map(row => {
        const dateKey = formatDateKey(row.date);
        const indicators = indicatorMap.get(dateKey) || {};
        return {
          date: dateKey,
          timestamp: row.date,
          open: parseFloat(row.open),
          high: parseFloat(row.high),
          low: parseFloat(row.low),
          close: parseFloat(row.close),
          volume: parseFloat(row.volume),
          quote_volume: parseFloat(row.quote_volume),
          rsi_14: indicators.rsi_14,
          rsi_7: indicators.rsi_7,
          rsi_30: indicators.rsi_30,
          sma_20: indicators.sma_20,
          sma_50: indicators.sma_50,
          ema_12: indicators.ema_12,
          ema_26: indicators.ema_26,
          macd: indicators.macd,
          macd_signal: indicators.macd_signal,
          macd_histogram: indicators.macd_histogram,
          bollinger_upper: indicators.bollinger_upper,
          bollinger_middle: indicators.bollinger_middle,
          bollinger_lower: indicators.bollinger_lower,
          volume_sma_20: indicators.volume_sma_20
        };
      })
      .filter(item => Number.isFinite(item.close));

    if (historicalDataset.length < 20) {
      return res.status(400).json({
        error: 'Unable to build prediction dataset from database records.'
      });
    }

    const latestIndicator = indicatorMap.get(historicalDataset[historicalDataset.length - 1].date) || null;
    
    // CLEAR CACHE để đảm bảo tính toán mới (không dùng cache cũ)
    predictionCache.clear();
    console.log(`[Prediction] Calculating new prediction for ${symbol}, days=${predictionDays}, currentPrice=${historicalDataset[historicalDataset.length - 1].close}`);
    
    // Tạm thời vô hiệu hóa cache để test constraint mới
    // const cacheKey = buildPredictionCacheKey(symbol, predictionDays, historicalDataset);
    // if (predictionCache.has(cacheKey)) {
    //   return res.json(predictionCache.get(cacheKey));
    // }

    // currentPriceOverride: ưu tiên giá mới nhất trong ngày hôm nay nếu có
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRows = historicalDataset.filter(r => {
      const raw = r.date || r.timestamp;
      if (!raw) return false;
      const iso =
        typeof raw === 'string'
          ? raw.slice(0, 10)
          : new Date(raw).toISOString().slice(0, 10);
      return iso === todayStr;
    });
    const currentPriceOverride =
      todayRows.length > 0
        ? todayRows[todayRows.length - 1].close
        : historicalDataset[historicalDataset.length - 1].close;

    const predictionResult = predictPrice(historicalDataset, predictionDays, latestIndicator, currentPriceOverride);
    
    const currentPrice = historicalDataset[historicalDataset.length - 1].close;

    // Sau khi đã clamp tất cả predictions, đồng bộ lại recommendation để dùng ĐÚNG giá dự báo ngày đầu (day 1)
    if (predictionResult.recommendation && predictionResult.predictions) {
      const firstDayPrices = [];
      const modelsSummary = [];
      
      Object.keys(predictionResult.predictions).forEach(modelKey => {
        const model = predictionResult.predictions[modelKey];
        if (model && model.predictions && Array.isArray(model.predictions) && model.predictions.length > 0) {
          // Tìm bản ghi day === 1, nếu không có thì dùng phần tử đầu tiên
          const firstEntry = model.predictions.find(p => p.day === 1) || model.predictions[0];
          if (firstEntry && typeof firstEntry.price === 'number') {
            const firstPrice = firstEntry.price;
            firstDayPrices.push(firstPrice);

            const modelChange = ((firstPrice - currentPrice) / currentPrice) * 100;
            let modelAction = 'HOLD';
            let modelActionVi = 'GIỮ';

            if (modelChange > 3) {
              modelAction = 'BUY';
              modelActionVi = 'MUA';
            } else if (modelChange < -3) {
              modelAction = 'SELL';
              modelActionVi = 'BÁN';
            } else if (modelChange > 1) {
              modelActionVi = 'GIỮ / THIÊN VỀ MUA NHẸ';
            } else if (modelChange < -1) {
              modelActionVi = 'GIỮ / THIÊN VỀ GIẢM TỶ TRỌNG';
            }

            const modelName =
              model.method ||
              model.category ||
              (modelKey === 'statistical'
                ? 'Mô hình Thống kê'
                : modelKey === 'machineLearning'
                ? 'Mô hình Machine Learning'
                : modelKey === 'deepLearning'
                ? 'Mô hình Deep Learning'
                : modelKey);

            modelsSummary.push({
              key: modelKey,
              name: modelName,
              action: modelAction,
              action_vi: modelActionVi,
              change: parseFloat(modelChange.toFixed(4))
            });
          }
        }
      });

      if (firstDayPrices.length > 0) {
        const avgFirst = firstDayPrices.reduce((sum, p) => sum + p, 0) / firstDayPrices.length;
        const changeFromCurrent = ((avgFirst - currentPrice) / currentPrice) * 100;
        
        predictionResult.recommendation.predictedPrice = parseFloat(avgFirst.toFixed(4));
        predictionResult.recommendation.predictedChange = parseFloat(changeFromCurrent.toFixed(4));

        // Cập nhật lại dòng tóm tắt đầu tiên trong details_vi cho khớp với dữ liệu đã clamp
        const summaryLine =
          changeFromCurrent >= 0
            ? `Mức giá dự báo trung bình cao hơn giá hiện tại khoảng ${changeFromCurrent.toFixed(
                2
              )}%, cho thấy xu hướng NHẸ tới TRUNG BÌNH theo chiều tăng (ngày đầu tiên trong horizon).`
            : `Mức giá dự báo trung bình thấp hơn giá hiện tại khoảng ${changeFromCurrent.toFixed(
                2
              )}%, cho thấy áp lực giảm giá hoặc điều chỉnh trong ngắn hạn (ngày đầu tiên trong horizon).`;

        const oldDetails = predictionResult.recommendation.details_vi || [];
        const keptDetails = oldDetails.filter(
          (line) =>
            !line.includes('Mức giá dự báo trung bình') &&
            !line.includes('Giá dự báo trung bình')
        );

        predictionResult.recommendation.details_vi = [
          summaryLine,
          ...keptDetails
        ];
      }

      // Ghi đè lại models và details_vi để chắc chắn dùng đúng dữ liệu đã clamp
      if (modelsSummary.length > 0) {
        predictionResult.recommendation.models = modelsSummary;

        const modelDetailsVi = modelsSummary.map((m) =>
          `${m.name}: khuyến nghị ${m.action_vi} với mức thay đổi dự kiến khoảng ${m.change.toFixed(
            2
          )}% so với giá hiện tại (ngày đầu tiên trong horizon).`
        );

        const baseDetails = predictionResult.recommendation.details_vi || [];
        const filteredBase = baseDetails.filter(
          (line) => !line.includes('Mô hình') && !line.includes('khuyến nghị')
        );

        predictionResult.recommendation.details_vi = [
          ...filteredBase,
          ...modelDetailsVi
        ];
      }

      // Lưu toàn bộ dữ liệu dự đoán vào bảng predicted_prices để so sánh với giá thực tế sau này
      try {
        const predictionDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const insertRows = [];

        Object.entries(predictionResult.predictions).forEach(([modelKey, model]) => {
          if (!model || !model.predictions || !Array.isArray(model.predictions)) return;

          model.predictions.forEach((p) => {
            const target = new Date();
            target.setDate(target.getDate() + (p.day || 1));

            insertRows.push([
              symbol.toUpperCase(),                          // symbol
              modelKey,                                      // model_key
              model.method || model.category || modelKey,    // model_name
              predictionDate,                                // prediction_date
              target.toISOString().slice(0, 10),             // target_date
              p.day || 1,                                    // horizon_day
              p.price,                                       // predicted_price (đã clamp)
              currentPrice                                   // current_price tại thời điểm dự đoán
            ]);
          });
        });

        if (insertRows.length > 0) {
          const insertSql = `
            INSERT INTO predicted_prices
              (symbol, model_key, model_name, prediction_date, target_date, horizon_day, predicted_price, current_price)
            VALUES ?
          `;
          await executeQuery(insertSql, [insertRows]);
        }
      } catch (insertErr) {
        console.error('Error inserting predicted prices into predicted_prices table:', insertErr.message);
      }
    }
    
    // setPredictionCache(cacheKey, predictionResult);
    
    // Final log check
    console.log(`[Prediction Complete] ${symbol}: currentPrice=${currentPrice.toFixed(2)}`);

    res.json(predictionResult);
  } catch (error) {
    console.error('Error generating price prediction:', error);
    res.status(500).json({ error: 'Failed to generate price prediction' });
  }
});

// Helper functions
function getDaysFromPeriod(period) {
  const periodMap = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  const days = periodMap[period] || 30;
  // Ensure we return an integer
  return parseInt(days, 10);
}

function getIntervalConfig(interval) {
  const configs = {
    '1h': {
      bucketSelect: "DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')",
      pointsPerDay: 24,
      maxPoints: (days) => Math.min(days * 24, 2000),
      formatBucket: (bucket) => bucket
    },
    '4h': {
      bucketSelect: "DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00')",
      pointsPerDay: 6,
      maxPoints: (days) => Math.min(days * 6, 1500),
      formatBucket: (bucket) => bucket
    },
    '1d': {
      bucketSelect: "DATE_FORMAT(timestamp, '%Y-%m-%d 00:00:00')",
      pointsPerDay: 1,
      maxPoints: (days) => Math.min(days, 1000),
      formatBucket: (bucket) => bucket
    },
    '1w': {
      bucketSelect: "DATE_FORMAT(DATE_SUB(timestamp, INTERVAL (WEEKDAY(timestamp)) DAY), '%Y-%m-%d 00:00:00')",
      pointsPerDay: 1 / 7,
      maxPoints: (days) => Math.min(Math.ceil(days / 7), 200),
      formatBucket: (bucket) => bucket
    }
  };
  return configs[interval] || configs['1d'];
}

function formatDateKey(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch (error) {
    return null;
  }
}

async function calculatePriceChanges(symbol, currentPrice) {
  try {
    // Lấy danh sách tất cả giá theo thời gian
    const allPricesQuery = `
      SELECT close, timestamp 
      FROM historical_prices 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT 10
    `;
    
    const allPrices = await executeQuery(allPricesQuery, [symbol]);
    
    // Tìm giá 1 ngày trước (skip 1 record đầu tiên là giá hiện tại)
    const price24h = allPrices[1] || null;
    
    // Tìm giá 7 ngày trước (skip 7 records)
    const price7d = allPrices[7] || null;
    
    // Tìm giá 30 ngày trước (hoặc record cuối cùng nếu không đủ 30 ngày)
    const price30d = allPrices[29] || allPrices[allPrices.length - 1] || null;
    
    const change1d = price24h && price24h.close ? ((currentPrice - price24h.close) / price24h.close * 100) : 0;
    const change7d = price7d && price7d.close ? ((currentPrice - price7d.close) / price7d.close * 100) : 0;
    const change30d = price30d && price30d.close ? ((currentPrice - price30d.close) / price30d.close * 100) : 0;
    
    return {
      '1d': parseFloat(change1d.toFixed(2)),
      '7d': parseFloat(change7d.toFixed(2)),
      '30d': parseFloat(change30d.toFixed(2))
    };
  } catch (error) {
    console.error('Error calculating price changes:', error);
    return { '1d': 0, '7d': 0, '30d': 0 };
  }
}

async function calculateTokenStats(symbol) {
  try {
    const query = `
      SELECT 
        MAX(high) as all_time_high,
        MIN(low) as all_time_low,
        AVG(volume) as avg_volume,
        AVG(quote_asset_volume) as avg_quote_volume,
        COUNT(*) as total_days,
        STDDEV(close) as volatility
      FROM historical_prices 
      WHERE symbol = ?
    `;
    
    const [stats] = await executeQuery(query, [symbol]);
    
    return {
      all_time_high: parseFloat(stats.all_time_high) || 0,
      all_time_low: parseFloat(stats.all_time_low) || 0,
      avg_volume: parseFloat(stats.avg_volume) || 0,
      avg_quote_volume: parseFloat(stats.avg_quote_volume) || 0,
      total_days: stats.total_days || 0,
      volatility: parseFloat(stats.volatility) || 0
    };
  } catch (error) {
    console.error('Error calculating token stats:', error);
    return {};
  }
}

async function generateRecommendation(symbol, indicators, stats) {
  try {
    let recommendation = 'HOLD';
    let confidence = 50;
    let reasoning = [];
    
    if (indicators) {
      const rsi = indicators.rsi_14;
      
      if (rsi < 30) {
        recommendation = 'BUY';
        confidence = 75;
        reasoning.push('RSI oversold (< 30) - potential buying opportunity');
      } else if (rsi > 70) {
        recommendation = 'SELL';
        confidence = 70;
        reasoning.push('RSI overbought (> 70) - potential selling opportunity');
      }
      
      // Check MACD signal
      if (indicators.macd > indicators.macd_signal) {
        if (recommendation === 'HOLD') {
          recommendation = 'BUY';
          confidence = 60;
        }
        reasoning.push('MACD bullish crossover detected');
      } else if (indicators.macd < indicators.macd_signal) {
        if (recommendation === 'HOLD') {
          recommendation = 'SELL';
          confidence = 60;
        }
        reasoning.push('MACD bearish crossover detected');
      }
    }
    
    // Check volatility
    if (stats.volatility > 0.1) {
      reasoning.push('High volatility detected - consider position sizing');
    }
    
    return {
      action: recommendation,
      confidence,
      reasoning,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating recommendation:', error);
    return {
      action: 'HOLD',
      confidence: 50,
      reasoning: ['Unable to generate recommendation'],
      timestamp: new Date().toISOString()
    };
  }
}

// Helper function to get market cap from CoinGecko API
// CoinGecko free API doesn't require API key, but has rate limits (10-50 calls/minute)
async function getMarketCapFromAPI(symbol) {
  try {
    // Map symbols to CoinGecko IDs
    const symbolToId = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'TRX': 'tron',
      'ADA': 'cardano',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'SUI': 'sui',
      'BCH': 'bitcoin-cash',
      'LTC': 'litecoin',
      'SHIB': 'shiba-inu',
      'TON': 'the-open-network',
      'DOT': 'polkadot',
      'MNT': 'mantle',
      'XMR': 'monero',
      'UNI': 'uniswap',
      'NEAR': 'near',
      'PEPE': 'pepe',
      'APT': 'aptos',
      'ICP': 'internet-computer',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'INJ': 'injective-protocol',
      'HBAR': 'hedera-hashgraph',
      'STX': 'stacks',
      'VET': 'vechain',
      'FIL': 'filecoin',
      'MKR': 'maker',
      'ATOM': 'cosmos',
      'GRT': 'the-graph',
      'AXS': 'axie-infinity',
      'LDO': 'lido-dao',
      'QNT': 'quant-network',
      'EOS': 'eos',
      'XTZ': 'tezos',
      'KSM': 'kusama',
      'THETA': 'theta-token',
      'BSV': 'bitcoin-sv',
      'DASH': 'dash',
      'ZEC': 'zcash',
      'XEM': 'nem',
      'IOTA': 'iota',
      'WAVES': 'waves',
      'ALGO': 'algorand',
      'XLM': 'stellar',
      'NEO': 'neo',
      'ETC': 'ethereum-classic'
    };

    const coinId = symbolToId[symbol.toUpperCase()];
    if (!coinId) {
      return { market_cap_usd: 0, market_cap_change_24h: 0, circulating_supply: 0, total_supply: 0 };
    }

    // Use CoinGecko public API (no API key required)
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
      timeout: 10000,
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });

    const data = response.data;
    return {
      market_cap_usd: data.market_data?.market_cap?.usd || 0,
      market_cap_change_24h: data.market_data?.market_cap_change_percentage_24h || 0,
      circulating_supply: data.market_data?.circulating_supply || 0,
      total_supply: data.market_data?.total_supply || 0
    };

  } catch (error) {
    console.log(`Failed to fetch market cap from CoinGecko for ${symbol}:`, error.message);
    return { market_cap_usd: 0, market_cap_change_24h: 0, circulating_supply: 0, total_supply: 0 };
  }
}

// POST /api/tokens/prediction-cache/clear - Clear prediction cache
router.post('/prediction-cache/clear', (req, res) => {
  const cacheSize = predictionCache.size;
  predictionCache.clear();
  console.log(`[Cache] Cleared ${cacheSize} cached predictions`);
  res.json({ success: true, cleared: cacheSize, message: `Cleared ${cacheSize} cached predictions` });
});

module.exports = router;
