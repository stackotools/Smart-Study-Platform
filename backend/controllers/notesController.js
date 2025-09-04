const Note = require('../models/Note');
const Review = require('../models/Review');
const ErrorResponse = require('../middleware/ErrorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { body, validationResult, query } = require('express-validator');
const { getFileInfo, deleteFile } = require('../middleware/fileUpload');
const path = require('path');

// @desc    Get all notes (with filtering)
// @route   GET /api/notes
// @access  Public
const getNotes = asyncHandler(async (req, res, next) => {
  const filters = {
    subject: req.query.subject,
    grade: req.query.grade,
    category: req.query.category,
    difficulty: req.query.difficulty,
    tags: req.query.tags ? req.query.tags.split(',') : undefined,
    uploadedBy: req.query.teacher
  };

  // Remove undefined filters
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined) {
      delete filters[key];
    }
  });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get notes using the model's static method
  const notesQuery = Note.getByFilters(filters);
  
  // Add pagination
  const notes = await notesQuery.skip(skip).limit(limit);
  
  // Get total count for pagination
  const total = await Note.countDocuments({
    isActive: true,
    isPublic: true,
    ...filters
  });

  res.status(200).json({
    success: true,
    count: notes.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: notes
  });
});

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Public
const getNote = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.id)
    .populate('uploadedBy', 'name email role subject qualification');

  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  if (!note.isActive || !note.isPublic) {
    return next(new ErrorResponse('Note not available', 404));
  }

  // Increment view count
  await note.incrementView();

  res.status(200).json({
    success: true,
    data: note
  });
});

// @desc    Upload a new note (Teachers only)
// @route   POST /api/notes
// @access  Private (Teachers)
const uploadNote = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const fileInfo = getFileInfo(req.file);
  
  const noteData = {
    ...req.body,
    ...fileInfo,
    uploadedBy: req.user._id,
    tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim().toLowerCase()) : []
  };

  const note = await Note.create(noteData);

  // Populate teacher info
  await note.populate('uploadedBy', 'name email role subject qualification');

  res.status(201).json({
    success: true,
    message: 'Note uploaded successfully',
    data: note
  });
});

// @desc    Update note (Teachers only - own notes)
// @route   PUT /api/notes/:id
// @access  Private (Teachers)
const updateNote = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array().map(err => err.msg).join(', '), 400));
  }

  const note = req.resource; // From checkOwnership middleware

  // Update allowed fields
  const allowedFields = ['title', 'description', 'subject', 'grade', 'category', 'difficulty', 'tags', 'isPublic'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'tags' && typeof req.body[field] === 'string') {
        note[field] = req.body[field].split(',').map(tag => tag.trim().toLowerCase());
      } else {
        note[field] = req.body[field];
      }
    }
  });

  // Handle file replacement if new file is uploaded
  if (req.file) {
    // Delete old file
    try {
      if (note.cloudinaryPublicId) {
        await deleteFile(note.cloudinaryPublicId, true);
      } else if (note.filePath) {
        await deleteFile(note.filePath, note.filePath.includes('cloudinary.com'));
      }
    } catch (error) {
      console.log('Error deleting old file:', error.message);
    }

    // Update with new file info
    const fileInfo = getFileInfo(req.file);
    Object.assign(note, fileInfo);
  }

  await note.save();

  // Populate teacher info
  await note.populate('uploadedBy', 'name email role subject qualification');

  res.status(200).json({
    success: true,
    message: 'Note updated successfully',
    data: note
  });
});

// @desc    Delete note (Teachers only - own notes)
// @route   DELETE /api/notes/:id
// @access  Private (Teachers)
const deleteNote = asyncHandler(async (req, res, next) => {
  const note = req.resource; // From checkOwnership middleware

  // Delete associated file from Cloudinary or local storage
  try {
    if (note.cloudinaryPublicId) {
      // Delete from Cloudinary using public_id
      await deleteFile(note.cloudinaryPublicId, true);
    } else if (note.filePath) {
      // Delete from local storage or Cloudinary using file path
      await deleteFile(note.filePath, note.filePath.includes('cloudinary.com'));
    }
  } catch (error) {
    console.log('Error deleting file:', error.message);
  }

  // Delete all reviews for this note
  await Review.deleteMany({ noteId: note._id });

  // Delete the note
  await note.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Note deleted successfully'
  });
});

// @desc    Get notes uploaded by current teacher
// @route   GET /api/notes/my-uploads
// @access  Private (Teachers)
const getMyUploads = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const notes = await Note.find({ 
    uploadedBy: req.user._id,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'name email role subject qualification');

  const total = await Note.countDocuments({ 
    uploadedBy: req.user._id,
    isActive: true
  });

  res.status(200).json({
    success: true,
    count: notes.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: notes
  });
});

// @desc    Download note file
// @route   GET /api/notes/:id/download
// @access  Public
const downloadNote = asyncHandler(async (req, res, next) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  if (!note.isActive || !note.isPublic) {
    return next(new ErrorResponse('Note not available', 404));
  }

  // Increment download count
  await note.incrementDownload();

  // Check if file is stored on Cloudinary
  if (note.cloudinaryUrl || note.filePath.includes('cloudinary.com')) {
    // For Cloudinary files, redirect to the secure URL with download headers
    const downloadUrl = note.cloudinarySecureUrl || note.cloudinaryUrl || note.filePath;
    
    // Add download transformation to force download instead of display
    const urlWithDownload = downloadUrl.includes('upload/') 
      ? downloadUrl.replace('upload/', 'upload/fl_attachment/')
      : downloadUrl;
    
    // Redirect to Cloudinary URL with proper headers
    res.setHeader('Content-Disposition', `attachment; filename="${note.originalFileName}"`);
    res.redirect(urlWithDownload);
  } else {
    // For local files (fallback)
    res.setHeader('Content-Disposition', `attachment; filename="${note.originalFileName}"`);
    res.setHeader('Content-Type', note.mimeType);

    // Check if file exists locally
    if (note.filePath && path.isAbsolute(note.filePath)) {
      res.sendFile(path.resolve(note.filePath), (err) => {
        if (err) {
          console.error('Error sending file:', err);
          return next(new ErrorResponse('Error downloading file', 500));
        }
      });
    } else {
      return next(new ErrorResponse('File not found', 404));
    }
  }
});

// @desc    Get notes statistics
// @route   GET /api/notes/stats
// @access  Public
const getNotesStats = asyncHandler(async (req, res, next) => {
  const stats = await Note.aggregate([
    {
      $match: { isActive: true, isPublic: true }
    },
    {
      $group: {
        _id: null,
        totalNotes: { $sum: 1 },
        totalDownloads: { $sum: '$downloadCount' },
        totalViews: { $sum: '$viewCount' },
        avgRating: { $avg: '$averageRating' },
        subjectDistribution: {
          $push: '$subject'
        },
        categoryDistribution: {
          $push: '$category'
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalNotes: 0,
    totalDownloads: 0,
    totalViews: 0,
    avgRating: 0,
    subjectDistribution: [],
    categoryDistribution: []
  };

  // Process distributions
  const subjectCounts = {};
  result.subjectDistribution.forEach(subject => {
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
  });

  const categoryCounts = {};
  result.categoryDistribution.forEach(category => {
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    data: {
      totalNotes: result.totalNotes,
      totalDownloads: result.totalDownloads,
      totalViews: result.totalViews,
      averageRating: Math.round(result.avgRating * 10) / 10,
      subjectDistribution: subjectCounts,
      categoryDistribution: categoryCounts
    }
  });
});

// Validation middleware for note upload/update
const validateNote = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
  
  body('grade')
    .trim()
    .notEmpty()
    .withMessage('Grade is required'),
  
  body('category')
    .optional()
    .isIn(['lecture-notes', 'assignment', 'reference-material', 'quiz', 'exam', 'other'])
    .withMessage('Invalid category'),
  
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Validation middleware for note update (more lenient)
const validateNoteUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('subject')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty'),
  
  body('grade')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Grade cannot be empty'),
  
  body('category')
    .optional()
    .isIn(['lecture-notes', 'assignment', 'reference-material', 'quiz', 'exam', 'other'])
    .withMessage('Invalid category'),
  
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Query validation for filtering
const validateNoteQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('category')
    .optional()
    .isIn(['lecture-notes', 'assignment', 'reference-material', 'quiz', 'exam', 'other'])
    .withMessage('Invalid category'),
  
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level')
];

module.exports = {
  getNotes,
  getNote,
  uploadNote,
  updateNote,
  deleteNote,
  getMyUploads,
  downloadNote,
  getNotesStats,
  validateNote,
  validateNoteUpdate,
  validateNoteQuery
};
