const express = require('express');
const router = express.Router();

const {
  getStudentProgress,
  getTeacherAnalytics,
  getPlatformAnalytics
} = require('../controllers/analyticsController');

const { protect, studentOnly, teacherOnly } = require('../middleware/auth');

// @desc    Get student progress analytics
// @route   GET /api/analytics/student-progress
// @access  Private (Students only)
router.get('/student-progress', protect, studentOnly, getStudentProgress);

// @desc    Get teacher analytics
// @route   GET /api/analytics/teacher-analytics
// @access  Private (Teachers only)
router.get('/teacher-analytics', protect, teacherOnly, getTeacherAnalytics);

// @desc    Get platform analytics
// @route   GET /api/analytics/platform
// @access  Private (All authenticated users)
router.get('/platform', protect, getPlatformAnalytics);

module.exports = router;
