const Review = require('../models/Review');
const Note = require('../models/Note');
const ErrorResponse = require('../middleware/ErrorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { body, validationResult, query } = require('express-validator');

// @desc    Get reviews for a specific note
// @route   GET /api/reviews/note/:noteId
// @access  Public
const getReviewsForNote = asyncHandler(async (req, res, next) => {
  const { noteId } = req.params;
  
  // Check if note exists
  const note = await Note.findById(noteId);
  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';

  const options = {
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder
  };

  // Get reviews using model static method
  const reviews = await Review.getForNote(noteId, options);
  
  // Get total count
  const total = await Review.countDocuments({
    noteId,
    isActive: true,
    isApproved: true
  });

  // Get review statistics
  const stats = await Review.getStatistics(noteId);

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    statistics: stats,
    data: reviews
  });
});

// @desc    Create a new review (Students only)
// @route   POST /api/reviews
// @access  Private (Students)
const createReview = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const { noteId, rating, comment, categories } = req.body;

  // Check if note exists
  const note = await Note.findById(noteId);
  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  if (!note.isActive || !note.isPublic) {
    return next(new ErrorResponse('Note is not available for review', 400));
  }

  // Check if student already reviewed this note
  const existingReview = await Review.findOne({
    noteId,
    studentId: req.user._id
  });

  if (existingReview) {
    return next(new ErrorResponse('You have already reviewed this note. Use update instead.', 400));
  }

  // Create review
  const reviewData = {
    noteId,
    studentId: req.user._id,
    rating,
    comment: comment || '',
    categories: categories || {}
  };

  const review = await Review.create(reviewData);

  // Populate student info
  await review.populate('studentId', 'name profilePicture');
  await review.populate('noteId', 'title');

  res.status(201).json({
    success: true,
    message: 'Review created successfully',
    data: review
  });
});

// @desc    Update a review (Students only - own reviews)
// @route   PUT /api/reviews/:id
// @access  Private (Students)
const updateReview = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse('Review not found', 404));
  }

  // Check if user owns the review
  if (review.studentId.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('You can only update your own reviews', 403));
  }

  // Update allowed fields
  const allowedFields = ['rating', 'comment', 'categories'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      review[field] = req.body[field];
    }
  });

  await review.save();

  // Populate student info
  await review.populate('studentId', 'name profilePicture');
  await review.populate('noteId', 'title');

  res.status(200).json({
    success: true,
    message: 'Review updated successfully',
    data: review
  });
});

// @desc    Delete a review (Students only - own reviews)
// @route   DELETE /api/reviews/:id
// @access  Private (Students)
const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse('Review not found', 404));
  }

  // Check if user owns the review
  if (review.studentId.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('You can only delete your own reviews', 403));
  }

  await review.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});

// @desc    Get reviews by current student
// @route   GET /api/reviews/my-reviews
// @access  Private (Students)
const getMyReviews = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ 
    studentId: req.user._id,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('noteId', 'title subject grade uploadedBy')
    .populate({
      path: 'noteId',
      populate: {
        path: 'uploadedBy',
        select: 'name email role'
      }
    });

  const total = await Review.countDocuments({ 
    studentId: req.user._id,
    isActive: true
  });

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: reviews
  });
});

// @desc    Vote on review helpfulness
// @route   POST /api/reviews/:id/vote
// @access  Private
const voteOnReview = asyncHandler(async (req, res, next) => {
  const { helpful } = req.body;

  if (typeof helpful !== 'boolean') {
    return next(new ErrorResponse('Helpful vote must be true or false', 400));
  }

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse('Review not found', 404));
  }

  // Add helpful vote
  await review.addHelpfulVote(helpful);

  res.status(200).json({
    success: true,
    message: 'Vote recorded successfully',
    data: {
      helpfulVotes: review.helpfulVotes,
      totalVotes: review.totalVotes,
      helpfulnessPercentage: review.helpfulnessPercentage
    }
  });
});

// @desc    Get review statistics for a note
// @route   GET /api/reviews/stats/:noteId
// @access  Public
const getReviewStats = asyncHandler(async (req, res, next) => {
  const { noteId } = req.params;

  // Check if note exists
  const note = await Note.findById(noteId);
  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  const stats = await Review.getStatistics(noteId);

  res.status(200).json({
    success: true,
    data: stats
  });
});

// @desc    Get all reviews by a specific student (public)
// @route   GET /api/reviews/student/:studentId
// @access  Public
const getStudentReviews = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ 
    studentId,
    isActive: true,
    isApproved: true
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('studentId', 'name profilePicture')
    .populate('noteId', 'title subject grade');

  const total = await Review.countDocuments({ 
    studentId,
    isActive: true,
    isApproved: true
  });

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: reviews
  });
});

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse('Review not found', 404));
  }

  // In a real app, you'd create a separate Report model
  // For now, we'll just mark it for moderation
  review.isApproved = false;
  review.moderationNote = `Reported by user ${req.user._id} on ${new Date().toISOString()}`;
  await review.save();

  res.status(200).json({
    success: true,
    message: 'Review reported successfully and sent for moderation'
  });
});

// Validation middleware for creating/updating reviews
const validateReview = [
  body('noteId')
    .isMongoId()
    .withMessage('Invalid note ID'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  
  body('categories')
    .optional()
    .isObject()
    .withMessage('Categories must be an object'),
  
  body('categories.helpful')
    .optional()
    .isBoolean()
    .withMessage('Categories.helpful must be boolean'),
    
  body('categories.clear')
    .optional()
    .isBoolean()
    .withMessage('Categories.clear must be boolean'),
    
  body('categories.complete')
    .optional()
    .isBoolean()
    .withMessage('Categories.complete must be boolean'),
    
  body('categories.accurate')
    .optional()
    .isBoolean()
    .withMessage('Categories.accurate must be boolean')
];

// Validation middleware for updating reviews (more lenient)
const validateReviewUpdate = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  
  body('categories')
    .optional()
    .isObject()
    .withMessage('Categories must be an object'),
  
  body('categories.helpful')
    .optional()
    .isBoolean()
    .withMessage('Categories.helpful must be boolean'),
    
  body('categories.clear')
    .optional()
    .isBoolean()
    .withMessage('Categories.clear must be boolean'),
    
  body('categories.complete')
    .optional()
    .isBoolean()
    .withMessage('Categories.complete must be boolean'),
    
  body('categories.accurate')
    .optional()
    .isBoolean()
    .withMessage('Categories.accurate must be boolean')
];

// Query validation for reviews
const validateReviewQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'rating', 'helpfulVotes'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

module.exports = {
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
};
