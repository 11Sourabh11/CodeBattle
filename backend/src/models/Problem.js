import mongoose from 'mongoose';

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'array', 'string', 'hash-table', 'dynamic-programming',
      'math', 'sorting', 'greedy', 'tree', 'graph', 'binary-search',
      'two-pointers', 'sliding-window', 'stack', 'queue', 'recursion'
    ],
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  timeLimit: {
    type: Number,
    default: 2000, // milliseconds
    min: 1000,
    max: 10000
  },
  memoryLimit: {
    type: Number,
    default: 256, // MB
    min: 64,
    max: 1024
  },
  constraints: {
    type: String,
    default: ''
  },
  examples: [{
    input: {
      type: String,
      required: true
    },
    output: {
      type: String,
      required: true
    },
    explanation: {
      type: String,
      default: ''
    }
  }],
  testCases: [{
    input: {
      type: String,
      required: true
    },
    expectedOutput: {
      type: String,
      required: true
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    weight: {
      type: Number,
      default: 1
    }
  }],
  starterCode: {
    javascript: { type: String, default: '' },
    python: { type: String, default: '' },
    cpp: { type: String, default: '' },
    java: { type: String, default: '' },
    go: { type: String, default: '' },
    rust: { type: String, default: '' }
  },
  solutions: [{
    language: {
      type: String,
      enum: ['javascript', 'python', 'cpp', 'java', 'go', 'rust']
    },
    code: String,
    explanation: String,
    timeComplexity: String,
    spaceComplexity: String,
    isOptimal: { type: Boolean, default: false }
  }],
  hints: [{
    order: Number,
    content: String
  }],
  statistics: {
    totalSubmissions: { type: Number, default: 0 },
    acceptedSubmissions: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  relatedProblems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  }]
}, {
  timestamps: true
});

// Index for efficient queries
problemSchema.index({ difficulty: 1, category: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ slug: 1 });
problemSchema.index({ isActive: 1 });

// Virtual for acceptance rate
problemSchema.virtual('acceptanceRatePercentage').get(function() {
  if (this.statistics.totalSubmissions === 0) return 0;
  return Math.round((this.statistics.acceptedSubmissions / this.statistics.totalSubmissions) * 100);
});

// Virtual for average rating
problemSchema.virtual('averageRating').get(function() {
  if (this.statistics.ratingCount === 0) return 0;
  return Math.round((this.statistics.ratingSum / this.statistics.ratingCount) * 10) / 10;
});

// Virtual for total test cases
problemSchema.virtual('totalTestCases').get(function() {
  return this.testCases.length;
});

// Virtual for visible test cases
problemSchema.virtual('visibleTestCases').get(function() {
  return this.testCases.filter(tc => !tc.isHidden).length;
});

// Update acceptance rate when statistics change
problemSchema.pre('save', function(next) {
  if (this.statistics.totalSubmissions > 0) {
    this.statistics.acceptanceRate = Math.round(
      (this.statistics.acceptedSubmissions / this.statistics.totalSubmissions) * 100
    );
  }
  next();
});

// Get problem for battle (without solutions)
problemSchema.methods.getBattleVersion = function() {
  return {
    _id: this._id,
    title: this.title,
    slug: this.slug,
    description: this.description,
    difficulty: this.difficulty,
    category: this.category,
    tags: this.tags,
    constraints: this.constraints,
    examples: this.examples,
    testCases: this.testCases.filter(tc => !tc.isHidden), // Only visible test cases
    starterCode: this.starterCode,
    hints: this.hints,
    timeLimit: this.timeLimit,
    memoryLimit: this.memoryLimit,
    totalTestCases: this.totalTestCases,
    visibleTestCases: this.visibleTestCases
  };
};

// Get public problem info (for lists)
problemSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    title: this.title,
    slug: this.slug,
    difficulty: this.difficulty,
    category: this.category,
    tags: this.tags,
    acceptanceRatePercentage: this.acceptanceRatePercentage,
    averageRating: this.averageRating,
    totalSubmissions: this.statistics.totalSubmissions,
    isPremium: this.isPremium,
    createdAt: this.createdAt
  };
};

// Update statistics after submission
problemSchema.methods.updateStats = function(isAccepted, timeSpent) {
  this.statistics.totalSubmissions += 1;
  
  if (isAccepted) {
    this.statistics.acceptedSubmissions += 1;
  }
  
  // Update average time
  if (timeSpent) {
    const totalTime = this.statistics.averageTime * (this.statistics.totalSubmissions - 1) + timeSpent;
    this.statistics.averageTime = Math.round(totalTime / this.statistics.totalSubmissions);
  }
};

// Add rating
problemSchema.methods.addRating = function(rating) {
  if (rating >= 1 && rating <= 5) {
    this.statistics.ratingSum += rating;
    this.statistics.ratingCount += 1;
  }
};

// Get random problem by difficulty
problemSchema.statics.getRandomByDifficulty = async function(difficulty, excludeIds = []) {
  const query = { 
    difficulty, 
    isActive: true,
    _id: { $nin: excludeIds }
  };
  
  const count = await this.countDocuments(query);
  if (count === 0) return null;
  
  const random = Math.floor(Math.random() * count);
  return await this.findOne(query).skip(random);
};

// Get problems by category
problemSchema.statics.getByCategory = async function(category, limit = 10) {
  return await this.find({ 
    category, 
    isActive: true 
  })
  .select('title slug difficulty acceptanceRatePercentage averageRating')
  .limit(limit)
  .sort({ createdAt: -1 });
};

// Search problems
problemSchema.statics.search = async function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    ...filters
  };
  
  if (query) {
    searchQuery.$or = [
      { title: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } },
      { category: { $regex: query, $options: 'i' } }
    ];
  }
  
  return await this.find(searchQuery)
    .select('title slug difficulty category tags acceptanceRatePercentage')
    .sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
problemSchema.set('toJSON', { virtuals: true });

const Problem = mongoose.model('Problem', problemSchema);

export default Problem;