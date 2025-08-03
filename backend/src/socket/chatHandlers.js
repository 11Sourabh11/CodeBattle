import Room from '../models/Room.js';

const chatHandlers = (socket, io) => {

  // Send chat message
  socket.on('chat:message', async (data) => {
    try {
      const { roomId, message } = data;
      const userId = socket.userId;
      const user = socket.user;

      // Validate message
      if (!message || message.trim().length === 0) {
        return socket.emit('error', { message: 'Message cannot be empty' });
      }

      if (message.length > 500) {
        return socket.emit('error', { message: 'Message too long (max 500 characters)' });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      // Check if user is participant or spectator
      const isParticipant = room.isParticipant(userId);
      const isSpectator = room.spectators.includes(userId);

      if (!isParticipant && !isSpectator) {
        return socket.emit('error', { message: 'Not authorized to chat in this room' });
      }

      // Add message to room
      room.addChatMessage(userId, message.trim(), 'message');
      await room.save();

      // Broadcast message to room
      const chatMessage = {
        _id: room.chat[room.chat.length - 1]._id,
        user: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar
        },
        message: message.trim(),
        timestamp: new Date(),
        type: 'message'
      };

      io.to(`room:${roomId}`).emit('chat:message', chatMessage);

    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('error', { 
        message: 'Failed to send message',
        details: error.message 
      });
    }
  });

  // Get chat history
  socket.on('chat:history', async (data) => {
    try {
      const { roomId, limit = 50 } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId })
        .populate('chat.user', 'username avatar')
        .select('chat participants spectators');

      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      // Check if user has access to chat
      const isParticipant = room.isParticipant(userId);
      const isSpectator = room.spectators.includes(userId);

      if (!isParticipant && !isSpectator) {
        return socket.emit('error', { message: 'Not authorized to view chat' });
      }

      // Get recent messages
      const messages = room.chat
        .slice(-limit)
        .map(msg => ({
          _id: msg._id,
          user: msg.user ? {
            _id: msg.user._id,
            username: msg.user.username,
            avatar: msg.user.avatar
          } : null,
          message: msg.message,
          timestamp: msg.timestamp,
          type: msg.type
        }));

      socket.emit('chat:history', { messages });

    } catch (error) {
      console.error('Get chat history error:', error);
      socket.emit('error', { 
        message: 'Failed to get chat history',
        details: error.message 
      });
    }
  });

  // Send typing indicator
  socket.on('chat:typing', (data) => {
    try {
      const { roomId, isTyping } = data;
      const userId = socket.userId;
      const user = socket.user;

      // Broadcast typing status to others in room
      socket.to(`room:${roomId}`).emit('chat:typing', {
        userId,
        username: user.username,
        isTyping
      });

    } catch (error) {
      console.error('Chat typing error:', error);
    }
  });

  // Send system message (internal use)
  const sendSystemMessage = async (roomId, message) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.addChatMessage(null, message, 'system');
        await room.save();

        const systemMessage = {
          _id: room.chat[room.chat.length - 1]._id,
          user: null,
          message,
          timestamp: new Date(),
          type: 'system'
        };

        io.to(`room:${roomId}`).emit('chat:message', systemMessage);
      }
    } catch (error) {
      console.error('Send system message error:', error);
    }
  };

  // Send announcement (host only)
  socket.on('chat:announcement', async (data) => {
    try {
      const { roomId, message } = data;
      const userId = socket.userId;

      if (!message || message.trim().length === 0) {
        return socket.emit('error', { message: 'Announcement cannot be empty' });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isHost(userId)) {
        return socket.emit('error', { message: 'Only host can send announcements' });
      }

      // Add announcement to room
      room.addChatMessage(userId, message.trim(), 'announcement');
      await room.save();

      // Broadcast announcement to room
      const announcement = {
        _id: room.chat[room.chat.length - 1]._id,
        user: {
          _id: socket.user._id,
          username: socket.user.username,
          avatar: socket.user.avatar
        },
        message: message.trim(),
        timestamp: new Date(),
        type: 'announcement'
      };

      io.to(`room:${roomId}`).emit('chat:message', announcement);

    } catch (error) {
      console.error('Chat announcement error:', error);
      socket.emit('error', { 
        message: 'Failed to send announcement',
        details: error.message 
      });
    }
  });

  // Delete message (host only)
  socket.on('chat:delete', async (data) => {
    try {
      const { roomId, messageId } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isHost(userId)) {
        return socket.emit('error', { message: 'Only host can delete messages' });
      }

      // Find and remove message
      const messageIndex = room.chat.findIndex(msg => 
        msg._id.toString() === messageId
      );

      if (messageIndex === -1) {
        return socket.emit('error', { message: 'Message not found' });
      }

      room.chat.splice(messageIndex, 1);
      await room.save();

      // Broadcast message deletion
      io.to(`room:${roomId}`).emit('chat:deleted', { messageId });

    } catch (error) {
      console.error('Delete chat message error:', error);
      socket.emit('error', { 
        message: 'Failed to delete message',
        details: error.message 
      });
    }
  });

  // Mute user (host only)
  socket.on('chat:mute', async (data) => {
    try {
      const { roomId, targetUserId, duration = 300 } = data; // 5 minutes default
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isHost(userId)) {
        return socket.emit('error', { message: 'Only host can mute users' });
      }

      // For now, just broadcast the mute (can be enhanced with actual muting logic)
      io.to(`room:${roomId}`).emit('chat:user-muted', {
        userId: targetUserId,
        duration,
        mutedBy: userId
      });

      // Send system message
      await sendSystemMessage(roomId, `User has been muted for ${Math.round(duration/60)} minutes`);

    } catch (error) {
      console.error('Mute user error:', error);
      socket.emit('error', { 
        message: 'Failed to mute user',
        details: error.message 
      });
    }
  });

  // Clear chat (host only)
  socket.on('chat:clear', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      const room = await Room.findOne({ roomId });
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }

      if (!room.isHost(userId)) {
        return socket.emit('error', { message: 'Only host can clear chat' });
      }

      // Clear chat history
      room.chat = [];
      await room.save();

      // Broadcast chat clear
      io.to(`room:${roomId}`).emit('chat:cleared');

      // Add system message
      await sendSystemMessage(roomId, 'Chat has been cleared by the host');

    } catch (error) {
      console.error('Clear chat error:', error);
      socket.emit('error', { 
        message: 'Failed to clear chat',
        details: error.message 
      });
    }
  });

  // Export for internal use
  socket.sendSystemMessage = sendSystemMessage;
};

export default chatHandlers;