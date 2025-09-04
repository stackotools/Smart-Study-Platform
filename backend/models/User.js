const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: [true, 'Please specify user role'],
    default: 'student'
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
    default: ''
  },
  // Teacher-specific fields
  subject: {
    type: String,
    required: function() {
      return this.role === 'teacher';
    }
  },
  qualification: {
    type: String,
    required: function() {
      return this.role === 'teacher';
    }
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    required: function() {
      return this.role === 'teacher';
    }
  },
  // Student-specific fields
  grade: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  interests: [{
    type: String,
    trim: true
  }],
  // Common fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpire: Date
}, {
  timestamps: true
});

// Index for better query performance
UserSchema.index({ email: 1, role: 1 });

// Encrypt password using bcrypt before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login timestamp
UserSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save({ validateBeforeSave: false });
};

// Get user data without sensitive information
UserSchema.methods.getPublicData = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpire;
  return userObject;
};

module.exports = mongoose.model('User', UserSchema);
