import express from 'express';
import Match from '../models/Match.js';
import Room from '../models/Room.js';
import { verifyToken } from '../middleware/auth.js';
import { validateObjectId, validatePagination, validateCodeSubmission } from '../middleware/validation.js';
import { executeCode, validateCode } from '../utils/codeExecutor.js';

const router = express.Router();

// Get all matches (public)
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, difficulty, status } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (difficulty) {
      query['settings.difficulty'] = difficulty;
    }
    if (status) {
      query['battle.status'] = status;
    }
    
    const [matches, total] = await Promise.all([
      Match.find(query)
        .populate('participants.user', 'username avatar')
        .populate('problem', 'title difficulty')
        .sort({ 'battle.startedAt': -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Match.countDocuments(query)
    ]);
    
    res.json({
      matches: matches.map(match => match.getSummary()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ 
      message: 'Failed to get matches',
      error: error.message 
    });
  }
});

// Get match by ID
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await Match.findOne({ matchId })
      .populate('participants.user', 'username avatar statistics.rating statistics.rank')
      .populate('problem', 'title difficulty description examples')
      .populate('room', 'roomId name');
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    res.json({ match });
    
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ 
      message: 'Failed to get match',
      error: error.message 
    });
  }
});

// Get user's match history
router.get('/user/:userId', validateObjectId('userId'), validatePagination, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const matches = await Match.getUserHistory(userId, parseInt(limit), skip);
    
    res.json({
      matches: matches.map(match => ({
        ...match.getSummary(),
        userPerformance: match.getUserPerformance(userId)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: matches.length === parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get user match history error:', error);
    res.status(500).json({ 
      message: 'Failed to get user match history',
      error: error.message 
    });
  }
});

// Get current user's match history (protected)
router.get('/me/history', verifyToken, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.userId;
    
    const matches = await Match.getUserHistory(userId, parseInt(limit), skip);
    
    res.json({
      matches: matches.map(match => ({
        ...match.getSummary(),
        userPerformance: match.getUserPerformance(userId)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: matches.length === parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get my match history error:', error);
    res.status(500).json({ 
      message: 'Failed to get match history',
      error: error.message 
    });
  }
});

// Test code submission (protected)
router.post('/test-code', verifyToken, validateCodeSubmission, async (req, res) => {
  try {
    const { code, language, problemId } = req.body;
    
    // Validate code
    const validation = validateCode(code, language);
    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Code validation failed',
        errors: validation.errors
      });
    }
    
    // Get problem for test cases
    const Problem = (await import('../models/Problem.js')).default;
    const problem = await Problem.findById(problemId);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    // Execute only visible test cases for testing
    const visibleTestCases = problem.testCases.filter(tc => !tc.isHidden);
    
    const testResults = await executeCode(
      code,
      language,
      visibleTestCases,
      {
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit
      }
    );
    
    const passedTests = testResults.filter(result => result.passed).length;
    const totalTests = testResults.length;
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    res.json({
      score,
      passedTests,
      totalTests,
      testResults: testResults.map(result => ({
        passed: result.passed,
        executionTime: result.executionTime,
        input: result.input ? result.input.substring(0, 100) : '',
        expectedOutput: result.expectedOutput ? result.expectedOutput.substring(0, 100) : '',
        actualOutput: result.actualOutput ? result.actualOutput.substring(0, 100) : '',
        error: result.error
      }))
    });
    
  } catch (error) {
    console.error('Test code error:', error);
    res.status(500).json({ 
      message: 'Code testing failed',
      error: error.message 
    });
  }
});

// Get active battles
router.get('/active/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const activeRooms = await Room.find({ 
      status: 'in_progress',
      'settings.allowSpectators': true,
      isPrivate: false
    })
    .populate('participants.user', 'username avatar statistics.rating')
    .populate('problem', 'title difficulty')
    .sort({ 'battle.startedAt': -1 })
    .limit(parseInt(limit));
    
    const battles = activeRooms.map(room => ({
      roomId: room.roomId,
      name: room.name,
      participants: room.participants.map(p => ({
        user: p.user,
        score: p.lastSubmission ? p.lastSubmission.score : 0
      })),
      problem: room.problem,
      startedAt: room.battle.startedAt,
      timeRemaining: room.settings.timeLimit - 
        Math.floor((Date.now() - room.battle.startedAt) / 1000 / 60),
      spectatorCount: room.spectators.length
    }));
    
    res.json({ battles });
    
  } catch (error) {
    console.error('Get active battles error:', error);
    res.status(500).json({ 
      message: 'Failed to get active battles',
      error: error.message 
    });
  }
});

// Get battle statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '1d':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
    
    const filters = {
      'battle.startedAt': { $gte: startDate }
    };
    
    const stats = await Match.getStatistics(filters);
    
    // Get difficulty distribution
    const difficultyStats = await Match.aggregate([
      { $match: filters },
      { $group: { 
        _id: '$settings.difficulty',
        count: { $sum: 1 }
      }}
    ]);
    
    // Get language distribution
    const languageStats = await Match.aggregate([
      { $match: filters },
      { $unwind: '$participants' },
      { $group: {
        _id: '$participants.language',
        count: { $sum: 1 }
      }},
      { $match: { _id: { $ne: null } } }
    ]);
    
    res.json({
      timeframe,
      overview: stats,
      difficultyDistribution: difficultyStats,
      languageDistribution: languageStats
    });
    
  } catch (error) {
    console.error('Get battle stats error:', error);
    res.status(500).json({ 
      message: 'Failed to get battle statistics',
      error: error.message 
    });
  }
});

// Get recent battles
router.get('/recent/list', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const recentMatches = await Match.find({
      'battle.status': 'completed'
    })
    .populate('participants.user', 'username avatar')
    .populate('problem', 'title difficulty')
    .sort({ 'battle.endedAt': -1 })
    .limit(parseInt(limit));
    
    res.json({
      matches: recentMatches.map(match => match.getSummary())
    });
    
  } catch (error) {
    console.error('Get recent battles error:', error);
    res.status(500).json({ 
      message: 'Failed to get recent battles',
      error: error.message 
    });
  }
});

// Get battle leaderboard (top performers)
router.get('/leaderboard/top', async (req, res) => {
  try {
    const { limit = 10, timeframe = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    
    const topPerformers = await Match.aggregate([
      { $match: { 'battle.startedAt': { $gte: startDate } } },
      { $unwind: '$participants' },
      { $group: {
        _id: '$participants.user',
        totalMatches: { $sum: 1 },
        totalScore: { $sum: '$participants.finalScore' },
        wins: { 
          $sum: { 
            $cond: [{ $eq: ['$participants.rank', 1] }, 1, 0] 
          }
        },
        averageTime: { $avg: '$participants.timeSpent' }
      }},
      { $addFields: {
        averageScore: { $divide: ['$totalScore', '$totalMatches'] },
        winRate: { $divide: ['$wins', '$totalMatches'] }
      }},
      { $sort: { averageScore: -1, winRate: -1 } },
      { $limit: parseInt(limit) },
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        user: {
          _id: '$user._id',
          username: '$user.username',
          avatar: '$user.avatar'
        },
        totalMatches: 1,
        averageScore: { $round: ['$averageScore', 1] },
        winRate: { $round: [{ $multiply: ['$winRate', 100] }, 1] },
        averageTime: { $round: ['$averageTime', 0] }
      }}
    ]);
    
    res.json({
      timeframe,
      leaderboard: topPerformers
    });
    
  } catch (error) {
    console.error('Get battle leaderboard error:', error);
    res.status(500).json({ 
      message: 'Failed to get battle leaderboard',
      error: error.message 
    });
  }
});

export default router;