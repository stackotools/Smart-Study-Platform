const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../config/jwt');
const asyncHandler = require('./asyncHandler');
const ErrorResponse = require('./ErrorResponse');

// Protect routes - general authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Get token from header (Bearer TOKEN)
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if no token
  if (!token) {
    return next(new ErrorResponse('Access denied. No token provided.', 401));
  }

  // Verify token
  const decoded = verifyToken(token);

  // Get user from the token (excluding password)
  const user = await User.findById(decoded.id).select('-password');
  
  if (!user) {
    return next(new ErrorResponse('Invalid token. User not found.', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new ErrorResponse('Account has been deactivated.', 401));
  }

  // Add user to request object
  req.user = user;
  next();
});

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Access denied. Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(`Access denied. ${req.user.role} role is not authorized to access this resource.`, 403));
    }

    next();
  };
};

// Teacher only access
const teacherOnly = (req, res, next) => {
  if (!req.user) {
    return next(new ErrorResponse('Access denied. Authentication required.', 401));
  }

  if (req.user.role !== 'teacher') {
    return next(new ErrorResponse('Access denied. Teacher access required.', 403));
  }

  next();
};

// Student only access
const studentOnly = (req, res, next) => {
  if (!req.user) {
    return next(new ErrorResponse('Access denied. Authentication required.', 401));
  }

  if (req.user.role !== 'student') {
    return next(new ErrorResponse('Access denied. Student access required.', 403));
  }

  next();
};

// Check if user owns the resource (for editing/deleting)
const checkOwnership = (resourceModel, resourceField = '_id') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params.id || req.params[resourceField];
    
    if (!resourceId) {
      return next(new ErrorResponse('Resource ID is required.', 400));
    }

    const resource = await resourceModel.findById(resourceId);
    
    if (!resource) {
      return next(new ErrorResponse('Resource not found.', 404));
    }

    // Check if user owns the resource
    if (resource.uploadedBy && resource.uploadedBy.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Access denied. You can only modify your own resources.', 403));
    }

    // Add resource to request object
    req.resource = resource;
    next();
  });
};

// Optional auth - doesn't fail if no token, but adds user if token exists
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Ignore token errors in optional auth
    }
  }

  next();
});

module.exports = {
  protect,
  authorize,
  teacherOnly,
  studentOnly,
  checkOwnership,
  optionalAuth
};
