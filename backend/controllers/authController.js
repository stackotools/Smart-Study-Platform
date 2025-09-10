const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { generateTokenResponse } = require('../config/jwt');
const ErrorResponse = require('../middleware/ErrorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { body, validationResult } = require('express-validator');

// @desc    Register a new user (teacher or student)
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const { name, email, password, role, ...otherFields } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('User with this email already exists', 400));
  }

  // Create user object
  const userData = {
    name,
    email,
    password,
    role: role || 'student'
  };

  // Add role-specific fields
  if (userData.role === 'teacher') {
    const { subject, qualification, experience } = otherFields;
    
    if (!subject || !qualification || experience === undefined) {
      return next(new ErrorResponse('Teachers must provide subject, qualification, and experience', 400));
    }

    userData.subject = subject;
    userData.qualification = qualification;
    userData.experience = experience;
    userData.bio = otherFields.bio || '';
  } else if (userData.role === 'student') {
    const { grade, interests } = otherFields;
    
    if (!grade) {
      return next(new ErrorResponse('Students must provide their grade level', 400));
    }

    userData.grade = grade;
    userData.interests = interests || [];
  }

  // Create user
  const user = await User.create(userData);

  // Update last login
  await user.updateLastLogin();

  // Generate token response
  const tokenResponse = generateTokenResponse(user);

  res.status(201).json({
    success: true,
    message: `${role === 'teacher' ? 'Teacher' : 'Student'} registered successfully`,
    ...tokenResponse
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const { email, password } = req.body;

  // Check if user exists and include password for comparison
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new ErrorResponse('Account has been deactivated. Please contact support.', 401));
  }

  // Check password
  const isPasswordCorrect = await user.matchPassword(password);

  if (!isPasswordCorrect) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  await user.updateLastLogin();

  // Generate token response
  const tokenResponse = generateTokenResponse(user);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    ...tokenResponse
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    data: user.getPublicData()
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Fields that can be updated for all users
  const updateFields = ['name', 'bio'];
  
  // Role-specific fields
  if (user.role === 'teacher') {
    updateFields.push('subject', 'qualification', 'experience');
  } else if (user.role === 'student') {
    updateFields.push('grade', 'interests');
  }

  // Update only provided fields
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user.getPublicData()
  });
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isCurrentPasswordCorrect = await user.matchPassword(currentPassword);

  if (!isCurrentPasswordCorrect) {
    return next(new ErrorResponse('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Forgot password - create reset token and (normally) email it
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ErrorResponse('Email is required', 400));
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    // Respond success to avoid email enumeration
    return res.status(200).json({ success: true, message: 'If an account exists, an email has been sent' });
  }

  // Create reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetToken = hashed;
  user.passwordResetExpire = Date.now() + 1000 * 60 * 15; // 15 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  // Send email
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: user.email,
      subject: 'Password Reset Instructions',
      html: `
        <p>Hello ${user.name},</p>
        <p>You recently requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 15 minutes. If you did not request this, you can ignore this email.</p>
        <p>– Smart Study Platform</p>
      `
    });

    return res.status(200).json({ success: true, message: 'Reset link sent to email' });
  } catch (err) {
    // If email fails, still return reset URL for debugging
    return res.status(200).json({ success: true, message: 'Email sending failed in dev, use resetUrl', data: { resetUrl } });
  }
});

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token) return next(new ErrorResponse('Invalid or missing token', 400));
  if (!newPassword || String(newPassword).length < 6) {
    return next(new ErrorResponse('New password must be at least 6 characters long', 400));
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpire: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Reset token is invalid or has expired', 400));
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Password has been reset successfully' });
});

// Validation middleware for register
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher'),

  // Teacher-specific validations
  body('subject')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Subject is required for teachers'),
    
  body('qualification')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Qualification is required for teachers'),
    
  body('experience')
    .if(body('role').equals('teacher'))
    .isNumeric({ min: 0 })
    .withMessage('Experience must be a number (years)'),

  // Student-specific validations
  body('grade')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Grade is required for students')
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation middleware for profile update
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
    
  body('subject')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty'),
    
  body('qualification')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Qualification cannot be empty'),
    
  body('experience')
    .optional()
    .isNumeric({ min: 0 })
    .withMessage('Experience must be a positive number'),
    
  body('grade')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Grade cannot be empty'),
    
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array')
];

// Validation middleware for password change
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Validation middleware for forgot password
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  logout,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateProfileUpdate,
  validatePasswordChange
};
