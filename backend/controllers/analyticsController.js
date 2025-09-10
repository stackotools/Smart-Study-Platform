const Note = require('../models/Note');
const Review = require('../models/Review');
const DownloadHistory = require('../models/DownloadHistory');
const User = require('../models/User');
const ErrorResponse = require('../middleware/ErrorResponse');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get student progress analytics
// @route   GET /api/analytics/student-progress
// @access  Private (Students only)
const getStudentProgress = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;

  // Get download history for the student
  const downloads = await DownloadHistory.find({ studentId })
    .populate('noteId', 'title subject grade')
    .sort({ downloadedAt: -1 });

  // Calculate progress metrics
  const totalDownloads = downloads.length;
  const uniqueSubjects = [...new Set(downloads.map(d => d.noteSubject))];
  const uniqueGrades = [...new Set(downloads.map(d => d.noteGrade))];
  
  // Downloads by subject
  const downloadsBySubject = {};
  downloads.forEach(download => {
    const subject = download.noteSubject;
    downloadsBySubject[subject] = (downloadsBySubject[subject] || 0) + 1;
  });

  // Downloads by month (last 12 months)
  const monthlyDownloads = {};
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  downloads
    .filter(d => d.downloadedAt >= twelveMonthsAgo)
    .forEach(download => {
      const month = download.downloadedAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyDownloads[month] = (monthlyDownloads[month] || 0) + 1;
    });

  // Learning streak (consecutive days with downloads)
  const dailyDownloads = {};
  downloads.forEach(download => {
    const day = download.downloadedAt.toISOString().substring(0, 10); // YYYY-MM-DD
    dailyDownloads[day] = (dailyDownloads[day] || 0) + 1;
  });

  const sortedDays = Object.keys(dailyDownloads).sort().reverse();
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  const today = new Date().toISOString().substring(0, 10);
  
  for (let i = 0; i < sortedDays.length; i++) {
    const day = sortedDays[i];
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().substring(0, 10);
    
    if (i === 0 && day === today) {
      currentStreak = 1;
      tempStreak = 1;
    } else if (i > 0 && sortedDays[i-1] === nextDayStr) {
      tempStreak++;
      if (i === 0 || sortedDays[i-1] === nextDayStr) {
        currentStreak = tempStreak;
      }
    } else {
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 1;
    }
  }
  maxStreak = Math.max(maxStreak, tempStreak);

  // Performance by subject (based on reviews if available)
  const subjectPerformance = {};
  for (const subject of uniqueSubjects) {
    const subjectNotes = await Note.find({ 
      subject, 
      isActive: true, 
      isPublic: true 
    }).select('_id');
    
    const noteIds = subjectNotes.map(note => note._id);
    const reviews = await Review.find({ 
      noteId: { $in: noteIds },
      studentId 
    });
    
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      subjectPerformance[subject] = {
        averageRating: Math.round(avgRating * 10) / 10,
        reviewsCount: reviews.length,
        notesCount: subjectNotes.length
      };
    }
  }

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentActivity = downloads
    .filter(d => d.downloadedAt >= thirtyDaysAgo)
    .map(d => ({
      date: d.downloadedAt.toISOString().substring(0, 10),
      title: d.noteTitle,
      subject: d.noteSubject,
      grade: d.noteGrade
    }));

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalDownloads,
        uniqueSubjects: uniqueSubjects.length,
        uniqueGrades: uniqueGrades.length,
        currentStreak,
        maxStreak,
        totalFileSize: downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0)
      },
      downloadsBySubject,
      monthlyDownloads,
      subjectPerformance,
      recentActivity,
      learningStreak: {
        current: currentStreak,
        max: maxStreak
      }
    }
  });
});

// @desc    Get teacher analytics
// @route   GET /api/analytics/teacher-analytics
// @access  Private (Teachers only)
const getTeacherAnalytics = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;

  // Get teacher's notes
  const notes = await Note.find({ uploadedBy: teacherId })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

  // Calculate analytics
  const totalNotes = notes.length;
  const totalDownloads = notes.reduce((sum, note) => sum + (note.downloadCount || 0), 0);
  const totalViews = notes.reduce((sum, note) => sum + (note.viewCount || 0), 0);
  
  // Notes by subject
  const notesBySubject = {};
  notes.forEach(note => {
    const subject = note.subject;
    notesBySubject[subject] = (notesBySubject[subject] || 0) + 1;
  });

  // Downloads by month (last 12 months)
  const monthlyDownloads = {};
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Get download history for teacher's notes
  const noteIds = notes.map(note => note._id);
  const downloads = await DownloadHistory.find({ 
    noteId: { $in: noteIds },
    downloadedAt: { $gte: twelveMonthsAgo }
  });

  downloads.forEach(download => {
    const month = download.downloadedAt.toISOString().substring(0, 7);
    monthlyDownloads[month] = (monthlyDownloads[month] || 0) + 1;
  });

  // Top performing notes
  const topNotes = notes
    .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
    .slice(0, 10)
    .map(note => ({
      id: note._id,
      title: note.title,
      subject: note.subject,
      grade: note.grade,
      downloads: note.downloadCount || 0,
      views: note.viewCount || 0,
      rating: note.averageRating || 0,
      createdAt: note.createdAt
    }));

  // Reviews analytics
  const reviews = await Review.find({ 
    noteId: { $in: noteIds } 
  }).populate('studentId', 'name');

  const totalReviews = reviews.length;
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Reviews by month
  const monthlyReviews = {};
  reviews.forEach(review => {
    const month = review.createdAt.toISOString().substring(0, 7);
    monthlyReviews[month] = (monthlyReviews[month] || 0) + 1;
  });

  // Student engagement (unique students who downloaded)
  const uniqueStudents = await DownloadHistory.distinct('studentId', { 
    noteId: { $in: noteIds } 
  });

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalNotes,
        totalDownloads,
        totalViews,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        uniqueStudents: uniqueStudents.length
      },
      notesBySubject,
      monthlyDownloads,
      monthlyReviews,
      topNotes,
      recentActivity: notes.slice(0, 5).map(note => ({
        id: note._id,
        title: note.title,
        subject: note.subject,
        grade: note.grade,
        downloads: note.downloadCount || 0,
        createdAt: note.createdAt
      }))
    }
  });
});

// @desc    Get platform-wide analytics (admin only)
// @route   GET /api/analytics/platform
// @access  Private (Admin only)
const getPlatformAnalytics = asyncHandler(async (req, res, next) => {
  // This would be for admin users to see platform-wide statistics
  // For now, we'll return basic stats that any user can see
  
  const totalNotes = await Note.countDocuments({ isActive: true, isPublic: true });
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalDownloads = await DownloadHistory.countDocuments();
  const totalReviews = await Review.countDocuments({ isActive: true });

  // Most popular subjects
  const subjectStats = await Note.aggregate([
    { $match: { isActive: true, isPublic: true } },
    { $group: { _id: '$subject', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Most active teachers
  const teacherStats = await Note.aggregate([
    { $match: { isActive: true, isPublic: true } },
    { $group: { 
        _id: '$uploadedBy', 
        noteCount: { $sum: 1 },
        totalDownloads: { $sum: '$downloadCount' }
      }
    },
    { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    { $project: {
        teacherName: '$teacher.name',
        noteCount: 1,
        totalDownloads: 1
      }
    },
    { $sort: { totalDownloads: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalNotes,
        totalUsers,
        totalDownloads,
        totalReviews
      },
      popularSubjects: subjectStats,
      topTeachers: teacherStats
    }
  });
});

module.exports = {
  getStudentProgress,
  getTeacherAnalytics,
  getPlatformAnalytics
};
