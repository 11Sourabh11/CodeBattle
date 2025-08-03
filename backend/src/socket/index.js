import { extractUserIdFromToken } from '../middleware/auth.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import roomHandlers from './roomHandlers.js';
import battleHandlers from './battleHandlers.js';
import chatHandlers from './chatHandlers.js';

// Store user socket connections
const userSockets = new Map();
const socketUsers = new Map();

const setupSocketHandlers = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const userId = extractUserIdFromToken(token);
      if (!userId) {
        return next(new Error('Invalid token'));
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = userId;
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`User ${user.username} connected (${socket.id})`);

    // Store socket connection
    userSockets.set(userId.toString(), socket);
    socketUsers.set(socket.id, userId.toString());

    // Update user online status
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Join user to their personal room for notifications
    socket.join(`user:${userId}`);

    // Emit user online status to friends
    socket.broadcast.emit('user:online', {
      userId,
      username: user.username
    });

    // Setup event handlers
    roomHandlers(socket, io);
    battleHandlers(socket, io);
    chatHandlers(socket, io);

    // Handle user presence updates
    socket.on('user:update-status', async (data) => {
      try {
        const { status } = data;
        
        // Update user status in database if needed
        await User.findByIdAndUpdate(userId, {
          lastSeen: new Date()
        });

        // Broadcast status update
        socket.broadcast.emit('user:status-update', {
          userId,
          status,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Update status error:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('typing:start', {
        userId,
        username: user.username
      });
    });

    socket.on('typing:stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('typing:stop', {
        userId
      });
    });

    // Handle real-time code sharing
    socket.on('code:update', async (data) => {
      try {
        const { roomId, code, language } = data;

        // Verify user is in the room
        const room = await Room.findOne({ roomId });
        if (!room || !room.isParticipant(userId)) {
          return socket.emit('error', { message: 'Not authorized for this room' });
        }

        // Update participant's current code
        const participant = room.participants.find(p => 
          p.user.toString() === userId.toString()
        );
        
        if (participant) {
          participant.currentCode = code;
          await room.save();
        }

        // Broadcast code update to other participants (optional, for spectators)
        socket.to(roomId).emit('code:update', {
          userId,
          username: user.username,
          code,
          language,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Code update error:', error);
        socket.emit('error', { message: 'Failed to update code' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${user.username} disconnected (${socket.id})`);

      // Remove from tracking maps
      userSockets.delete(userId.toString());
      socketUsers.delete(socket.id);

      // Update user offline status
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Leave all rooms
      const rooms = Array.from(socket.rooms);
      rooms.forEach(roomId => {
        if (roomId.startsWith('room:')) {
          socket.to(roomId).emit('user:left', {
            userId,
            username: user.username,
            timestamp: new Date()
          });
        }
      });

      // Emit user offline status
      socket.broadcast.emit('user:offline', {
        userId,
        username: user.username,
        lastSeen: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Send initial connection success
    socket.emit('connected', {
      message: 'Connected successfully',
      userId,
      username: user.username,
      timestamp: new Date()
    });
  });

  return io;
};

// Utility functions for external use
export const getUserSocket = (userId) => {
  return userSockets.get(userId.toString());
};

export const getUserBySocketId = (socketId) => {
  return socketUsers.get(socketId);
};

export const isUserOnline = (userId) => {
  return userSockets.has(userId.toString());
};

export const getOnlineUsersInRoom = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  
  return Array.from(room).map(socketId => {
    const userId = socketUsers.get(socketId);
    return userId;
  }).filter(Boolean);
};

export const sendToUser = (userId, event, data) => {
  const socket = getUserSocket(userId);
  if (socket) {
    socket.emit(event, data);
    return true;
  }
  return false;
};

export const sendToRoom = (io, roomId, event, data) => {
  io.to(roomId).emit(event, data);
};

export default setupSocketHandlers;