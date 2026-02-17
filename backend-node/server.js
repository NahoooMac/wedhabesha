const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const auth2faRoutes = require('./routes/auth2fa');
const weddingRoutes = require('./routes/weddings');
const guestRoutes = require('./routes/guests');
const budgetRoutes = require('./routes/budget');
const vendorRoutes = require('./routes/vendors');
const checkinRoutes = require('./routes/checkin');
const analyticsRoutes = require('./routes/analytics');
const communicationRoutes = require('./routes/communication');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const invitationRoutes = require('./routes/invitations');
const rsvpRoutes = require('./routes/rsvp');
const googleContactsRoutes = require('./routes/googleContacts');
const websocketServer = require('./services/websocketServer');
const { initializeDatabase } = require('./config/database');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  // Skip rate limiting in development for localhost
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Wedding Platform API',
    version: '1.0.0',
    docs: '/api/docs',
    status: 'healthy'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'wedding-platform-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check endpoint for offline mode (supports HEAD requests)
app.head('/api/v1/health', (req, res) => {
  res.status(200).end();
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'wedding-platform-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', auth2faRoutes);
app.use('/api/v1/weddings', weddingRoutes);
app.use('/api/v1/guests', guestRoutes);
app.use('/api/v1/budget', budgetRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/checkin', checkinRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/communication', communicationRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/google', googleContactsRoutes);

// Messaging routes - UNIFIED API STRUCTURE
const messagingRoutes = require('./routes/messaging-unified');
app.use('/api/v1/messaging', messagingRoutes);

// Notification routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/v1/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database first
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Wedding Platform API running on http://localhost:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      
      // Initialize WebSocket server
      websocketServer.initialize(httpServer);
      
      // Start SMS notification scheduler
      const notificationScheduler = require('./services/notificationScheduler');
      if (process.env.SMS_NOTIFICATION_ENABLED === 'true') {
        notificationScheduler.start();
        console.log('📱 SMS notification scheduler started');
      } else {
        console.log('📱 SMS notifications are disabled');
      }

      // Start notification cleanup service
      const notificationCleanupService = require('./services/notificationCleanupService');
      notificationCleanupService.start();
      console.log('🧹 Notification cleanup service started');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;