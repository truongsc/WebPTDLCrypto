import React, { forwardRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CandlestickController,
  CandlestickElement,
  zoomPlugin
);

const CandlestickChart = forwardRef(({ data, period = '30d', interval = '1d', zoomOptions }, ref) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-dark-400">
        No chart data available
      </div>
    );
  }

  const timeUnit = (() => {
    if (interval === '1h' || interval === '4h') return 'hour';
    if (interval === '1w') return 'week';
    return 'day';
  })();

  // Prepare candlestick data format: [timestamp, open, high, low, close]
  const candlestickData = data.map(item => ({
    x: new Date(item.date).getTime(),
    o: parseFloat(item.open),
    h: parseFloat(item.high),
    l: parseFloat(item.low),
    c: parseFloat(item.close)
  }));

  const volumeData = data.map(item => ({
    x: new Date(item.date).getTime(),
    y: parseFloat(item.quote_volume || item.quoteVolume || item.volume || 0) || 0,
    rawVolume: parseFloat(item.quote_volume || item.quoteVolume || item.volume || 0) || 0
  }));

  const indicatorDefinitions = [
    { key: 'sma_20', label: 'SMA (20)', color: 'rgba(251, 191, 36, 0.9)', dash: [6, 4] },
    { key: 'sma_50', label: 'SMA (50)', color: 'rgba(248, 250, 252, 0.8)', dash: [4, 4] },
    { key: 'ema_12', label: 'EMA (12)', color: '#22c55e' },
    { key: 'ema_26', label: 'EMA (26)', color: '#6366f1', dash: [3, 3] }
  ];

  const indicatorDatasets = indicatorDefinitions
    .map(def => {
      const series = data.map(item => {
        const value = item[def.key];
        if (value === null || value === undefined) return { x: new Date(item.date).getTime(), y: null };
        const num = typeof value === 'number' ? value : parseFloat(value);
        return {
          x: new Date(item.date).getTime(),
          y: Number.isFinite(num) ? num : null
        };
      });
      const hasValues = series.some(point => point.y !== null);
      if (!hasValues) return null;
      return {
        label: def.label,
        type: 'line',
        data: series,
        borderColor: def.color,
        borderWidth: 1.5,
        borderDash: def.dash || [],
        pointRadius: 0,
        spanGaps: true,
        yAxisID: 'price'
      };
    })
    .filter(Boolean);

  const rsiDefinitions = [
    { key: 'rsi_14', label: 'RSI (14)', color: 'rgb(248, 113, 113)' }
  ];

  const rsiDatasets = rsiDefinitions
    .map(def => {
      const series = data.map(item => ({
        x: new Date(item.date).getTime(),
        y: Number.isFinite(parseFloat(item[def.key])) ? parseFloat(item[def.key]) : null
      }));
      const hasValues = series.some(point => point.y !== null);
      if (!hasValues) return null;
      return {
        label: def.label,
        type: 'line',
        data: series,
        borderColor: def.color,
        borderWidth: 1.5,
        borderDash: [5, 2],
        pointRadius: 0,
        spanGaps: true,
        yAxisID: 'indicator'
      };
    })
    .filter(Boolean);

  const chartData = {
    datasets: [
      {
        label: 'Price',
        type: 'candlestick',
        data: candlestickData,
        yAxisID: 'price',
        color: {
          up: '#10b981',
          down: '#ef4444',
          unchanged: '#9ca3af'
        }
      },
      ...indicatorDatasets,
      ...rsiDatasets,
      {
        label: 'Volume',
        type: 'bar',
        data: volumeData,
        yAxisID: 'volume',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: function(context) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          },
          label: function(context) {
            if (context.dataset.type === 'candlestick') {
              const point = context.parsed;
              return [
                `Open: $${point.o?.toFixed(4) || '0.0000'}`,
                `Close: $${point.c?.toFixed(4) || '0.0000'}`
              ];
            }
            if (context.dataset.label === 'Volume') {
              const rawVolume = context.raw?.rawVolume ?? 0;
              return `Volume: ${formatVolume(rawVolume)}`;
            }
            return null;
          },
          labelColor: () => ({
            borderColor: 'rgba(0,0,0,0)',
            backgroundColor: 'rgba(0,0,0,0)'
          })
        }
      },
      zoom: zoomOptions || {}
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeUnit,
          displayFormats: {
            hour: 'MMM dd HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45
        }
      },
      price: {
        position: 'left',
        grid: {
          color: 'rgba(55, 65, 81, 0.3)',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return formatPrice(value);
          }
        }
      },
      volume: {
        position: 'right',
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          color: '#475569',
          callback: function(value) {
            return formatVolume(value);
          }
        }
      },
      indicator: {
        type: 'linear',
        position: 'right',
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
          color: 'rgba(55, 65, 81, 0.12)',
        },
        ticks: {
          color: '#fbbf24',
          stepSize: 20
        }
      }
    }
  };

  return <Chart ref={ref} type="candlestick" data={chartData} options={options} />;
});

const formatPrice = (price) => {
  if (!price && price !== 0) return '$0.00';
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
};

const formatVolume = (volume) => {
  if (!volume || volume === 0) return '0';
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(2);
};

export default CandlestickChart;

