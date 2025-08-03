import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { verifyToken } from '../middleware/auth.js';
import { validateObjectId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Get user statistics
router.get('/:userId/stats', validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('username statistics achievements');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get recent matches
    const recentMatches = await Match.getUserHistory(userId, 10);

    // Calculate additional stats
    const totalMatches = user.statistics.totalBattles;
    const winRate = totalMatches > 0 ? Math.round((user.statistics.wins / totalMatches) * 100) : 0;

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        statistics: user.statistics,
        achievements: user.achievements,
        winRate
      },
      recentMatches: recentMatches.map(match => match.getSummary())
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      message: 'Failed to get user statistics',
      error: error.message 
    });
  }
});

// Get user match history
router.get('/:userId/matches', validateObjectId('userId'), validatePagination, async (req, res) => {
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
    console.error('Get user matches error:', error);
    res.status(500).json({ 
      message: 'Failed to get user matches',
      error: error.message 
    });
  }
});

// Get user achievements
router.get('/:userId/achievements', validateObjectId('userId'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('username achievements');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      achievements: user.achievements.sort((a, b) => b.earnedAt - a.earnedAt)
    });

  } catch (error) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ 
      message: 'Failed to get user achievements',
      error: error.message 
    });
  }
});

// Get friends list (protected)
router.get('/me/friends', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username avatar statistics.rating statistics.rank isOnline lastSeen');

    res.json({
      friends: user.friends.map(friend => ({
        _id: friend._id,
        username: friend.username,
        avatar: friend.avatar,
        rating: friend.statistics.rating,
        rank: friend.statistics.rank,
        isOnline: friend.isOnline,
        lastSeen: friend.lastSeen
      }))
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ 
      message: 'Failed to get friends list',
      error: error.message 
    });
  }
});

// Send friend request (protected)
router.post('/me/friends/request', verifyToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.userId;

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already friends
    if (user.friends.includes(targetUserId)) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Check if request already sent
    if (user.friendRequests.sent.includes(targetUserId)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if request already received
    if (user.friendRequests.received.includes(targetUserId)) {
      return res.status(400).json({ message: 'This user has already sent you a friend request' });
    }

    // Add to friend requests
    user.friendRequests.sent.push(targetUserId);
    targetUser.friendRequests.received.push(userId);

    await Promise.all([user.save(), targetUser.save()]);

    res.json({ message: 'Friend request sent successfully' });

  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ 
      message: 'Failed to send friend request',
      error: error.message 
    });
  }
});

// Accept friend request (protected)
router.post('/me/friends/accept', verifyToken, async (req, res) => {
  try {
    const { requesterId } = req.body;
    const userId = req.userId;

    const [user, requester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request exists
    if (!user.friendRequests.received.includes(requesterId)) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    // Add to friends lists
    user.friends.push(requesterId);
    requester.friends.push(userId);

    // Remove from friend requests
    user.friendRequests.received = user.friendRequests.received.filter(
      id => id.toString() !== requesterId
    );
    requester.friendRequests.sent = requester.friendRequests.sent.filter(
      id => id.toString() !== userId
    );

    await Promise.all([user.save(), requester.save()]);

    res.json({ message: 'Friend request accepted' });

  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ 
      message: 'Failed to accept friend request',
      error: error.message 
    });
  }
});

// Reject friend request (protected)
router.post('/me/friends/reject', verifyToken, async (req, res) => {
  try {
    const { requesterId } = req.body;
    const userId = req.userId;

    const [user, requester] = await Promise.all([
      User.findById(userId),
      User.findById(requesterId)
    ]);

    if (!requester) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from friend requests
    user.friendRequests.received = user.friendRequests.received.filter(
      id => id.toString() !== requesterId
    );
    requester.friendRequests.sent = requester.friendRequests.sent.filter(
      id => id.toString() !== userId
    );

    await Promise.all([user.save(), requester.save()]);

    res.json({ message: 'Friend request rejected' });

  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ 
      message: 'Failed to reject friend request',
      error: error.message 
    });
  }
});

// Remove friend (protected)
router.delete('/me/friends/:friendId', verifyToken, validateObjectId('friendId'), async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.userId;

    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId)
    ]);

    if (!friend) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from both friends lists
    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== userId);

    await Promise.all([user.save(), friend.save()]);

    res.json({ message: 'Friend removed successfully' });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ 
      message: 'Failed to remove friend',
      error: error.message 
    });
  }
});

// Get friend requests (protected)
router.get('/me/friends/requests', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friendRequests.sent', 'username avatar')
      .populate('friendRequests.received', 'username avatar');

    res.json({
      sent: user.friendRequests.sent,
      received: user.friendRequests.received
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ 
      message: 'Failed to get friend requests',
      error: error.message 
    });
  }
});

// Get online friends (protected)
router.get('/me/friends/online', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate({
        path: 'friends',
        match: { isOnline: true },
        select: 'username avatar statistics.rating statistics.rank isOnline'
      });

    res.json({
      onlineFriends: user.friends
    });

  } catch (error) {
    console.error('Get online friends error:', error);
    res.status(500).json({ 
      message: 'Failed to get online friends',
      error: error.message 
    });
  }
});

export default router;