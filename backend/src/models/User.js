import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  preferredLanguage: {
    type: String,
    enum: ['javascript', 'python', 'cpp', 'java', 'go', 'rust'],
    default: 'javascript'
  },
  statistics: {
    totalBattles: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
    draws: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 1200
    },
    rank: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'],
      default: 'Bronze'
    },
    averageTime: {
      type: Number,
      default: 0
    },
    problemsSolved: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 }
    }
  },
  achievements: [{
    name: String,
    description: String,
    earnedAt: { type: Date, default: Date.now },
    icon: String
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: {
    sent: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    received: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Virtual for win rate
userSchema.virtual('winRate').get(function() {
  if (this.statistics.totalBattles === 0) return 0;
  return Math.round((this.statistics.wins / this.statistics.totalBattles) * 100);
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update rank based on rating
userSchema.pre('save', function(next) {
  const rating = this.statistics.rating;
  
  if (rating < 1300) this.statistics.rank = 'Bronze';
  else if (rating < 1500) this.statistics.rank = 'Silver';
  else if (rating < 1700) this.statistics.rank = 'Gold';
  else if (rating < 1900) this.statistics.rank = 'Platinum';
  else if (rating < 2100) this.statistics.rank = 'Diamond';
  else this.statistics.rank = 'Master';
  
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update statistics after battle
userSchema.methods.updateStats = function(result, timeSpent, difficulty) {
  this.statistics.totalBattles += 1;
  
  if (result === 'win') {
    this.statistics.wins += 1;
    this.statistics.rating += 25;
    this.statistics.problemsSolved[difficulty] += 1;
  } else if (result === 'loss') {
    this.statistics.losses += 1;
    this.statistics.rating = Math.max(800, this.statistics.rating - 20);
  } else if (result === 'draw') {
    this.statistics.draws += 1;
    this.statistics.rating += 5;
  }
  
  // Update average time
  const totalTime = this.statistics.averageTime * (this.statistics.totalBattles - 1) + timeSpent;
  this.statistics.averageTime = Math.round(totalTime / this.statistics.totalBattles);
};

// Get user profile (safe data)
userSchema.methods.getProfile = function() {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    preferredLanguage: this.preferredLanguage,
    statistics: this.statistics,
    achievements: this.achievements,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    winRate: this.winRate,
    createdAt: this.createdAt
  };
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;