import Room from '../models/Room.js';
import Problem from '../models/Problem.js';
import { v4 as uuidv4 } from 'uuid';

const roomHandlers = (socket, io) => {
  
  // Create a new room
  socket.on('room:create', async (data) => {
    try {
      const { name, settings = {}, isPrivate = false, password } = data;
      const userId = socket.userId;
      const user = socket.user;

      // Generate unique room ID
      const roomId = uuidv4().substring(0, 8).toUpperCase();

      // Create room
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

      // Join socket room
      socket.join(`room:${roomId}`);

      // Emit room created
      socket.emit('room:created', {
        room: {
          ...room.toJSON(),
          participants: [{
            user: {
              _id: user._id,
              username: user.username,
              avatar: user.avatar
            },
            joinedAt: new Date(),
            isReady: false
          }]
        }
      });

      // Broadcast new room to public list (if public)
      if (!isPrivate) {
        io.emit('room:new', room.getSummary());
      }

      console.log(`Room ${roomId} created by ${user.username}`);

    } catch (error) {
      console.error('Create room error:', error);
      socket.emit('error', { 
        message: 'Failed to create room',
        details: error.message 
      });
    }
  });

  // Join existing room
  socket.on('room:join', async (data) => {
    try {
      const { roomId, password } = data;
      const userId = socket.userId;
      const user = socket.user;

      const room = await Room.findOne({ roomId })
        .populate('participants.user', 'username avatar statistics.rating statistics.rank');

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      // Check if room is full
      if (room.isFull) {
        return socket.emit('error', { message: 'Room is full' });
      }

      // Check if already in room
      if (room.isParticipant(userId)) {
        return socket.emit('error', { message: 'Already in this room' });
      }

      // Check password for private rooms
      if (room.isPrivate && room.password && room.password !== password) {
        return socket.emit('error', { message: 'Incorrect password' });
      }

      // Check if battle is in progress
      if (room.status === 'in_progress') {
        return socket.emit('error', { message: 'Battle is already in progress' });
      }

      // Add user to room
      room.addParticipant(userId);
      await room.save();

      // Join socket room
      socket.join(`room:${roomId}`);

      // Add system message
      room.addChatMessage(null, `${user.username} joined the room`, 'system');
      await room.save();

      // Get updated room with populated participants
      const updatedRoom = await Room.findOne({ roomId })
        .populate('participants.user', 'username avatar statistics.rating statistics.rank')
        .populate('problem', 'title difficulty');

      // Emit join success to user
      socket.emit('room:joined', { room: updatedRoom });

      // Broadcast user joined to room
      socket.to(`room:${roomId}`).emit('room:user-joined', {
        user: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
          statistics: {
            rating: user.statistics.rating,
            rank: user.statistics.rank
          }
        },
        joinedAt: new Date()
      });

      // Update room list
      if (!room.isPrivate) {
        io.emit('room:updated', updatedRoom.getSummary());
      }

      console.log(`${user.username} joined room ${roomId}`);

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { 
        message: 'Failed to join room',
        details: error.message 
      });
    }
  });

  // Leave room
  socket.on('room:leave', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      const user = socket.user;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isParticipant(userId)) {
        return socket.emit('error', { message: 'Not in this room' });
      }

      // Remove user from room
      room.removeParticipant(userId);

      // Add system message
      room.addChatMessage(null, `${user.username} left the room`, 'system');

      // If room is empty or host left, handle accordingly
      if (room.participants.length === 0) {
        // Delete empty room
        await Room.findByIdAndDelete(room._id);
        io.emit('room:deleted', { roomId });
      } else if (room.isHost(userId)) {
        // Transfer host to next participant
        room.host = room.participants[0].user;
        await room.save();
        
        // Notify new host
        socket.to(`room:${roomId}`).emit('room:host-changed', {
          newHost: room.participants[0].user
        });
      } else {
        await room.save();
      }

      // Leave socket room
      socket.leave(`room:${roomId}`);

      // Emit leave success
      socket.emit('room:left', { roomId });

      // Broadcast user left to room
      socket.to(`room:${roomId}`).emit('room:user-left', {
        userId,
        username: user.username
      });

      // Update room list
      if (room.participants.length > 0 && !room.isPrivate) {
        io.emit('room:updated', room.getSummary());
      }

      console.log(`${user.username} left room ${roomId}`);

    } catch (error) {
      console.error('Leave room error:', error);
      socket.emit('error', { 
        message: 'Failed to leave room',
        details: error.message 
      });
    }
  });

  // Toggle ready status
  socket.on('room:toggle-ready', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;
      const user = socket.user;

      const room = await Room.findOne({ roomId })
        .populate('participants.user', 'username avatar');

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isParticipant(userId)) {
        return socket.emit('error', { message: 'Not in this room' });
      }

      // Get current participant
      const participant = room.participants.find(p => 
        p.user._id.toString() === userId.toString()
      );

      // Toggle ready status
      const newReadyStatus = !participant.isReady;
      room.setParticipantReady(userId, newReadyStatus);

      // Add system message
      const message = newReadyStatus ? 'is ready' : 'is not ready';
      room.addChatMessage(null, `${user.username} ${message}`, 'system');

      await room.save();

      // Broadcast ready status change
      io.to(`room:${roomId}`).emit('room:ready-changed', {
        userId,
        username: user.username,
        isReady: newReadyStatus
      });

      // Check if all participants are ready
      if (room.allParticipantsReady()) {
        room.status = 'ready';
        await room.save();

        // Start countdown to battle
        io.to(`room:${roomId}`).emit('room:all-ready', {
          message: 'All participants ready! Battle starting soon...',
          countdown: 5 // seconds
        });

        // Auto-start battle after countdown
        setTimeout(async () => {
          try {
            const latestRoom = await Room.findOne({ roomId });
            if (latestRoom && latestRoom.allParticipantsReady()) {
              // Select random problem based on difficulty
              const problem = await Problem.getRandomByDifficulty(
                latestRoom.settings.difficulty
              );

              if (problem) {
                latestRoom.problem = problem._id;
                latestRoom.startBattle();
                await latestRoom.save();

                // Emit battle start
                io.to(`room:${roomId}`).emit('battle:start', {
                  problem: problem.getBattleVersion(),
                  settings: latestRoom.settings,
                  startedAt: latestRoom.battle.startedAt
                });
              }
            }
          } catch (error) {
            console.error('Auto-start battle error:', error);
          }
        }, 5000);
      }

    } catch (error) {
      console.error('Toggle ready error:', error);
      socket.emit('error', { 
        message: 'Failed to toggle ready status',
        details: error.message 
      });
    }
  });

  // Get room list
  socket.on('room:list', async (data) => {
    try {
      const { filters = {} } = data;
      
      const query = {
        isPrivate: false,
        status: { $in: ['waiting', 'ready'] }
      };

      // Apply filters
      if (filters.difficulty) {
        query['settings.difficulty'] = filters.difficulty;
      }
      if (filters.language && filters.language !== 'any') {
        query['settings.language'] = { $in: [filters.language, 'any'] };
      }

      const rooms = await Room.find(query)
        .populate('host', 'username')
        .sort({ createdAt: -1 })
        .limit(20);

      socket.emit('room:list', {
        rooms: rooms.map(room => room.getSummary())
      });

    } catch (error) {
      console.error('Get room list error:', error);
      socket.emit('error', { 
        message: 'Failed to get room list',
        details: error.message 
      });
    }
  });

  // Get room details
  socket.on('room:get', async (data) => {
    try {
      const { roomId } = data;

      const room = await Room.findOne({ roomId })
        .populate('participants.user', 'username avatar statistics.rating statistics.rank')
        .populate('host', 'username avatar')
        .populate('problem', 'title difficulty description examples');

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      socket.emit('room:details', { room });

    } catch (error) {
      console.error('Get room details error:', error);
      socket.emit('error', { 
        message: 'Failed to get room details',
        details: error.message 
      });
    }
  });

  // Update room settings (host only)
  socket.on('room:update-settings', async (data) => {
    try {
      const { roomId, settings } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isHost(userId)) {
        return socket.emit('error', { message: 'Only host can update settings' });
      }

      if (room.status !== 'waiting') {
        return socket.emit('error', { message: 'Cannot update settings after battle starts' });
      }

      // Update allowed settings
      const allowedSettings = ['difficulty', 'language', 'timeLimit', 'maxParticipants'];
      allowedSettings.forEach(key => {
        if (settings[key] !== undefined) {
          room.settings[key] = settings[key];
        }
      });

      await room.save();

      // Broadcast settings update
      io.to(`room:${roomId}`).emit('room:settings-updated', {
        settings: room.settings
      });

    } catch (error) {
      console.error('Update room settings error:', error);
      socket.emit('error', { 
        message: 'Failed to update room settings',
        details: error.message 
      });
    }
  });
};

export default roomHandlers;