import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['public', 'private', 'custom'],
    default: 'public'
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isReady: {
      type: Boolean,
      default: false
    },
    currentCode: {
      type: String,
      default: ''
    },
    lastSubmission: {
      code: String,
      language: String,
      submittedAt: Date,
      testResults: [{
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean,
        executionTime: Number
      }],
      score: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'error'],
        default: 'pending'
      }
    }
  }],
  settings: {
    maxParticipants: {
      type: Number,
      default: 2,
      min: 2,
      max: 10
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    language: {
      type: String,
      enum: ['javascript', 'python', 'cpp', 'java', 'go', 'rust', 'any'],
      default: 'any'
    },
    timeLimit: {
      type: Number,
      default: 15, // minutes
      min: 5,
      max: 60
    },
    isRanked: {
      type: Boolean,
      default: true
    },
    allowSpectators: {
      type: Boolean,
      default: true
    }
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  },
  status: {
    type: String,
    enum: ['waiting', 'ready', 'in_progress', 'completed', 'cancelled'],
    default: 'waiting'
  },
  battle: {
    startedAt: Date,
    endedAt: Date,
    duration: Number, // in seconds
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    results: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      finalScore: Number,
      timeSpent: Number,
      submissionCount: Number,
      correctTests: Number,
      totalTests: Number,
      rank: Number
    }]
  },
  spectators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  chat: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['message', 'system', 'announcement'],
      default: 'message'
    }
  }],
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
roomSchema.index({ status: 1, type: 1 });
roomSchema.index({ 'participants.user': 1 });
roomSchema.index({ host: 1 });

// Virtual for current participant count
roomSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for available slots
roomSchema.virtual('availableSlots').get(function() {
  return this.settings.maxParticipants - this.participants.length;
});

// Virtual for is full
roomSchema.virtual('isFull').get(function() {
  return this.participants.length >= this.settings.maxParticipants;
});

// Check if user is participant
roomSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Check if user is host
roomSchema.methods.isHost = function(userId) {
  return this.host.toString() === userId.toString();
};

// Check if all participants are ready
roomSchema.methods.allParticipantsReady = function() {
  return this.participants.length >= 2 && 
         this.participants.every(p => p.isReady);
};

// Add participant to room
roomSchema.methods.addParticipant = function(userId) {
  if (this.isFull || this.isParticipant(userId)) {
    return false;
  }
  
  this.participants.push({
    user: userId,
    joinedAt: new Date(),
    isReady: false
  });
  
  return true;
};

// Remove participant from room
roomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    p => p.user.toString() !== userId.toString()
  );
};

// Set participant ready status
roomSchema.methods.setParticipantReady = function(userId, isReady = true) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isReady = isReady;
    return true;
  }
  
  return false;
};

// Start battle
roomSchema.methods.startBattle = function() {
  if (!this.allParticipantsReady() || this.status !== 'ready') {
    return false;
  }
  
  this.status = 'in_progress';
  this.battle.startedAt = new Date();
  
  return true;
};

// End battle
roomSchema.methods.endBattle = function(results) {
  this.status = 'completed';
  this.battle.endedAt = new Date();
  this.battle.duration = Math.round(
    (this.battle.endedAt - this.battle.startedAt) / 1000
  );
  this.battle.results = results;
  
  // Determine winner (highest score)
  if (results.length > 0) {
    const winner = results.reduce((prev, current) => 
      prev.finalScore > current.finalScore ? prev : current
    );
    this.battle.winner = winner.user;
  }
};

// Add chat message
roomSchema.methods.addChatMessage = function(userId, message, type = 'message') {
  this.chat.push({
    user: userId,
    message: message,
    type: type,
    timestamp: new Date()
  });
  
  // Keep only last 100 messages
  if (this.chat.length > 100) {
    this.chat = this.chat.slice(-100);
  }
};

// Get room summary (safe data for lists)
roomSchema.methods.getSummary = function() {
  return {
    _id: this._id,
    roomId: this.roomId,
    name: this.name,
    type: this.type,
    participantCount: this.participantCount,
    availableSlots: this.availableSlots,
    settings: this.settings,
    status: this.status,
    isPrivate: this.isPrivate,
    createdAt: this.createdAt
  };
};

// Ensure virtual fields are serialized
roomSchema.set('toJSON', { virtuals: true });

const Room = mongoose.model('Room', roomSchema);

export default Room;