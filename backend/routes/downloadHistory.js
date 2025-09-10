const express = require('express');
const router = express.Router();

const {
  getDownloadHistory,
  getDownloadStats,
  createDownloadHistory,
  deleteDownloadHistory,
  validateDownloadHistoryQuery
} = require('../controllers/downloadHistoryController');

const { protect, studentOnly } = require('../middleware/auth');

// All routes are protected and require student role
router.use(protect);
router.use(studentOnly);

// @desc    Get download history for current student
// @route   GET /api/download-history
// @access  Private (Students only)
router.get('/', validateDownloadHistoryQuery, getDownloadHistory);

// @desc    Get download statistics for current student
// @route   GET /api/download-history/stats
// @access  Private (Students only)
router.get('/stats', getDownloadStats);

// @desc    Create download history record
// @route   POST /api/download-history
// @access  Private (Students only)
router.post('/', createDownloadHistory);

// @desc    Delete download history record
// @route   DELETE /api/download-history/:id
// @access  Private (Students only - own records)
router.delete('/:id', deleteDownloadHistory);

module.exports = router;
