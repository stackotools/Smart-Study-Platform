const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  // Reference to the note being reviewed
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: [true, 'Note ID is required']
  },
  // Student who made the review
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  // Written feedback
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters'],
    default: ''
  },
  // Helpful categories
  categories: {
    helpful: {
      type: Boolean,
      default: false
    },
    clear: {
      type: Boolean,
      default: false
    },
    complete: {
      type: Boolean,
      default: false
    },
    accurate: {
      type: Boolean,
      default: false
    }
  },
  // Review status
  isActive: {
    type: Boolean,
    default: true
  },
  // Moderation
  isApproved: {
    type: Boolean,
    default: true // Auto-approve for now
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderationNote: {
    type: String,
    trim: true,
    maxlength: [200, 'Moderation note cannot be more than 200 characters']
  },
  // Helpfulness tracking
  helpfulVotes: {
    type: Number,
    default: 0
  },
  totalVotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to ensure one review per student per note
ReviewSchema.index({ noteId: 1, studentId: 1 }, { unique: true });
ReviewSchema.index({ noteId: 1, isActive: 1, isApproved: 1 });
ReviewSchema.index({ studentId: 1, createdAt: -1 });

// Virtual for helpfulness percentage
ReviewSchema.virtual('helpfulnessPercentage').get(function() {
  if (this.totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / this.totalVotes) * 100);
});

// Method to add helpful vote
ReviewSchema.methods.addHelpfulVote = function(isHelpful = true) {
  this.totalVotes += 1;
  if (isHelpful) {
    this.helpfulVotes += 1;
  }
  return this.save({ validateBeforeSave: false });
};

// Static method to get reviews for a note
ReviewSchema.statics.getForNote = function(noteId, options = {}) {
  const query = {
    noteId: noteId,
    isActive: true,
    isApproved: true
  };
  
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1;
  const limit = options.limit || 10;
  const skip = options.skip || 0;
  
  return this.find(query)
    .populate('studentId', 'name profilePicture')
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip);
};

// Static method to get statistics for a note
ReviewSchema.statics.getStatistics = async function(noteId) {
  const stats = await this.aggregate([
    {
      $match: {
        noteId: new mongoose.Types.ObjectId(noteId),
        isActive: true,
        isApproved: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        },
        categoriesStats: {
          $push: '$categories'
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoriesStats: { helpful: 0, clear: 0, complete: 0, accurate: 0 }
    };
  }
  
  const result = stats[0];
  
  // Calculate rating distribution
  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.ratingDistribution.forEach(rating => {
    ratingDist[rating] += 1;
  });
  
  // Calculate categories statistics
  const categoryStats = { helpful: 0, clear: 0, complete: 0, accurate: 0 };
  result.categoriesStats.forEach(categories => {
    Object.keys(categoryStats).forEach(key => {
      if (categories[key]) categoryStats[key] += 1;
    });
  });
  
  return {
    averageRating: Math.round(result.averageRating * 10) / 10,
    totalReviews: result.totalReviews,
    ratingDistribution: ratingDist,
    categoriesStats: categoryStats
  };
};

// Pre-save hook to update note's average rating
ReviewSchema.post('save', async function() {
  const Note = mongoose.model('Note');
  const stats = await this.constructor.getStatistics(this.noteId);
  
  await Note.findByIdAndUpdate(this.noteId, {
    averageRating: stats.averageRating,
    ratingCount: stats.totalReviews
  });
});

// Pre-remove hook to update note's average rating
ReviewSchema.post('remove', async function() {
  const Note = mongoose.model('Note');
  const stats = await this.constructor.getStatistics(this.noteId);
  
  await Note.findByIdAndUpdate(this.noteId, {
    averageRating: stats.averageRating,
    ratingCount: stats.totalReviews
  });
});

module.exports = mongoose.model('Review', ReviewSchema);
