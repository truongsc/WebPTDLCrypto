import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext';

// Components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Home from './pages/Home';
import TokenAnalysis from './pages/TokenAnalysis';
import MarketIndicators from './pages/MarketIndicators';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <Router>
          <div className="App min-h-screen bg-dark-900 text-dark-100">
            <Layout>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/analysis" element={<TokenAnalysis />} />
                  <Route path="/indicators" element={<MarketIndicators />} />
                  <Route path="/analysis/:symbol" element={<TokenAnalysis />} />
                </Routes>
              </React.Suspense>
            </Layout>
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#f8fafc',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f8fafc',
                  },
                },
              }}
            />
          </div>
        </Router>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;