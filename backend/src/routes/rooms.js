import express from 'express';
import Room from '../models/Room.js';
import { verifyToken } from '../middleware/auth.js';
import { validateRoomCreation, validateRoomId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Get all public rooms
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, difficulty, language, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      isPrivate: false
    };

    // Apply filters
    if (difficulty) {
      query['settings.difficulty'] = difficulty;
    }
    if (language && language !== 'any') {
      query['settings.language'] = { $in: [language, 'any'] };
    }
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['waiting', 'ready'] };
    }

    const [rooms, total] = await Promise.all([
      Room.find(query)
        .populate('host', 'username avatar')
        .populate('participants.user', 'username avatar statistics.rating')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Room.countDocuments(query)
    ]);

    res.json({
      rooms: rooms.map(room => ({
        ...room.getSummary(),
        host: room.host,
        participants: room.participants.map(p => ({
          user: p.user,
          joinedAt: p.joinedAt,
          isReady: p.isReady
        }))
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ 
      message: 'Failed to get rooms',
      error: error.message 
    });
  }
});

// Get room by ID
router.get('/:roomId', validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate('host', 'username avatar statistics.rating statistics.rank')
      .populate('participants.user', 'username avatar statistics.rating statistics.rank')
      .populate('spectators', 'username avatar')
      .populate('problem', 'title difficulty description examples constraints timeLimit');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Don't show private room details unless user is authorized
    if (room.isPrivate) {
      return res.status(403).json({ message: 'Room is private' });
    }

    res.json({ room });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ 
      message: 'Failed to get room',
      error: error.message 
    });
  }
});

// Create room (protected)
router.post('/', verifyToken, validateRoomCreation, async (req, res) => {
  try {
    const { name, settings = {}, isPrivate = false, password } = req.body;
    const userId = req.userId;

    // Generate unique room ID
    const roomId = generateRoomId();

    const room = new Room({
      roomId,
      name,
      type: isPrivate ? 'private' : 'public',
      host: userId,
      settings: {
        maxParticipants: settings.maxParticipants || 2,
        difficulty: settings.difficulty || 'medium',
        language: settings.language || 'any',
        timeLimit: settings.timeLimit || 15,
        isRanked: settings.isRanked !== false,
        allowSpectators: settings.allowSpectators !== false
      },
      isPrivate,
      password
    });

    // Add host as first participant
    room.addParticipant(userId);
    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate('host', 'username avatar')
      .populate('participants.user', 'username avatar statistics.rating');

    res.status(201).json({
      message: 'Room created successfully',
      room: populatedRoom
    });

  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ 
      message: 'Failed to create room',
      error: error.message 
    });
  }
});

// Update room settings (protected)
router.put('/:roomId/settings', verifyToken, validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { settings } = req.body;
    const userId = req.userId;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isHost(userId)) {
      return res.status(403).json({ message: 'Only host can update room settings' });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ message: 'Cannot update settings after battle starts' });
    }

    // Update allowed settings
    const allowedSettings = ['difficulty', 'language', 'timeLimit', 'maxParticipants', 'allowSpectators'];
    allowedSettings.forEach(key => {
      if (settings[key] !== undefined) {
        room.settings[key] = settings[key];
      }
    });

    await room.save();

    res.json({
      message: 'Room settings updated successfully',
      settings: room.settings
    });

  } catch (error) {
    console.error('Update room settings error:', error);
    res.status(500).json({ 
      message: 'Failed to update room settings',
      error: error.message 
    });
  }
});

// Join room (protected)
router.post('/:roomId/join', verifyToken, validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const userId = req.userId;

    const room = await Room.findOne({ roomId })
      .populate('participants.user', 'username avatar');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isFull) {
      return res.status(400).json({ message: 'Room is full' });
    }

    if (room.isParticipant(userId)) {
      return res.status(400).json({ message: 'Already in this room' });
    }

    if (room.isPrivate && room.password && room.password !== password) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    if (room.status === 'in_progress') {
      return res.status(400).json({ message: 'Battle is already in progress' });
    }

    room.addParticipant(userId);
    await room.save();

    const updatedRoom = await Room.findOne({ roomId })
      .populate('participants.user', 'username avatar statistics.rating');

    res.json({
      message: 'Joined room successfully',
      room: updatedRoom
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ 
      message: 'Failed to join room',
      error: error.message 
    });
  }
});

// Leave room (protected)
router.post('/:roomId/leave', verifyToken, validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isParticipant(userId)) {
      return res.status(400).json({ message: 'Not in this room' });
    }

    room.removeParticipant(userId);

    if (room.participants.length === 0) {
      await Room.findByIdAndDelete(room._id);
      return res.json({ message: 'Left room and room deleted' });
    }

    if (room.isHost(userId)) {
      room.host = room.participants[0].user;
    }

    await room.save();

    res.json({ message: 'Left room successfully' });

  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ 
      message: 'Failed to leave room',
      error: error.message 
    });
  }
});

// Get room chat (protected)
router.get('/:roomId/chat', verifyToken, validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.userId;

    const room = await Room.findOne({ roomId })
      .populate('chat.user', 'username avatar')
      .select('chat participants spectators');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user has access
    const isParticipant = room.isParticipant(userId);
    const isSpectator = room.spectators.includes(userId);

    if (!isParticipant && !isSpectator) {
      return res.status(403).json({ message: 'Not authorized to view chat' });
    }

    const messages = room.chat
      .slice(-parseInt(limit))
      .map(msg => ({
        _id: msg._id,
        user: msg.user,
        message: msg.message,
        timestamp: msg.timestamp,
        type: msg.type
      }));

    res.json({ messages });

  } catch (error) {
    console.error('Get room chat error:', error);
    res.status(500).json({ 
      message: 'Failed to get room chat',
      error: error.message 
    });
  }
});

// Delete room (protected - host only)
router.delete('/:roomId', verifyToken, validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isHost(userId)) {
      return res.status(403).json({ message: 'Only host can delete room' });
    }

    if (room.status === 'in_progress') {
      return res.status(400).json({ message: 'Cannot delete room during battle' });
    }

    await Room.findByIdAndDelete(room._id);

    res.json({ message: 'Room deleted successfully' });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ 
      message: 'Failed to delete room',
      error: error.message 
    });
  }
});

// Get room statistics
router.get('/:roomId/stats', validateRoomId, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate('participants.user', 'username statistics.rating')
      .select('participants settings status battle createdAt');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const stats = {
      participantCount: room.participants.length,
      averageRating: room.participants.length > 0 
        ? Math.round(room.participants.reduce((sum, p) => sum + p.user.statistics.rating, 0) / room.participants.length)
        : 0,
      difficulty: room.settings.difficulty,
      timeLimit: room.settings.timeLimit,
      status: room.status,
      duration: room.battle.startedAt 
        ? Math.round((Date.now() - room.battle.startedAt) / 1000 / 60)
        : 0,
      createdAt: room.createdAt
    };

    res.json({ stats });

  } catch (error) {
    console.error('Get room stats error:', error);
    res.status(500).json({ 
      message: 'Failed to get room statistics',
      error: error.message 
    });
  }
});

// Helper function to generate room ID
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;