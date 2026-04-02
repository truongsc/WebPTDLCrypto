const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ensurePortFree } = require('./scripts/check_port');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/market', require('./routes/market_fast')); // Fast database routes
app.use('/api/indicators', require('./routes/indicators'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/news', require('./routes/news'));
app.use('/api/community', require('./routes/community'));

// Initialize cron jobs for data updates (temporarily disabled)
// require('./cron/update_data_cron');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe-token', (tokenSymbol) => {
    socket.join(`token-${tokenSymbol}`);
    console.log(`Client ${socket.id} subscribed to ${tokenSymbol}`);
  });
  
  socket.on('unsubscribe-token', (tokenSymbol) => {
    socket.leave(`token-${tokenSymbol}`);
    console.log(`Client ${socket.id} unsubscribed from ${tokenSymbol}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 8000;

// Ensure port is free before starting server
async function startServer() {
  try {
    console.log(`🔍 Checking if port ${PORT} is available...`);
    const portFree = await ensurePortFree(PORT);
    
    if (!portFree) {
      console.error(`❌ Could not free port ${PORT}. Please try again.`);
      process.exit(1);
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Crypto Analysis API ready`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Error starting server:', error.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };
