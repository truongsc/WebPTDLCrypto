import axios from 'axios';

// Create axios instance with base configuration
// Use proxy in development (from package.json) or full URL in production
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000, // Increased timeout for prediction requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Log error for debugging
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    // Return error with more details
    return Promise.reject({
      ...error,
      message: error.response?.data?.error || error.message || 'Network error',
      status: error.response?.status
    });
  }
);

// API endpoints
export const apiEndpoints = {
  // Market data
  marketOverview: '/market/overview',
  marketTrends: '/market/trends',
  marketSectors: '/market/sectors',
  
  // Tokens
  tokens: '/tokens',
  tokenDetail: (symbol) => `/tokens/${symbol}`,
  tokenChart: (symbol) => `/tokens/${symbol}/chart`,
  
  // Indicators
  fearGreedIndex: '/indicators/fear-greed',
  marketRsi: '/indicators/market-rsi',
  marketCap: '/indicators/market-cap',
  dominance: '/indicators/dominance',
  technicalIndicators: '/indicators/technical',
  
  // Tools
  portfolioSimulator: '/tools/portfolio-simulator',
  riskCalculator: '/tools/risk-calculator',
  backtesting: '/tools/backtesting',
  alerts: '/tools/alerts',
  
  // News
  newsLatest: '/news/latest',
  newsSearch: '/news/search',
  newsSentiment: '/news/sentiment',
  newsEvents: '/news/events',
  newsImpactAnalysis: '/news/impact-analysis',
  
  // Community
  forum: '/community/forum',
  forumPost: (postId) => `/community/forum/${postId}`,
  polls: '/community/polls',
  tutorials: '/community/tutorials',
  tutorial: (tutorialId) => `/community/tutorials/${tutorialId}`,
  communitySentiment: '/community/sentiment',
};

// API functions
export const fetchMarketOverview = () => api.get(apiEndpoints.marketOverview);
export const fetchMarketTrends = (period = '7d') => api.get(apiEndpoints.marketTrends, { params: { period } });
export const fetchMarketSectors = () => api.get(apiEndpoints.marketSectors);

export const fetchTokens = () => api.get(apiEndpoints.tokens);
export const fetchTokenDetail = (symbol) => api.get(apiEndpoints.tokenDetail(symbol));
export const fetchTokenChart = (symbol, period = '30d', interval = '1d') => 
  api.get(apiEndpoints.tokenChart(symbol), { params: { period, interval } });
export const fetchTokenPrediction = (symbol, days = 7) => 
  api.get(`/tokens/${symbol}/predict`, { params: { days } });

export const fetchFearGreedIndex = (period = '30d') => 
  api.get(apiEndpoints.fearGreedIndex, { params: { period } });
export const fetchMarketRsi = (period = '30d') => 
  api.get(apiEndpoints.marketRsi, { params: { period } });
export const fetchMarketCap = (period = '30d') => 
  api.get(apiEndpoints.marketCap, { params: { period } });
export const fetchDominance = () => 
  api.get('/market/dominance');
export const fetchTechnicalIndicators = (period = '7d') => 
  api.get(apiEndpoints.technicalIndicators, { params: { period } });

export const simulatePortfolio = (portfolioData) => 
  api.post(apiEndpoints.portfolioSimulator, portfolioData);
export const calculateRisk = (riskData) => 
  api.post(apiEndpoints.riskCalculator, riskData);
export const runBacktest = (backtestData) => 
  api.post(apiEndpoints.backtesting, backtestData);

export const fetchLatestNews = (limit = 20, category = 'all') => 
  api.get(apiEndpoints.newsLatest, { params: { limit, category } });
export const searchNews = (query, options = {}) => 
  api.get(apiEndpoints.newsSearch, { params: { q: query, ...options } });
export const fetchNewsSentiment = (period = '7d', symbol = null) => 
  api.get(apiEndpoints.newsSentiment, { params: { period, symbol } });
export const fetchNewsEvents = (limit = 20, category = 'all') => 
  api.get(apiEndpoints.newsEvents, { params: { limit, category } });
export const analyzeNewsImpact = (symbol, days = 7) => 
  api.get(apiEndpoints.newsImpactAnalysis, { params: { symbol, days } });

export const fetchForumPosts = (options = {}) => 
  api.get(apiEndpoints.forum, { params: options });
export const fetchForumPost = (postId) => api.get(apiEndpoints.forumPost(postId));
export const fetchPolls = (limit = 10, status = 'active') => 
  api.get(apiEndpoints.polls, { params: { limit, status } });
export const fetchTutorials = (options = {}) => 
  api.get(apiEndpoints.tutorials, { params: options });
export const fetchTutorial = (tutorialId) => api.get(apiEndpoints.tutorial(tutorialId));
export const fetchCommunitySentiment = (period = '7d') => 
  api.get(apiEndpoints.communitySentiment, { params: { period } });

export default api;
