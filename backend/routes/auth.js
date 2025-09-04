const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// @desc    Register user (teacher or student)
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validateRegister, register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateLogin, login);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, logout);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, validateProfileUpdate, updateProfile);

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, validatePasswordChange, changePassword);

module.exports = router;
