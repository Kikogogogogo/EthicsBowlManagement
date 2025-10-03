const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const { config, validateEnv } = require('./config/env');
const { connectToDatabase, disconnectFromDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const preApprovedEmailRoutes = require('./routes/pre-approved-email.routes');
const teamRoutes = require('./routes/team.routes');
const userRoutes = require('./routes/user.routes');
const matchRoutes = require('./routes/match.routes');
const scoreRoutes = require('./routes/score.routes');
const roomRoutes = require('./routes/room.routes');

// Import test routes (only in development)
let testAuthRoutes = null;
if (config.nodeEnv === 'development') {
  testAuthRoutes = require('./routes/test-auth.routes');
}

// Validate environment variables
validateEnv();

// Create Express app
const app = express();
app.set('trust proxy', true);

// Create HTTP server and Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Initialize WebSocket service
const WebSocketService = require('./services/websocket.service');
const websocketService = new WebSocketService(io);

// Make io and websocket service available globally
global.io = io;
global.websocketService = websocketService;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  optionsSuccessStatus: 200,
}));

// Rate limiting (only in production)
if (config.nodeEnv === 'production') {
  const limiter = rateLimit({
    windowMs: config.api.rateLimit.windowMs,
    max: config.api.rateLimit.max,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  console.log('Rate limiting enabled for production');
} else {
  console.log('Rate limiting disabled for development');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging middleware (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: config.app.name,
      version: config.app.version,
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    },
    message: 'Service is healthy'
  });
});

// API routes
app.use(`${config.api.prefix}/auth`, authRoutes);

// Test routes (only in development) - must be before generic routes
if (testAuthRoutes) {
  app.use(`${config.api.prefix}/test`, testAuthRoutes);
  console.log('🧪 Test routes enabled for development environment');
}

app.use(`${config.api.prefix}`, matchRoutes);
app.use(`${config.api.prefix}`, scoreRoutes);
app.use(`${config.api.prefix}/events`, eventRoutes);
app.use(`${config.api.prefix}/pre-approved-emails`, preApprovedEmailRoutes);
app.use(`${config.api.prefix}`, teamRoutes);
app.use(`${config.api.prefix}`, userRoutes);
app.use(`${config.api.prefix}/rooms`, roomRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: 'ROUTE_NOT_FOUND'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let errorCode = error.code || 'INTERNAL_ERROR';
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    error: errorCode,
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Start server function
async function startServer() {
  try {
    // Connect to database
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }
    
    // Start HTTP server with Socket.IO
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`API Base URL: http://localhost:${config.port}${config.api.prefix}`);
      console.log(`Health Check: http://localhost:${config.port}/health`);
      console.log(`WebSocket Server: ws://localhost:${config.port}`);
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      console.log(`\n📤 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          await disconnectFromDatabase();
          console.log('Database disconnected');
        } catch (error) {
          console.error('❌ Error disconnecting from database:', error);
        }
        
        console.log('👋 Process terminated gracefully');
        process.exit(0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.log('⚠️  Forced shutdown after 10 seconds');
        process.exit(1);
      }, 10000);
    };
    
    // Handle termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io }; 