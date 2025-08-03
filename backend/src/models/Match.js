import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    finalCode: String,
    language: String,
    submissions: [{
      code: String,
      submittedAt: Date,
      testResults: [{
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean,
        executionTime: Number,
        memoryUsed: Number
      }],
      score: Number,
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'error', 'timeout'],
        default: 'pending'
      },
      verdict: {
        type: String,
        enum: ['accepted', 'wrong-answer', 'time-limit-exceeded', 'memory-limit-exceeded', 'runtime-error', 'compilation-error'],
        default: null
      }
    }],
    finalScore: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0 // in seconds
    },
    submissionCount: {
      type: Number,
      default: 0
    },
    correctTestCases: {
      type: Number,
      default: 0
    },
    totalTestCases: {
      type: Number,
      default: 0
    },
    ratingChange: {
      type: Number,
      default: 0
    },
    achievements: [{
      name: String,
      description: String,
      earnedAt: { type: Date, default: Date.now }
    }]
  }],
  settings: {
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    language: String,
    timeLimit: Number, // in minutes
    maxParticipants: Number,
    isRanked: Boolean
  },
  battle: {
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true // in seconds
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled', 'timeout'],
      default: 'completed'
    }
  },
  chat: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: Date,
    type: {
      type: String,
      enum: ['message', 'system', 'announcement'],
      default: 'message'
    }
  }],
  spectators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    leftAt: Date
  }],
  analytics: {
    averageScore: Number,
    averageTime: Number,
    totalSubmissions: Number,
    languageDistribution: {
      javascript: Number,
      python: Number,
      cpp: Number,
      java: Number,
      go: Number,
      rust: Number
    },
    difficultyRating: Number // How difficult users found this match
  }
}, {
  timestamps: true
});

// Index for efficient queries
matchSchema.index({ 'participants.user': 1 });
matchSchema.index({ 'battle.startedAt': -1 });
matchSchema.index({ 'settings.difficulty': 1 });
matchSchema.index({ problem: 1 });

// Virtual for match duration in minutes
matchSchema.virtual('durationMinutes').get(function() {
  return Math.round(this.battle.duration / 60);
});

// Virtual for participant count
matchSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Get match summary for lists
matchSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    matchId: this.matchId,
    problem: this.problem,
    participantCount: this.participantCount,
    winner: this.battle.winner,
    difficulty: this.settings.difficulty,
    duration: this.durationMinutes,
    startedAt: this.battle.startedAt,
    status: this.battle.status
  };
};

// Get user's performance in this match
matchSchema.methods.getUserPerformance = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) return null;
  
  return {
    rank: participant.rank,
    score: participant.finalScore,
    timeSpent: participant.timeSpent,
    submissionCount: participant.submissionCount,
    accuracy: participant.totalTestCases > 0 
      ? Math.round((participant.correctTestCases / participant.totalTestCases) * 100)
      : 0,
    ratingChange: participant.ratingChange,
    achievements: participant.achievements,
    language: participant.language,
    verdict: participant.submissions.length > 0 
      ? participant.submissions[participant.submissions.length - 1].verdict
      : null
  };
};

// Calculate participant rankings
matchSchema.methods.calculateRankings = function() {
  const sortedParticipants = [...this.participants].sort((a, b) => {
    // Primary: Final score (higher is better)
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    
    // Secondary: Time spent (lower is better)
    if (a.timeSpent !== b.timeSpent) {
      return a.timeSpent - b.timeSpent;
    }
    
    // Tertiary: Submission count (lower is better)
    return a.submissionCount - b.submissionCount;
  });
  
  sortedParticipants.forEach((participant, index) => {
    participant.rank = index + 1;
  });
  
  // Set winner
  if (sortedParticipants.length > 0) {
    this.battle.winner = sortedParticipants[0].user;
  }
};

// Update analytics
matchSchema.methods.updateAnalytics = function() {
  const participants = this.participants;
  
  if (participants.length === 0) return;
  
  // Calculate averages
  const totalScore = participants.reduce((sum, p) => sum + p.finalScore, 0);
  const totalTime = participants.reduce((sum, p) => sum + p.timeSpent, 0);
  const totalSubmissions = participants.reduce((sum, p) => sum + p.submissionCount, 0);
  
  this.analytics.averageScore = Math.round(totalScore / participants.length);
  this.analytics.averageTime = Math.round(totalTime / participants.length);
  this.analytics.totalSubmissions = totalSubmissions;
  
  // Language distribution
  const langDist = {
    javascript: 0,
    python: 0,
    cpp: 0,
    java: 0,
    go: 0,
    rust: 0
  };
  
  participants.forEach(p => {
    if (p.language && langDist.hasOwnProperty(p.language)) {
      langDist[p.language]++;
    }
  });
  
  this.analytics.languageDistribution = langDist;
};

// Add submission to participant
matchSchema.methods.addSubmission = function(userId, submissionData) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) return false;
  
  participant.submissions.push({
    ...submissionData,
    submittedAt: new Date()
  });
  
  participant.submissionCount = participant.submissions.length;
  
  // Update final score and stats from latest submission
  const latestSubmission = participant.submissions[participant.submissions.length - 1];
  if (latestSubmission.score !== undefined) {
    participant.finalScore = latestSubmission.score;
    participant.correctTestCases = latestSubmission.testResults.filter(tr => tr.passed).length;
    participant.totalTestCases = latestSubmission.testResults.length;
  }
  
  return true;
};

// Get user's match history
matchSchema.statics.getUserHistory = async function(userId, limit = 20, skip = 0) {
  return await this.find({
    'participants.user': userId
  })
  .populate('problem', 'title slug difficulty')
  .populate('participants.user', 'username avatar')
  .sort({ 'battle.startedAt': -1 })
  .limit(limit)
  .skip(skip);
};

// Get match statistics
matchSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalMatches: { $sum: 1 },
        avgDuration: { $avg: '$battle.duration' },
        avgParticipants: { $avg: { $size: '$participants' } },
        difficultyDistribution: {
          $push: '$settings.difficulty'
        }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {};
};

// Ensure virtual fields are serialized
matchSchema.set('toJSON', { virtuals: true });

const Match = mongoose.model('Match', matchSchema);

export default Match;