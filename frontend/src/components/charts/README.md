# Chart Components

This directory contains all the chart components for the Crypto Analysis Dashboard.

## Components

### FearGreedChart.js
- **Purpose**: Displays Fear & Greed Index over time
- **Chart Type**: Line chart
- **Data Source**: `/api/indicators/fear-greed`
- **Features**: 
  - Interactive tooltips
  - Sentiment analysis
  - Color-coded legend
  - Mock data fallback

### MarketCapChart.js
- **Purpose**: Shows total market cap trend
- **Chart Type**: Line chart
- **Data Source**: `/api/market/trends`
- **Features**:
  - Formatted large numbers (T/B/M)
  - Trend analysis
  - Statistics display
  - Mock data fallback

### DominanceChart.js
- **Purpose**: Market dominance breakdown by token
- **Chart Type**: Doughnut chart
- **Data Source**: `/api/indicators/dominance`
- **Features**:
  - Top 10 tokens
  - Detailed breakdown
  - Market phase analysis
  - Mock data fallback

### VolumeChart.js
- **Purpose**: Top volume tokens (24h)
- **Chart Type**: Bar chart
- **Data Source**: `/api/tokens` (sorted by volume)
- **Features**:
  - Top 10 by volume
  - Volume statistics
  - Percentage breakdown
  - Mock data fallback

### ChartSkeleton.js
- **Purpose**: Loading placeholder for charts
- **Features**:
  - Animated skeleton
  - Consistent styling
  - Customizable title

## Usage

```jsx
import FearGreedChart from '../components/charts/FearGreedChart';

<FearGreedChart 
  data={fearGreedData} 
  isLoading={isLoading}
/>
```

## Mock Data

All charts include mock data generators for development and testing:

- `generateMockFearGreedData(days)` - 7-day FGI data
- `generateMockMarketCapData(days)` - Market cap trend
- `generateMockDominanceData()` - Token dominance
- `generateMockVolumeData()` - Volume rankings

## Styling

Charts use a consistent dark theme with:
- Primary colors: Teal (#00d4aa), Blue (#3b82f6)
- Dark backgrounds: #1f2937, #111827
- Interactive elements with hover effects
- Responsive design

## Dependencies

- `react-chartjs-2` - Chart.js wrapper for React
- `chart.js` - Core charting library
- `framer-motion` - Animations
- `lucide-react` - Icons
