import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('connected', (data) => {
      console.log('🎉 Socket authenticated:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Room Events
  createRoom(roomData) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('room:create', roomData);
      
      this.socket.once('room:created', (data) => {
        resolve(data);
      });

      this.socket.once('error', (error) => {
        reject(new Error(error.message));
      });
    });
  }

  joinRoom(roomId, password = '') {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('room:join', { roomId, password });
      
      this.socket.once('room:joined', (data) => {
        resolve(data);
      });

      this.socket.once('error', (error) => {
        reject(new Error(error.message));
      });
    });
  }

  leaveRoom(roomId) {
    if (this.socket) {
      this.socket.emit('room:leave', { roomId });
    }
  }

  toggleReady(roomId) {
    if (this.socket) {
      this.socket.emit('room:toggle-ready', { roomId });
    }
  }

  getRoomList(filters = {}) {
    if (this.socket) {
      this.socket.emit('room:list', { filters });
    }
  }

  // Battle Events
  submitCode(roomId, code, language) {
    if (this.socket) {
      this.socket.emit('battle:submit', { roomId, code, language });
    }
  }

  getBattleStatus(roomId) {
    if (this.socket) {
      this.socket.emit('battle:status', { roomId });
    }
  }

  spectateRoom(roomId) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('battle:spectate', { roomId });
      
      this.socket.once('battle:spectating', (data) => {
        resolve(data);
      });

      this.socket.once('error', (error) => {
        reject(new Error(error.message));
      });
    });
  }

  // Chat Events
  sendMessage(roomId, message) {
    if (this.socket) {
      this.socket.emit('chat:message', { roomId, message });
    }
  }

  getChatHistory(roomId, limit = 50) {
    if (this.socket) {
      this.socket.emit('chat:history', { roomId, limit });
    }
  }

  startTyping(roomId) {
    if (this.socket) {
      this.socket.emit('chat:typing', { roomId, isTyping: true });
    }
  }

  stopTyping(roomId) {
    if (this.socket) {
      this.socket.emit('chat:typing', { roomId, isTyping: false });
    }
  }

  // Code Events
  updateCode(roomId, code, language) {
    if (this.socket) {
      this.socket.emit('code:update', { roomId, code, language });
    }
  }

  // Event Listeners
  onRoomUpdate(callback) {
    if (this.socket) {
      this.socket.on('room:updated', callback);
    }
  }

  onUserJoined(callback) {
    if (this.socket) {
      this.socket.on('room:user-joined', callback);
    }
  }

  onUserLeft(callback) {
    if (this.socket) {
      this.socket.on('room:user-left', callback);
    }
  }

  onReadyChanged(callback) {
    if (this.socket) {
      this.socket.on('room:ready-changed', callback);
    }
  }

  onAllReady(callback) {
    if (this.socket) {
      this.socket.on('room:all-ready', callback);
    }
  }

  onBattleStart(callback) {
    if (this.socket) {
      this.socket.on('battle:start', callback);
    }
  }

  onBattleEnd(callback) {
    if (this.socket) {
      this.socket.on('battle:ended', callback);
    }
  }

  onSubmissionResult(callback) {
    if (this.socket) {
      this.socket.on('submission:result', callback);
    }
  }

  onChatMessage(callback) {
    if (this.socket) {
      this.socket.on('chat:message', callback);
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on('chat:typing', callback);
    }
  }

  onCodeUpdate(callback) {
    if (this.socket) {
      this.socket.on('code:update', callback);
    }
  }

  // Remove specific event listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
  }

  // Get socket instance for custom events
  getSocket() {
    return this.socket;
  }

  // Check connection status
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;