const DownloadHistory = require('../models/DownloadHistory');
const ErrorResponse = require('../middleware/ErrorResponse');
const asyncHandler = require('../middleware/asyncHandler');
const { query, validationResult } = require('express-validator');

// @desc    Get download history for a student
// @route   GET /api/download-history
// @access  Private (Students only)
const getDownloadHistory = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const downloads = await DownloadHistory.find({ studentId: req.user._id })
    .populate('noteId', 'title subject grade uploadedBy')
    .populate('uploadedBy', 'name email')
    .sort({ downloadedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await DownloadHistory.countDocuments({ studentId: req.user._id });

  res.status(200).json({
    success: true,
    data: downloads,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  });
});

// @desc    Get download statistics for a student
// @route   GET /api/download-history/stats
// @access  Private (Students only)
const getDownloadStats = asyncHandler(async (req, res, next) => {
  const stats = await DownloadHistory.aggregate([
    { $match: { studentId: req.user._id } },
    {
      $group: {
        _id: null,
        totalDownloads: { $sum: 1 },
        uniqueNotes: { $addToSet: '$noteId' },
        totalFileSize: { $sum: '$fileSize' },
        downloadsBySubject: {
          $push: {
            subject: '$noteSubject',
            downloadedAt: '$downloadedAt'
          }
        }
      }
    },
    {
      $project: {
        totalDownloads: 1,
        uniqueNotesCount: { $size: '$uniqueNotes' },
        totalFileSize: 1,
        downloadsBySubject: 1
      }
    }
  ]);

  // Get recent downloads (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentDownloads = await DownloadHistory.countDocuments({
    studentId: req.user._id,
    downloadedAt: { $gte: sevenDaysAgo }
  });

  // Get downloads by month for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyDownloads = await DownloadHistory.aggregate([
    {
      $match: {
        studentId: req.user._id,
        downloadedAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$downloadedAt' },
          month: { $month: '$downloadedAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  const result = stats[0] || {
    totalDownloads: 0,
    uniqueNotesCount: 0,
    totalFileSize: 0,
    downloadsBySubject: []
  };

  res.status(200).json({
    success: true,
    data: {
      ...result,
      recentDownloads,
      monthlyDownloads
    }
  });
});

// @desc    Create download history record
// @route   POST /api/download-history
// @access  Private
const createDownloadHistory = asyncHandler(async (req, res, next) => {
  const { noteId, fileName, fileSize, fileType, noteTitle, noteSubject, noteGrade, uploadedBy } = req.body;

  const downloadHistory = await DownloadHistory.create({
    noteId,
    studentId: req.user._id,
    fileName,
    fileSize,
    fileType,
    noteTitle,
    noteSubject,
    noteGrade,
    uploadedBy
  });

  res.status(201).json({
    success: true,
    data: downloadHistory
  });
});

// @desc    Delete download history record
// @route   DELETE /api/download-history/:id
// @access  Private (Students only - own records)
const deleteDownloadHistory = asyncHandler(async (req, res, next) => {
  const downloadHistory = await DownloadHistory.findById(req.params.id);

  if (!downloadHistory) {
    return next(new ErrorResponse('Download history record not found', 404));
  }

  // Check if user owns this download record
  if (downloadHistory.studentId.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Access denied. You can only delete your own download history.', 403));
  }

  await downloadHistory.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Download history record deleted successfully'
  });
});

// Validation middleware
const validateDownloadHistoryQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

module.exports = {
  getDownloadHistory,
  getDownloadStats,
  createDownloadHistory,
  deleteDownloadHistory,
  validateDownloadHistoryQuery
};
