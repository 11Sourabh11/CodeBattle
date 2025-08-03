import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Get global leaderboard
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50, timeframe = 'all' } = req.query;
    const skip = (page - 1) * limit;

    let sortField = 'statistics.rating';
    let matchFilter = {};

    // Apply timeframe filter for recent performance
    if (timeframe !== 'all') {
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
      matchFilter = { 'battle.startedAt': { $gte: startDate } };
    }

    let users;
    let total;

    if (timeframe === 'all') {
      // Use overall rating for all-time leaderboard
      [users, total] = await Promise.all([
        User.find({ 'statistics.totalBattles': { $gt: 0 } })
          .select('username avatar statistics createdAt isOnline lastSeen')
          .sort({ 'statistics.rating': -1, 'statistics.wins': -1 })
          .limit(parseInt(limit))
          .skip(skip),
        User.countDocuments({ 'statistics.totalBattles': { $gt: 0 } })
      ]);

      // Add rank to each user
      users = users.map((user, index) => ({
        rank: skip + index + 1,
        user: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          memberSince: user.createdAt
        },
        statistics: user.statistics,
        winRate: user.statistics.totalBattles > 0 
          ? Math.round((user.statistics.wins / user.statistics.totalBattles) * 100)
          : 0
      }));
    } else {
      // Calculate recent performance-based leaderboard
      const recentPerformance = await Match.aggregate([
        { $match: matchFilter },
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
          winRate: { $divide: ['$wins', '$totalMatches'] },
          performance: {
            $add: [
              { $multiply: [{ $divide: ['$totalScore', '$totalMatches'] }, 0.4] },
              { $multiply: [{ $divide: ['$wins', '$totalMatches'] }, 0.3] },
              { $multiply: [{ $divide: [3600, '$averageTime'] }, 0.3] }
            ]
          }
        }},
        { $match: { totalMatches: { $gte: 5 } } }, // Minimum 5 matches
        { $sort: { performance: -1 } },
        { $skip: skip },
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
            avatar: '$user.avatar',
            isOnline: '$user.isOnline',
            lastSeen: '$user.lastSeen'
          },
          totalMatches: 1,
          averageScore: { $round: ['$averageScore', 1] },
          winRate: { $round: [{ $multiply: ['$winRate', 100] }, 1] },
          averageTime: { $round: ['$averageTime', 0] },
          performance: { $round: ['$performance', 2] }
        }}
      ]);

      users = recentPerformance.map((item, index) => ({
        rank: skip + index + 1,
        ...item
      }));

      total = await Match.aggregate([
        { $match: matchFilter },
        { $unwind: '$participants' },
        { $group: { _id: '$participants.user' } },
        { $count: 'total' }
      ]).then(result => result[0]?.total || 0);
    }

    res.json({
      timeframe,
      leaderboard: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ 
      message: 'Failed to get leaderboard',
      error: error.message 
    });
  }
});

// Get leaderboard by rank
router.get('/rank/:rank', async (req, res) => {
  try {
    const { rank } = req.params;
    const rankNum = parseInt(rank);

    if (rankNum < 1) {
      return res.status(400).json({ message: 'Invalid rank' });
    }

    const users = await User.find({ 'statistics.totalBattles': { $gt: 0 } })
      .select('username avatar statistics')
      .sort({ 'statistics.rating': -1, 'statistics.wins': -1 })
      .skip(rankNum - 1)
      .limit(1);

    if (users.length === 0) {
      return res.status(404).json({ message: 'No user found at this rank' });
    }

    const user = users[0];
    res.json({
      rank: rankNum,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar
      },
      statistics: user.statistics,
      winRate: user.statistics.totalBattles > 0 
        ? Math.round((user.statistics.wins / user.statistics.totalBattles) * 100)
        : 0
    });

  } catch (error) {
    console.error('Get leaderboard by rank error:', error);
    res.status(500).json({ 
      message: 'Failed to get user by rank',
      error: error.message 
    });
  }
});

// Get top performers by category
router.get('/category/:category', validatePagination, async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20, timeframe = '30d' } = req.query;
    const skip = (page - 1) * limit;

    const validCategories = ['wins', 'rating', 'battles', 'streak', 'accuracy'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        message: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
    }

    let sortField;
    switch (category) {
      case 'wins':
        sortField = { 'statistics.wins': -1 };
        break;
      case 'rating':
        sortField = { 'statistics.rating': -1 };
        break;
      case 'battles':
        sortField = { 'statistics.totalBattles': -1 };
        break;
      case 'streak':
        sortField = { 'statistics.currentStreak': -1 };
        break;
      case 'accuracy':
        // Calculate accuracy as wins/total battles
        sortField = { 'statistics.wins': -1 };
        break;
      default:
        sortField = { 'statistics.rating': -1 };
    }

    const [users, total] = await Promise.all([
      User.find({ 'statistics.totalBattles': { $gt: 0 } })
        .select('username avatar statistics')
        .sort(sortField)
        .limit(parseInt(limit))
        .skip(skip),
      User.countDocuments({ 'statistics.totalBattles': { $gt: 0 } })
    ]);

    const leaderboard = users.map((user, index) => ({
      rank: skip + index + 1,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar
      },
      statistics: user.statistics,
      categoryValue: getCategoryValue(user.statistics, category),
      winRate: user.statistics.totalBattles > 0 
        ? Math.round((user.statistics.wins / user.statistics.totalBattles) * 100)
        : 0
    }));

    res.json({
      category,
      timeframe,
      leaderboard,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get category leaderboard error:', error);
    res.status(500).json({ 
      message: 'Failed to get category leaderboard',
      error: error.message 
    });
  }
});

// Get rookie leaderboard (users with < 20 battles)
router.get('/rookies', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ 
        'statistics.totalBattles': { $gt: 0, $lt: 20 }
      })
        .select('username avatar statistics createdAt')
        .sort({ 'statistics.rating': -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      User.countDocuments({ 
        'statistics.totalBattles': { $gt: 0, $lt: 20 }
      })
    ]);

    const rookies = users.map((user, index) => ({
      rank: skip + index + 1,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        memberSince: user.createdAt
      },
      statistics: user.statistics,
      winRate: user.statistics.totalBattles > 0 
        ? Math.round((user.statistics.wins / user.statistics.totalBattles) * 100)
        : 0
    }));

    res.json({
      rookies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get rookie leaderboard error:', error);
    res.status(500).json({ 
      message: 'Failed to get rookie leaderboard',
      error: error.message 
    });
  }
});

// Get leaderboard statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ 'statistics.totalBattles': { $gt: 0 } });
    
    // Get top user
    const topUser = await User.findOne({ 'statistics.totalBattles': { $gt: 0 } })
      .select('username statistics')
      .sort({ 'statistics.rating': -1 });

    // Calculate rank distributions
    const rankDistribution = await User.aggregate([
      { $match: { 'statistics.totalBattles': { $gt: 0 } } },
      { $group: {
        _id: '$statistics.rank',
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Get average statistics
    const avgStats = await User.aggregate([
      { $match: { 'statistics.totalBattles': { $gt: 0 } } },
      { $group: {
        _id: null,
        avgRating: { $avg: '$statistics.rating' },
        avgBattles: { $avg: '$statistics.totalBattles' },
        avgWins: { $avg: '$statistics.wins' }
      }}
    ]);

    // Get recent activity
    const recentActivity = await Match.countDocuments({
      'battle.startedAt': { 
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      }
    });

    res.json({
      totalUsers,
      topUser: topUser ? {
        username: topUser.username,
        rating: topUser.statistics.rating,
        rank: topUser.statistics.rank
      } : null,
      rankDistribution,
      averageStats: avgStats[0] || {},
      recentActivity
    });

  } catch (error) {
    console.error('Get leaderboard stats error:', error);
    res.status(500).json({ 
      message: 'Failed to get leaderboard statistics',
      error: error.message 
    });
  }
});

// Get user's leaderboard position
router.get('/position/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('username statistics');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate user's rank
    const rank = await User.countDocuments({
      'statistics.rating': { $gt: user.statistics.rating },
      'statistics.totalBattles': { $gt: 0 }
    }) + 1;

    // Get users around this user's rank
    const context = 5; // Show 5 users above and below
    const contextUsers = await User.find({ 'statistics.totalBattles': { $gt: 0 } })
      .select('username avatar statistics')
      .sort({ 'statistics.rating': -1, 'statistics.wins': -1 })
      .skip(Math.max(0, rank - context - 1))
      .limit(context * 2 + 1);

    const leaderboardContext = contextUsers.map((u, index) => ({
      rank: Math.max(1, rank - context) + index,
      user: {
        _id: u._id,
        username: u.username,
        avatar: u.avatar
      },
      statistics: u.statistics,
      isCurrentUser: u._id.toString() === userId,
      winRate: u.statistics.totalBattles > 0 
        ? Math.round((u.statistics.wins / u.statistics.totalBattles) * 100)
        : 0
    }));

    res.json({
      userRank: rank,
      context: leaderboardContext
    });

  } catch (error) {
    console.error('Get user position error:', error);
    res.status(500).json({ 
      message: 'Failed to get user position',
      error: error.message 
    });
  }
});

// Helper function to get category value
function getCategoryValue(statistics, category) {
  switch (category) {
    case 'wins':
      return statistics.wins;
    case 'rating':
      return statistics.rating;
    case 'battles':
      return statistics.totalBattles;
    case 'streak':
      return statistics.currentStreak || 0;
    case 'accuracy':
      return statistics.totalBattles > 0 
        ? Math.round((statistics.wins / statistics.totalBattles) * 100)
        : 0;
    default:
      return statistics.rating;
  }
}

export default router;