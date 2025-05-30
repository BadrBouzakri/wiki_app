const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./utils/logger');
const database = require('./config/database');
const redis = require('./config/redis');
const elasticsearch = require('./config/elasticsearch');

// Routes
const authRoutes = require('./routes/auth');
const contextRoutes = require('./routes/context');
const suggestionRoutes = require('./routes/suggestions');
const documentationRoutes = require('./routes/documentation');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/documentation', documentationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: 'connected',
      elasticsearch: 'connected'
    }
  });
});

// Socket.IO for real-time suggestions
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('context-update', (contextData) => {
    // Broadcast context update to suggestion engine
    socket.broadcast.emit('new-context', contextData);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize services
async function initializeServices() {
  try {
    await database.init();
    await redis.init();
    await elasticsearch.init();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;

initializeServices().then(() => {
  server.listen(PORT, () => {
    logger.info(`🚀 Wiki App server running on port ${PORT}`);
  });
});

module.exports = { app, io };