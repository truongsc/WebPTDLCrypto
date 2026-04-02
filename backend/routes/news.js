const express = require('express');
const router = express.Router();
const axios = require('axios');
const { executeQuery } = require('../config/database');

// GET /api/news/latest - Get latest crypto news
router.get('/latest', async (req, res) => {
  try {
    const { limit = 20, category = 'all' } = req.query;
    
    // Get news from database first (if we have cached news)
    const cachedNewsQuery = `
      SELECT id, title, content, source, url, published_at, sentiment_score, category
      FROM crypto_news 
      WHERE published_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY published_at DESC
      LIMIT ?
    `;
    
    let news = await executeQuery(cachedNewsQuery, [limit]);
    
    // If no cached news or not enough, fetch from external APIs
    if (news.length < limit) {
      const externalNews = await fetchExternalNews(limit - news.length, category);
      
      // Save external news to database for caching
      if (externalNews.length > 0) {
        await saveNewsToDatabase(externalNews);
        news = [...news, ...externalNews];
      }
    }
    
    // Analyze sentiment if not already done
    const newsWithSentiment = await Promise.all(news.map(async (article) => {
      if (!article.sentiment_score) {
        article.sentiment_score = await analyzeSentiment(article.title + ' ' + article.content);
      }
      return article;
    }));
    
    res.json({
      news: newsWithSentiment.map(article => ({
        id: article.id,
        title: article.title,
        content: article.content?.substring(0, 200) + '...',
        full_content: article.content,
        source: article.source,
        url: article.url,
        published_at: article.published_at,
        sentiment_score: article.sentiment_score,
        sentiment: getSentimentLabel(article.sentiment_score),
        category: article.category
      })),
      total_count: newsWithSentiment.length,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/news/search - Search news by keywords
router.get('/search', async (req, res) => {
  try {
    const { q, category, dateFrom, dateTo, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    let query = `
      SELECT id, title, content, source, url, published_at, sentiment_score, category
      FROM crypto_news 
      WHERE (title LIKE ? OR content LIKE ?)
    `;
    
    const params = [`%${q}%`, `%${q}%`];
    
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (dateFrom) {
      query += ' AND published_at >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      query += ' AND published_at <= ?';
      params.push(dateTo);
    }
    
    query += ' ORDER BY published_at DESC LIMIT ?';
    params.push(limit);
    
    const results = await executeQuery(query, params);
    
    res.json({
      query: q,
      results: results.map(article => ({
        id: article.id,
        title: article.title,
        content: article.content?.substring(0, 200) + '...',
        source: article.source,
        url: article.url,
        published_at: article.published_at,
        sentiment_score: article.sentiment_score,
        sentiment: getSentimentLabel(article.sentiment_score),
        category: article.category
      })),
      total_count: results.length
    });
  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({ error: 'Failed to search news' });
  }
});

// GET /api/news/sentiment - Get sentiment analysis of news
router.get('/sentiment', async (req, res) => {
  try {
    const { period = '7d', symbol } = req.query;
    const days = getDaysFromPeriod(period);
    
    let query = `
      SELECT 
        DATE(published_at) as date,
        AVG(sentiment_score) as avg_sentiment,
        COUNT(*) as news_count,
        SUM(CASE WHEN sentiment_score > 0.1 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN sentiment_score < -0.1 THEN 1 ELSE 0 END) as negative_count,
        SUM(CASE WHEN sentiment_score BETWEEN -0.1 AND 0.1 THEN 1 ELSE 0 END) as neutral_count
      FROM crypto_news 
      WHERE published_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    `;
    
    const params = [days];
    
    if (symbol) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${symbol}%`, `%${symbol}%`);
    }
    
    query += `
      GROUP BY DATE(published_at)
      ORDER BY date ASC
    `;
    
    const sentimentData = await executeQuery(query, params);
    
    // Calculate overall sentiment metrics
    const overallSentiment = await calculateOverallSentiment(symbol, days);
    
    res.json({
      period,
      symbol: symbol || 'all',
      daily_sentiment: sentimentData.map(row => ({
        date: row.date,
        avg_sentiment: parseFloat(row.avg_sentiment),
        news_count: row.news_count,
        positive_count: row.positive_count,
        negative_count: row.negative_count,
        neutral_count: row.neutral_count,
        sentiment_label: getSentimentLabel(row.avg_sentiment)
      })),
      overall_sentiment: overallSentiment
    });
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment data' });
  }
});

// GET /api/news/events - Get upcoming crypto events
router.get('/events', async (req, res) => {
  try {
    const { limit = 20, category } = req.query;
    
    await ensureEventsTableSeeded();

    // Get events from database
    let query = `
      SELECT id, title, description, event_date, category, impact_level, source_url
      FROM crypto_events 
      WHERE event_date >= CURDATE()
    `;
    
    const params = [];
    
    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY event_date ASC LIMIT ?';
    params.push(limit);
    
    const events = await executeQuery(query, params);
    
    // If no events in database, fetch from external APIs
    if (events.length === 0) {
      const externalEvents = await fetchExternalEvents();
      await saveEventsToDatabase(externalEvents);
      
      // Re-fetch from database
      const newQuery = `
        SELECT id, title, description, event_date, category, impact_level, source_url
        FROM crypto_events 
        WHERE event_date >= CURDATE()
        ORDER BY event_date ASC 
        LIMIT ?
      `;
      const newEvents = await executeQuery(newQuery, [limit]);
      
      res.json({
        events: newEvents.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          category: event.category,
          impact_level: event.impact_level,
          source_url: event.source_url,
          days_until: Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        total_count: newEvents.length
      });
    } else {
      res.json({
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          category: event.category,
          impact_level: event.impact_level,
          source_url: event.source_url,
          days_until: Math.ceil((new Date(event.event_date) - new Date()) / (1000 * 60 * 60 * 24))
        })),
        total_count: events.length
      });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/news/impact-analysis - Analyze impact of news on prices
router.get('/impact-analysis', async (req, res) => {
  try {
    const { symbol, days = 7 } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required for impact analysis' });
    }
    
    // Get news and price data for correlation analysis
    const newsQuery = `
      SELECT DATE(published_at) as date, AVG(sentiment_score) as avg_sentiment, COUNT(*) as news_count
      FROM crypto_news 
      WHERE published_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND (title LIKE ? OR content LIKE ?)
      GROUP BY DATE(published_at)
      ORDER BY date ASC
    `;
    
    const priceQuery = `
      SELECT DATE(timestamp) as date, AVG(close) as avg_price, 
             ((MAX(close) - MIN(close)) / MIN(close) * 100) as daily_volatility
      FROM historical_prices 
      WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND symbol = ?
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;
    
    await ensureNewsTableSeeded();

    const [newsData, priceData] = await Promise.all([
      executeQuery(newsQuery, [days, `%${symbol}%`, `%${symbol}%`]),
      executeQuery(priceQuery, [days, symbol])
    ]);
    
    // Analyze correlation between news sentiment and price movements
    const impactAnalysis = analyzeNewsImpact(newsData, priceData);
    
    // Get significant news events
    const significantNewsQuery = `
      SELECT title, content, published_at, sentiment_score
      FROM crypto_news 
      WHERE published_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND (title LIKE ? OR content LIKE ?)
        AND ABS(sentiment_score) > 0.5
      ORDER BY ABS(sentiment_score) DESC
      LIMIT 10
    `;
    
    const significantNews = await executeQuery(significantNewsQuery, [days, `%${symbol}%`, `%${symbol}%`]);
    
    res.json({
      symbol,
      period_days: days,
      correlation_analysis: impactAnalysis,
      significant_news: significantNews.map(news => ({
        title: news.title,
        content: news.content?.substring(0, 200) + '...',
        published_at: news.published_at,
        sentiment_score: news.sentiment_score,
        sentiment: getSentimentLabel(news.sentiment_score),
        impact_level: getImpactLevel(news.sentiment_score)
      })),
      recommendations: generateNewsRecommendations(impactAnalysis, significantNews)
    });
  } catch (error) {
    console.error('Error analyzing news impact:', error);
    res.status(500).json({ error: 'Failed to analyze news impact' });
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
  return periodMap[period] || 7;
}

async function ensureNewsTableSeeded() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_news (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      source VARCHAR(120),
      url TEXT,
      published_at DATETIME,
      sentiment_score FLOAT DEFAULT 0,
      category VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [countRow] = await executeQuery('SELECT COUNT(*) as count FROM crypto_news');
  if ((countRow?.count || 0) === 0) {
    const seedNews = await fetchExternalNews(10, 'all');
    if (seedNews.length > 0) {
      for (const item of seedNews) {
        await executeQuery(
          `
            INSERT INTO crypto_news (title, content, source, url, published_at, sentiment_score, category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            item.title,
            item.content,
            item.source || 'ExternalFeed',
            item.url || '',
            item.published_at ? new Date(item.published_at) : new Date(),
            item.sentiment_score || 0,
            item.category || 'general'
          ]
        );
      }
    }
  }
}

async function fetchExternalNews(limit, category) {
  try {
    // Mock external news data - in production, integrate with real news APIs
    const mockNews = [
      {
        title: "Bitcoin Surges Past $45,000 as Institutional Adoption Grows",
        content: "Bitcoin has broken through the $45,000 resistance level as major institutions continue to add cryptocurrency to their portfolios. The move comes amid growing regulatory clarity and positive sentiment in the crypto market.",
        source: "CryptoNews",
        url: "https://example.com/bitcoin-surge",
        published_at: new Date(),
        sentiment_score: 0.8,
        category: "price_action"
      },
      {
        title: "Ethereum 2.0 Upgrade Shows Promising Results",
        content: "The latest Ethereum 2.0 upgrade has demonstrated significant improvements in network efficiency and transaction speed. Developers report successful implementation of key features.",
        source: "EthereumWeekly",
        url: "https://example.com/ethereum-upgrade",
        published_at: new Date(Date.now() - 3600000),
        sentiment_score: 0.6,
        category: "technology"
      },
      {
        title: "Regulatory Concerns Weigh on Altcoin Markets",
        content: "Recent regulatory announcements have created uncertainty in the altcoin markets, with many tokens experiencing increased volatility. Investors are advised to exercise caution.",
        source: "CryptoRegulation",
        url: "https://example.com/regulatory-concerns",
        published_at: new Date(Date.now() - 7200000),
        sentiment_score: -0.4,
        category: "regulation"
      }
    ];
    
    return mockNews.slice(0, limit);
  } catch (error) {
    console.error('Error fetching external news:', error);
    return [];
  }
}

async function fetchExternalEvents() {
  try {
    // Mock external events data - in production, integrate with real event APIs
    const mockEvents = [
      {
        title: "Bitcoin Halving Event",
        description: "The next Bitcoin halving event is expected to occur, reducing mining rewards from 6.25 BTC to 3.125 BTC per block.",
        event_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        category: "halving",
        impact_level: "high",
        source_url: "https://example.com/bitcoin-halving"
      },
      {
        title: "Ethereum Network Upgrade",
        description: "Major Ethereum network upgrade expected to improve scalability and reduce transaction fees.",
        event_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
        category: "upgrade",
        impact_level: "medium",
        source_url: "https://example.com/ethereum-upgrade"
      }
    ];
    
    return mockEvents;
  } catch (error) {
    console.error('Error fetching external events:', error);
    return [];
  }
}

async function saveNewsToDatabase(news) {
  try {
    for (const article of news) {
      const query = `
        INSERT INTO crypto_news (title, content, source, url, published_at, sentiment_score, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        sentiment_score = VALUES(sentiment_score)
      `;
      
      await executeQuery(query, [
        article.title,
        article.content,
        article.source,
        article.url,
        article.published_at,
        article.sentiment_score,
        article.category
      ]);
    }
  } catch (error) {
    console.error('Error saving news to database:', error);
  }
}

async function saveEventsToDatabase(events) {
  try {
    for (const event of events) {
      const query = `
        INSERT INTO crypto_events (title, description, event_date, category, impact_level, source_url)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        description = VALUES(description)
      `;
      
      await executeQuery(query, [
        event.title,
        event.description,
        event.event_date,
        event.category,
        event.impact_level,
        event.source_url
      ]);
    }
  } catch (error) {
    console.error('Error saving events to database:', error);
  }
}

async function ensureEventsTableSeeded() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      category VARCHAR(50),
      impact_level VARCHAR(20),
      source_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [countRow] = await executeQuery('SELECT COUNT(*) as count FROM crypto_events');
  if ((countRow?.count || 0) === 0) {
    const seedEvents = await fetchExternalEvents();
    if (seedEvents.length > 0) {
      await saveEventsToDatabase(seedEvents);
    }
  }
}

async function analyzeSentiment(text) {
  // Simplified sentiment analysis - in production, use a proper NLP service
  const positiveWords = ['surge', 'growth', 'adoption', 'breakthrough', 'success', 'positive', 'bullish', 'rise'];
  const negativeWords = ['crash', 'decline', 'concern', 'risk', 'negative', 'bearish', 'fall', 'drop'];
  
  const words = text.toLowerCase().split(' ');
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 0.1;
    if (negativeWords.includes(word)) score -= 0.1;
  });
  
  return Math.max(-1, Math.min(1, score));
}

function getSentimentLabel(score) {
  if (score > 0.3) return 'Positive';
  if (score < -0.3) return 'Negative';
  return 'Neutral';
}

function getImpactLevel(score) {
  const absScore = Math.abs(score);
  if (absScore > 0.7) return 'High';
  if (absScore > 0.4) return 'Medium';
  return 'Low';
}

async function calculateOverallSentiment(symbol, days) {
  let query = `
    SELECT 
      AVG(sentiment_score) as avg_sentiment,
      COUNT(*) as total_news,
      SUM(CASE WHEN sentiment_score > 0.1 THEN 1 ELSE 0 END) as positive_count,
      SUM(CASE WHEN sentiment_score < -0.1 THEN 1 ELSE 0 END) as negative_count
    FROM crypto_news 
    WHERE published_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
  `;
  
  const params = [days];
  
  if (symbol) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${symbol}%`, `%${symbol}%`);
  }
  
  const [result] = await executeQuery(query, params);
  
  return {
    overall_sentiment: parseFloat(result.avg_sentiment) || 0,
    sentiment_label: getSentimentLabel(result.avg_sentiment),
    total_news: result.total_news,
    positive_percentage: result.total_news > 0 ? (result.positive_count / result.total_news * 100) : 0,
    negative_percentage: result.total_news > 0 ? (result.negative_count / result.total_news * 100) : 0
  };
}

function analyzeNewsImpact(newsData, priceData) {
  // Create a map of date to price data
  const priceMap = {};
  priceData.forEach(day => {
    priceMap[day.date] = {
      price: day.avg_price,
      volatility: day.daily_volatility
    };
  });
  
  // Analyze correlation between news sentiment and price movements
  const correlations = [];
  
  newsData.forEach(newsDay => {
    const priceDay = priceMap[newsDay.date];
    if (priceDay) {
      correlations.push({
        date: newsDay.date,
        sentiment: newsDay.avg_sentiment,
        price: priceDay.price,
        volatility: priceDay.volatility,
        news_count: newsDay.news_count
      });
    }
  });
  
  // Calculate correlation coefficient
  const sentimentValues = correlations.map(c => c.sentiment);
  const volatilityValues = correlations.map(c => c.volatility);
  
  const correlationCoeff = calculateCorrelation(sentimentValues, volatilityValues);
  
  return {
    correlation_coefficient: correlationCoeff,
    correlation_strength: Math.abs(correlationCoeff) > 0.7 ? 'Strong' : 
                         Math.abs(correlationCoeff) > 0.4 ? 'Moderate' : 'Weak',
    correlation_direction: correlationCoeff > 0 ? 'Positive' : 'Negative',
    data_points: correlations.length,
    analysis: generateImpactAnalysis(correlationCoeff, correlations)
  };
}

function calculateCorrelation(data1, data2) {
  if (data1.length !== data2.length || data1.length === 0) return 0;
  
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

function generateImpactAnalysis(correlation, data) {
  let analysis = '';
  
  if (Math.abs(correlation) > 0.7) {
    analysis = 'Strong correlation detected between news sentiment and price volatility. News significantly impacts market movements.';
  } else if (Math.abs(correlation) > 0.4) {
    analysis = 'Moderate correlation between news sentiment and price movements. News has noticeable impact on the market.';
  } else {
    analysis = 'Weak correlation between news sentiment and price movements. Other factors may have stronger influence.';
  }
  
  if (correlation > 0) {
    analysis += ' Positive news tends to increase volatility.';
  } else if (correlation < 0) {
    analysis += ' Negative news tends to increase volatility.';
  }
  
  return analysis;
}

function generateNewsRecommendations(impactAnalysis, significantNews) {
  const recommendations = [];
  
  if (impactAnalysis.correlation_strength === 'Strong') {
    recommendations.push({
      type: 'trading',
      message: 'Strong correlation between news and price movements detected',
      recommendation: 'Monitor news sentiment closely for trading signals'
    });
  }
  
  const highImpactNews = significantNews.filter(news => Math.abs(news.sentiment_score) > 0.7);
  if (highImpactNews.length > 0) {
    recommendations.push({
      type: 'risk',
      message: `${highImpactNews.length} high-impact news events detected`,
      recommendation: 'Consider adjusting position sizes during high-impact news periods'
    });
  }
  
  if (impactAnalysis.correlation_direction === 'Positive') {
    recommendations.push({
      type: 'sentiment',
      message: 'Positive correlation between sentiment and volatility',
      recommendation: 'Positive news may increase market volatility - prepare for larger price swings'
    });
  }
  
  return recommendations;
}

module.exports = router;
