const express = require('express');
const router = express.Router();

const {
  getReviewsForNote,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  voteOnReview,
  getReviewStats,
  getStudentReviews,
  reportReview,
  validateReview,
  validateReviewUpdate,
  validateReviewQuery
} = require('../controllers/reviewsController');

const { protect, studentOnly } = require('../middleware/auth');

// Public routes
// @desc    Get reviews for a specific note
// @route   GET /api/reviews/note/:noteId
// @access  Public
router.get('/note/:noteId', validateReviewQuery, getReviewsForNote);

// @desc    Get review statistics for a note
// @route   GET /api/reviews/stats/:noteId
// @access  Public
router.get('/stats/:noteId', getReviewStats);

// @desc    Get all reviews by a specific student
// @route   GET /api/reviews/student/:studentId
// @access  Public
router.get('/student/:studentId', validateReviewQuery, getStudentReviews);

// Protected routes (authentication required)
// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private (Students only)
router.post('/', protect, studentOnly, validateReview, createReview);

// @desc    Get reviews by current student
// @route   GET /api/reviews/my-reviews
// @access  Private (Students only)
router.get('/my-reviews', protect, studentOnly, getMyReviews);

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (Students only - own reviews)
router.put('/:id', protect, studentOnly, validateReviewUpdate, updateReview);

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (Students only - own reviews)
router.delete('/:id', protect, studentOnly, deleteReview);

// @desc    Vote on review helpfulness
// @route   POST /api/reviews/:id/vote
// @access  Private
router.post('/:id/vote', protect, voteOnReview);

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
router.post('/:id/report', protect, reportReview);

module.exports = router;
