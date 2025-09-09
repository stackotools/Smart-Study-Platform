const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  subject: {
    type: String,
    required: [true, 'Please specify the subject'],
    trim: true
  },
  grade: {
    type: String,
    required: [true, 'Please specify the grade level'],
    trim: true
  },
  category: {
    type: String,
    enum: ['lecture-notes', 'assignment', 'reference-material', 'quiz', 'exam', 'other'],
    required: [true, 'Please specify the category'],
    default: 'lecture-notes'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // File information (optional - notes can exist without files)
  fileName: {
    type: String,
    default: null
  },
  originalFileName: {
    type: String,
    default: null
  },
  filePath: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  fileType: {
    type: String,
    default: null
  },
  mimeType: {
    type: String,
    default: null
  },
  // Cloudinary-specific fields
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  cloudinaryUrl: {
    type: String,
    default: null
  },
  cloudinarySecureUrl: {
    type: String,
    default: null
  },
  resourceType: {
    type: String,
    enum: ['auto', 'image', 'video', 'raw', 'local'],
    default: 'auto'
  },
  // Teacher who uploaded
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required']
  },
  // Visibility and access
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Statistics
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
NoteSchema.index({ subject: 1, grade: 1, category: 1 });
NoteSchema.index({ uploadedBy: 1 });
NoteSchema.index({ tags: 1 });
NoteSchema.index({ createdAt: -1 });
NoteSchema.index({ isPublic: 1, isActive: 1 });

// Virtual for URL-friendly slug
NoteSchema.virtual('slug').get(function() {
  return this.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
});

// Method to increment download count
NoteSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Method to increment view count
NoteSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Method to update rating
NoteSchema.methods.updateRating = function(newRating, isUpdate = false) {
  if (isUpdate) {
    // If updating existing rating, don't change count
    const totalRating = this.averageRating * this.ratingCount - newRating.oldRating + newRating.newRating;
    this.averageRating = totalRating / this.ratingCount;
  } else {
    // New rating
    const totalRating = this.averageRating * this.ratingCount + newRating;
    this.ratingCount += 1;
    this.averageRating = totalRating / this.ratingCount;
  }
  
  // Round to 2 decimal places
  this.averageRating = Math.round(this.averageRating * 100) / 100;
  
  return this.save({ validateBeforeSave: false });
};

// Static method to get notes by criteria
NoteSchema.statics.getByFilters = function(filters = {}) {
  const query = { isActive: true, isPublic: true };
  
  if (filters.subject) query.subject = filters.subject;
  if (filters.grade) query.grade = filters.grade;
  if (filters.category) query.category = filters.category;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  if (filters.uploadedBy) query.uploadedBy = filters.uploadedBy;
  
  return this.find(query)
    .populate('uploadedBy', 'name email role subject qualification')
    .sort({ createdAt: -1 });
};

// Pre-remove hook to clean up file
NoteSchema.pre('remove', function(next) {
  // Here you could add file deletion logic
  // const fs = require('fs');
  // if (fs.existsSync(this.filePath)) {
  //   fs.unlinkSync(this.filePath);
  // }
  next();
});

module.exports = mongoose.model('Note', NoteSchema);
