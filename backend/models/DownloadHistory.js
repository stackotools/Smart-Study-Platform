const mongoose = require('mongoose');

const DownloadHistorySchema = new mongoose.Schema({
  // Reference to the note that was downloaded
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: [true, 'Note ID is required']
  },
  // Student who downloaded the note
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  // Download metadata
  downloadedAt: {
    type: Date,
    default: Date.now
  },
  // File information at time of download
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    default: ''
  },
  // Note information at time of download (for historical reference)
  noteTitle: {
    type: String,
    required: true
  },
  noteSubject: {
    type: String,
    required: true
  },
  noteGrade: {
    type: String,
    required: true
  },
  // Teacher who uploaded the note
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate downloads (optional - you might want to allow multiple downloads)
DownloadHistorySchema.index({ noteId: 1, studentId: 1, downloadedAt: 1 });

// Index for querying by student
DownloadHistorySchema.index({ studentId: 1, downloadedAt: -1 });

// Index for querying by note
DownloadHistorySchema.index({ noteId: 1, downloadedAt: -1 });

// Virtual for formatted download date
DownloadHistorySchema.virtual('formattedDate').get(function() {
  return this.downloadedAt.toLocaleDateString();
});

// Static method to get download history for a student
DownloadHistorySchema.statics.getStudentDownloads = function(studentId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  return this.find({ studentId })
    .populate('noteId', 'title subject grade uploadedBy')
    .populate('uploadedBy', 'name email')
    .sort({ downloadedAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get download statistics
DownloadHistorySchema.statics.getDownloadStats = function(studentId) {
  return this.aggregate([
    { $match: { studentId: mongoose.Types.ObjectId(studentId) } },
    {
      $group: {
        _id: null,
        totalDownloads: { $sum: 1 },
        uniqueNotes: { $addToSet: '$noteId' },
        totalFileSize: { $sum: '$fileSize' }
      }
    },
    {
      $project: {
        totalDownloads: 1,
        uniqueNotesCount: { $size: '$uniqueNotes' },
        totalFileSize: 1
      }
    }
  ]);
};

module.exports = mongoose.model('DownloadHistory', DownloadHistorySchema);
