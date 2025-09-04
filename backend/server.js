const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const colors = require('colors');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');

// Import error handling middleware
const { errorHandler, notFound, handleUnhandledRejections, handleUncaughtExceptions } = require('./middleware/errorHandler');

// Enable express-async-errors for automatic error handling
require('express-async-errors');

// Handle uncaught exceptions and unhandled rejections
handleUncaughtExceptions();
handleUnhandledRejections();

// Connect to database
connectDB();

// Test Cloudinary connection
const { testCloudinaryConnection } = require('./config/cloudinary');
testCloudinaryConnection();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Study Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Study Platform API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/password'
      },
      notes: {
        getAllNotes: 'GET /api/notes',
        getNote: 'GET /api/notes/:id',
        uploadNote: 'POST /api/notes (Teachers only)',
        updateNote: 'PUT /api/notes/:id (Teachers only)',
        deleteNote: 'DELETE /api/notes/:id (Teachers only)',
        myUploads: 'GET /api/notes/my-uploads (Teachers only)',
        downloadNote: 'GET /api/notes/:id/download',
        stats: 'GET /api/notes/stats'
      },
      reviews: {
        getReviewsForNote: 'GET /api/reviews/note/:noteId',
        createReview: 'POST /api/reviews (Students only)',
        updateReview: 'PUT /api/reviews/:id (Students only)',
        deleteReview: 'DELETE /api/reviews/:id (Students only)',
        myReviews: 'GET /api/reviews/my-reviews (Students only)',
        voteOnReview: 'POST /api/reviews/:id/vote',
        reportReview: 'POST /api/reviews/:id/report',
        getReviewStats: 'GET /api/reviews/stats/:noteId'
      }
    }
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Smart Study Platform API Server Started
📍 Running on port ${PORT}
🌍 Environment: ${process.env.NODE_ENV}
📚 API Documentation: http://localhost:${PORT}/api
🏥 Health Check: http://localhost:${PORT}/api/health
${process.env.NODE_ENV === 'development' ? '🔧 Development Mode - Detailed logging enabled' : ''}
  `.green.bold);
});

// Store server globally for graceful shutdown
global.server = server;

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...'.yellow);
  server.close(() => {
    console.log('Process terminated'.red);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...'.yellow);
  server.close(() => {
    console.log('Process terminated'.red);
  });
});

module.exports = app;
