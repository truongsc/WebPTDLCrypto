const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// POST /api/tools/portfolio-simulator - Portfolio simulation and optimization
router.post('/portfolio-simulator', async (req, res) => {
  try {
    const { portfolio, initialAmount, rebalanceFrequency = 'monthly' } = req.body;
    
    if (!portfolio || !Array.isArray(portfolio) || portfolio.length === 0) {
      return res.status(400).json({ error: 'Portfolio array is required' });
    }
    
    // Validate portfolio allocation
    const totalAllocation = portfolio.reduce((sum, token) => sum + (token.allocation || 0), 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return res.status(400).json({ 
        error: 'Portfolio allocation must sum to 100%',
        current_total: totalAllocation
      });
    }
    
    // Get current prices for all tokens
    const symbols = portfolio.map(p => p.symbol);
    const priceQuery = `
      SELECT symbol, close as price
      FROM (
        SELECT symbol, close,
               ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM historical_prices
      ) latest
      WHERE rn = 1 AND symbol IN (${symbols.map(() => '?').join(',')})
    `;
    const currentPrices = await executeQuery(priceQuery, symbols);
    
    // Calculate portfolio metrics
    const portfolioAnalysis = await analyzePortfolio(portfolio, currentPrices, initialAmount);
    
    // Get historical performance simulation
    const historicalSimulation = await simulateHistoricalPerformance(portfolio, 365); // 1 year
    
    // Generate optimization suggestions
    const optimizationSuggestions = await generateOptimizationSuggestions(portfolio, currentPrices);
    
    res.json({
      portfolio_analysis: portfolioAnalysis,
      historical_simulation: historicalSimulation,
      optimization_suggestions: optimizationSuggestions,
      rebalance_recommendations: generateRebalanceRecommendations(portfolio, currentPrices),
      risk_assessment: await assessPortfolioRisk(portfolio, currentPrices)
    });
  } catch (error) {
    console.error('Error in portfolio simulator:', error);
    res.status(500).json({ error: 'Failed to simulate portfolio' });
  }
});

// POST /api/tools/risk-calculator - Risk assessment and position sizing
router.post('/risk-calculator', async (req, res) => {
  try {
    const { 
      capital, 
      riskTolerance, 
      stopLoss, 
      tokens,
      correlationAnalysis = true 
    } = req.body;
    
    if (!capital || !riskTolerance || !tokens || !Array.isArray(tokens)) {
      return res.status(400).json({ 
        error: 'Capital, risk tolerance, and tokens array are required' 
      });
    }
    
    // Get token data for risk calculation
    const symbols = tokens.map(t => t.symbol);
    const tokenDataQuery = `
      SELECT 
        symbol,
        close as current_price,
        STDDEV(close) as price_volatility,
        AVG(volume) as avg_volume
      FROM (
        SELECT symbol, close, volume,
               ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM historical_prices
        WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ) recent_data
      WHERE rn = 1 AND symbol IN (${symbols.map(() => '?').join(',')})
      GROUP BY symbol, close
    `;
    const tokenData = await executeQuery(tokenDataQuery, symbols);
    
    // Calculate position sizes
    const positionSizes = await calculatePositionSizes(
      tokens, 
      tokenData, 
      capital, 
      riskTolerance, 
      stopLoss
    );
    
    // Calculate portfolio risk metrics
    const riskMetrics = await calculatePortfolioRiskMetrics(
      tokens, 
      tokenData, 
      positionSizes, 
      capital
    );
    
    // Correlation analysis if requested
    let correlationData = null;
    if (correlationAnalysis && tokens.length > 1) {
      correlationData = await analyzeCorrelations(symbols);
    }
    
    res.json({
      position_sizes: positionSizes,
      risk_metrics: riskMetrics,
      correlation_analysis: correlationData,
      recommendations: generateRiskRecommendations(riskMetrics, positionSizes)
    });
  } catch (error) {
    console.error('Error in risk calculator:', error);
    res.status(500).json({ error: 'Failed to calculate risk metrics' });
  }
});

// POST /api/tools/backtesting - Backtest trading strategies
router.post('/backtesting', async (req, res) => {
  try {
    const { 
      strategy, 
      tokens, 
      startDate, 
      endDate,
      initialCapital = 10000,
      commission = 0.001 // 0.1%
    } = req.body;
    
    if (!strategy || !tokens || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Strategy, tokens, start date, and end date are required' 
      });
    }
    
    const symbols = tokens.map(t => t.symbol);
    const backtestResults = await runBacktest(
      strategy, 
      symbols, 
      startDate, 
      endDate, 
      initialCapital, 
      commission
    );
    
    res.json(backtestResults);
  } catch (error) {
    console.error('Error in backtesting:', error);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

// POST /api/tools/alerts - Set up price and indicator alerts
router.post('/alerts', async (req, res) => {
  try {
    const { 
      userId, 
      alertType, 
      conditions, 
      notificationMethod,
      isActive = true 
    } = req.body;
    
    if (!alertType || !conditions) {
      return res.status(400).json({ 
        error: 'Alert type and conditions are required' 
      });
    }
    
    // Validate alert conditions
    const validationResult = validateAlertConditions(alertType, conditions);
    if (!validationResult.valid) {
      return res.status(400).json({ 
        error: 'Invalid alert conditions', 
        details: validationResult.errors 
      });
    }
    
    // Save alert to database
    const alertId = await saveAlert({
      userId,
      alertType,
      conditions,
      notificationMethod,
      isActive,
      createdAt: new Date()
    });
    
    res.json({
      alert_id: alertId,
      message: 'Alert created successfully',
      status: 'active'
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// GET /api/tools/alerts/:userId - Get user alerts
router.get('/alerts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const alertsQuery = `
      SELECT id, alert_type, conditions, notification_method, is_active, created_at, triggered_at
      FROM user_alerts 
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `;
    
    const alerts = await executeQuery(alertsQuery, [userId]);
    
    res.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        alert_type: alert.alert_type,
        conditions: JSON.parse(alert.conditions),
        notification_method: alert.notification_method,
        is_active: alert.is_active,
        created_at: alert.created_at,
        triggered_at: alert.triggered_at
      }))
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// DELETE /api/tools/alerts/:alertId - Delete an alert
router.delete('/alerts/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const deleteQuery = 'DELETE FROM user_alerts WHERE id = ?';
    const result = await executeQuery(deleteQuery, [alertId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// Helper functions
async function analyzePortfolio(portfolio, currentPrices, initialAmount) {
  const priceMap = {};
  currentPrices.forEach(p => priceMap[p.symbol] = p.price);
  
  const analysis = {
    total_value: 0,
    total_cost: initialAmount,
    total_return: 0,
    total_return_percent: 0,
    diversification_score: 0,
    tokens: []
  };
  
  for (const token of portfolio) {
    const currentPrice = priceMap[token.symbol] || 0;
    const allocation = token.allocation / 100;
    const tokenValue = initialAmount * allocation;
    const tokenShares = tokenValue / (token.entryPrice || currentPrice);
    const currentTokenValue = tokenShares * currentPrice;
    
    analysis.tokens.push({
      symbol: token.symbol,
      allocation: token.allocation,
      entry_price: token.entryPrice || currentPrice,
      current_price: currentPrice,
      shares: tokenShares,
      current_value: currentTokenValue,
      return: currentTokenValue - tokenValue,
      return_percent: ((currentTokenValue - tokenValue) / tokenValue * 100)
    });
    
    analysis.total_value += currentTokenValue;
  }
  
  analysis.total_return = analysis.total_value - analysis.total_cost;
  analysis.total_return_percent = (analysis.total_return / analysis.total_cost * 100);
  analysis.diversification_score = calculateDiversificationScore(portfolio);
  
  return analysis;
}

async function simulateHistoricalPerformance(portfolio, days) {
  const symbols = portfolio.map(p => p.symbol);
  
  const query = `
    SELECT symbol, timestamp, close
    FROM historical_prices 
    WHERE symbol IN (${symbols.map(() => '?').join(',')})
      AND timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ORDER BY symbol, timestamp ASC
  `;
  
  const historicalData = await executeQuery(query, [...symbols, days]);
  
  // Group data by symbol
  const dataBySymbol = {};
  historicalData.forEach(row => {
    if (!dataBySymbol[row.symbol]) {
      dataBySymbol[row.symbol] = [];
    }
    dataBySymbol[row.symbol].push({
      date: row.timestamp,
      price: row.close
    });
  });
  
  // Calculate portfolio performance over time
  const performance = [];
  const dates = Object.values(dataBySymbol)[0]?.map(d => d.date) || [];
  
  for (const date of dates) {
    let portfolioValue = 0;
    let validTokens = 0;
    
    for (const token of portfolio) {
      const tokenData = dataBySymbol[token.symbol];
      const dayData = tokenData?.find(d => d.date.getTime() === date.getTime());
      
      if (dayData) {
        const allocation = token.allocation / 100;
        const tokenValue = 10000 * allocation; // Assuming $10,000 initial
        const tokenShares = tokenValue / (token.entryPrice || dayData.price);
        portfolioValue += tokenShares * dayData.price;
        validTokens++;
      }
    }
    
    if (validTokens === portfolio.length) {
      performance.push({
        date: date,
        portfolio_value: portfolioValue,
        return_percent: ((portfolioValue - 10000) / 10000 * 100)
      });
    }
  }
  
  return performance;
}

async function generateOptimizationSuggestions(portfolio, currentPrices) {
  const suggestions = [];
  
  // Check for over-concentration
  const maxAllocation = Math.max(...portfolio.map(p => p.allocation));
  if (maxAllocation > 50) {
    suggestions.push({
      type: 'concentration',
      message: `Token with ${maxAllocation}% allocation may be over-concentrated. Consider diversifying.`,
      recommendation: 'Reduce allocation to max 30% per token'
    });
  }
  
  // Check for low diversification
  const diversificationScore = calculateDiversificationScore(portfolio);
  if (diversificationScore < 0.7) {
    suggestions.push({
      type: 'diversification',
      message: 'Portfolio could benefit from more diversification',
      recommendation: 'Consider adding more tokens or sectors'
    });
  }
  
  // Check for correlation
  const symbols = portfolio.map(p => p.symbol);
  if (symbols.length > 1) {
    const correlation = await analyzeCorrelations(symbols);
    const highCorrelation = correlation.correlations.find(c => Math.abs(c.correlation) > 0.8);
    
    if (highCorrelation) {
      suggestions.push({
        type: 'correlation',
        message: `High correlation detected between ${highCorrelation.token1} and ${highCorrelation.token2}`,
        recommendation: 'Consider reducing exposure to one of these tokens'
      });
    }
  }
  
  return suggestions;
}

function calculateDiversificationScore(portfolio) {
  // Herfindahl-Hirschman Index for diversification
  const hhi = portfolio.reduce((sum, token) => {
    const weight = token.allocation / 100;
    return sum + (weight * weight);
  }, 0);
  
  // Convert to diversification score (0-1, higher is better)
  return 1 - hhi;
}

async function calculatePositionSizes(tokens, tokenData, capital, riskTolerance, stopLoss) {
  const positionSizes = [];
  
  for (const token of tokens) {
    const data = tokenData.find(t => t.symbol === token.symbol);
    if (!data) continue;
    
    const riskPerTrade = capital * (riskTolerance / 100);
    const priceRisk = Math.abs(token.entryPrice - stopLoss);
    const riskRatio = priceRisk / token.entryPrice;
    
    const positionSize = riskPerTrade / priceRisk;
    const positionValue = positionSize * token.entryPrice;
    const positionPercent = (positionValue / capital * 100);
    
    positionSizes.push({
      symbol: token.symbol,
      entry_price: token.entryPrice,
      stop_loss: stopLoss,
      position_size: positionSize,
      position_value: positionValue,
      position_percent: positionPercent,
      risk_amount: riskPerTrade,
      risk_reward_ratio: riskRatio
    });
  }
  
  return positionSizes;
}

async function calculatePortfolioRiskMetrics(tokens, tokenData, positionSizes, capital) {
  // Calculate portfolio volatility
  const portfolioWeights = positionSizes.map(p => p.position_percent / 100);
  const individualVolatilities = tokenData.map(t => t.price_volatility || 0);
  
  // Simplified portfolio volatility calculation
  const portfolioVolatility = Math.sqrt(
    portfolioWeights.reduce((sum, weight, i) => 
      sum + (weight * weight * individualVolatilities[i] * individualVolatilities[i]), 0
    )
  );
  
  // Calculate Value at Risk (VaR) - 95% confidence
  const var95 = capital * portfolioVolatility * 1.645; // 95% VaR
  
  // Calculate maximum drawdown potential
  const maxDrawdown = capital * portfolioVolatility * 2; // Rough estimate
  
  return {
    portfolio_volatility: portfolioVolatility,
    value_at_risk_95: var95,
    max_drawdown_potential: maxDrawdown,
    sharpe_ratio: 0.5, // Placeholder - would need risk-free rate
    beta: 1.2, // Placeholder - would need market data
    correlation_with_market: 0.7 // Placeholder
  };
}

async function analyzeCorrelations(symbols) {
  if (symbols.length < 2) {
    return { correlations: [] };
  }
  
  // Get price data for correlation analysis
  const query = `
    SELECT symbol, DATE(timestamp) as date, close
    FROM historical_prices 
    WHERE symbol IN (${symbols.map(() => '?').join(',')})
      AND timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    ORDER BY symbol, date
  `;
  
  const priceData = await executeQuery(query, symbols);
  
  // Group by symbol and calculate correlations
  const dataBySymbol = {};
  priceData.forEach(row => {
    if (!dataBySymbol[row.symbol]) {
      dataBySymbol[row.symbol] = [];
    }
    dataBySymbol[row.symbol].push(row.close);
  });
  
  const correlations = [];
  const symbolPairs = [];
  
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      symbolPairs.push([symbols[i], symbols[j]]);
    }
  }
  
  for (const [symbol1, symbol2] of symbolPairs) {
    const data1 = dataBySymbol[symbol1];
    const data2 = dataBySymbol[symbol2];
    
    if (data1 && data2 && data1.length === data2.length) {
      const correlation = calculateCorrelation(data1, data2);
      correlations.push({
        token1: symbol1,
        token2: symbol2,
        correlation: correlation,
        strength: Math.abs(correlation) > 0.8 ? 'Strong' : 
                 Math.abs(correlation) > 0.5 ? 'Moderate' : 'Weak'
      });
    }
  }
  
  return { correlations };
}

function calculateCorrelation(data1, data2) {
  const n = data1.length;
  const sum1 = data1.reduce((sum, val) => sum + val, 0);
  const sum2 = data2.reduce((sum, val) => sum + val, 0);
  const sum1Sq = data1.reduce((sum, val) => sum + val * val, 0);
  const sum2Sq = data2.reduce((sum, val) => sum + val * val, 0);
  const pSum = data1.reduce((sum, val, i) => sum + val * data2[i], 0);
  
  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
  
  return den === 0 ? 0 : num / den;
}

async function runBacktest(strategy, symbols, startDate, endDate, initialCapital, commission) {
  // Get historical data for backtesting
  const query = `
    SELECT symbol, timestamp, open, high, low, close, volume
    FROM historical_prices 
    WHERE symbol IN (${symbols.map(() => '?').join(',')})
      AND timestamp BETWEEN ? AND ?
    ORDER BY symbol, timestamp ASC
  `;
  
  const historicalData = await executeQuery(query, [...symbols, startDate, endDate]);
  
  // Simulate strategy execution
  const results = {
    initial_capital: initialCapital,
    final_capital: initialCapital,
    total_return: 0,
    total_return_percent: 0,
    trades: [],
    drawdown: 0,
    sharpe_ratio: 0,
    win_rate: 0,
    profit_factor: 0
  };
  
  // This is a simplified backtest - in reality, you'd implement the specific strategy logic
  // For now, return a mock result
  const mockReturn = 0.15; // 15% return
  results.final_capital = initialCapital * (1 + mockReturn);
  results.total_return = results.final_capital - initialCapital;
  results.total_return_percent = mockReturn * 100;
  
  return results;
}

function validateAlertConditions(alertType, conditions) {
  const errors = [];
  
  switch (alertType) {
    case 'price':
      if (!conditions.symbol || !conditions.threshold) {
        errors.push('Symbol and threshold are required for price alerts');
      }
      break;
    case 'rsi':
      if (!conditions.symbol || !conditions.threshold) {
        errors.push('Symbol and threshold are required for RSI alerts');
      }
      break;
    case 'volume':
      if (!conditions.symbol || !conditions.threshold) {
        errors.push('Symbol and threshold are required for volume alerts');
      }
      break;
    default:
      errors.push('Invalid alert type');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

async function saveAlert(alertData) {
  const query = `
    INSERT INTO user_alerts (user_id, alert_type, conditions, notification_method, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const result = await executeQuery(query, [
    alertData.userId,
    alertData.alertType,
    JSON.stringify(alertData.conditions),
    alertData.notificationMethod,
    alertData.isActive,
    alertData.createdAt
  ]);
  
  return result.insertId;
}

function generateRebalanceRecommendations(portfolio, currentPrices) {
  const recommendations = [];
  
  // Check for drift from target allocation
  for (const token of portfolio) {
    const currentPrice = currentPrices.find(p => p.symbol === token.symbol)?.price;
    if (currentPrice) {
      const targetAllocation = token.allocation;
      // This would need current portfolio value to calculate actual allocation
      // For now, provide general recommendations
      
      if (targetAllocation > 40) {
        recommendations.push({
          symbol: token.symbol,
          action: 'Reduce allocation',
          reason: 'Over-concentration risk',
          suggested_allocation: Math.min(targetAllocation * 0.8, 30)
        });
      }
    }
  }
  
  return recommendations;
}

async function assessPortfolioRisk(portfolio, currentPrices) {
  const riskFactors = {
    concentration_risk: 'Medium',
    volatility_risk: 'Medium',
    correlation_risk: 'Low',
    liquidity_risk: 'Low',
    overall_risk: 'Medium'
  };
  
  // Analyze concentration
  const maxAllocation = Math.max(...portfolio.map(p => p.allocation));
  if (maxAllocation > 50) {
    riskFactors.concentration_risk = 'High';
  } else if (maxAllocation > 30) {
    riskFactors.concentration_risk = 'Medium';
  } else {
    riskFactors.concentration_risk = 'Low';
  }
  
  // Overall risk assessment
  const riskScores = {
    'Low': 1,
    'Medium': 2,
    'High': 3
  };
  
  const avgRiskScore = Object.values(riskFactors)
    .slice(0, -1)
    .reduce((sum, risk) => sum + riskScores[risk], 0) / 4;
  
  if (avgRiskScore >= 2.5) {
    riskFactors.overall_risk = 'High';
  } else if (avgRiskScore >= 1.5) {
    riskFactors.overall_risk = 'Medium';
  } else {
    riskFactors.overall_risk = 'Low';
  }
  
  return riskFactors;
}

function generateRiskRecommendations(riskMetrics, positionSizes) {
  const recommendations = [];
  
  if (riskMetrics.portfolio_volatility > 0.05) {
    recommendations.push({
      type: 'volatility',
      message: 'High portfolio volatility detected',
      recommendation: 'Consider reducing position sizes or adding stable assets'
    });
  }
  
  const totalExposure = positionSizes.reduce((sum, pos) => sum + pos.position_percent, 0);
  if (totalExposure > 100) {
    recommendations.push({
      type: 'leverage',
      message: 'Portfolio exposure exceeds available capital',
      recommendation: 'Reduce position sizes to stay within capital limits'
    });
  }
  
  return recommendations;
}

module.exports = router;
