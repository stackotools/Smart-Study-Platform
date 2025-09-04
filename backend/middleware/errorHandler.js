const ErrorResponse = require('./ErrorResponse');

/**
 * Custom Error Handler Middleware
 * This should be the last middleware in your application
 * It catches all errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Error Details:'.red);
    console.log('Name:', err.name);
    console.log('Message:', err.message);
    console.log('Stack:', err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ErrorResponse(message, 401);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Maximum file size is 10MB';
    error = new ErrorResponse(message, 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files. Maximum 5 files allowed';
    error = new ErrorResponse(message, 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = new ErrorResponse(message, 400);
  }

  // Multer errors
  if (err.message && err.message.includes('Only')) {
    error = new ErrorResponse(err.message, 400);
  }

  // Database connection errors
  if (err.message && err.message.includes('ECONNREFUSED')) {
    const message = 'Database connection failed. Please try again later.';
    error = new ErrorResponse(message, 500);
  }

  // Rate limiting errors
  if (err.message && err.message.includes('Too many requests')) {
    error = new ErrorResponse(err.message, 429);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err 
      })
    }
  });
};

/**
 * Handle 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new ErrorResponse(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (err, promise) => {
    console.log('Unhandled Promise Rejection:'.red, err.message);
    // Close server & exit process
    if (global.server) {
      global.server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (err) => {
    console.log('Uncaught Exception:'.red, err.message);
    console.log('Shutting down server...');
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFound,
  handleUnhandledRejections,
  handleUncaughtExceptions
};
