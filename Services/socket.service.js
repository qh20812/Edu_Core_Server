const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../Models/user.model');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.userSockets = new Map();    // socketId -> userId
    this.rooms = new Map();          // roomId -> Set of socketIds
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ Socket.IO server initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password_hash');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.userRole = user.role;
        socket.tenantId = user.tenant?.toString();
        socket.userData = user;

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      this.handleDisconnection(socket);
      this.handleRoomOperations(socket);
      this.handleMessaging(socket);
      this.handleNotifications(socket);
    });
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    console.log(`👤 User ${socket.userData.name} connected [${socket.id}]`);

    // Store user connection
    this.connectedUsers.set(socket.userId, socket.id);
    this.userSockets.set(socket.id, socket.userId);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Join tenant room if applicable
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Emit user online status
    this.broadcastUserStatus(socket.userId, 'online');

    // Send initial data
    socket.emit('connected', {
      message: 'Connected successfully',
      userId: socket.userId,
      rooms: Array.from(socket.rooms)
    });
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket) {
    socket.on('disconnect', (reason) => {
      console.log(`👋 User ${socket.userData.name} disconnected: ${reason}`);

      // Remove from tracking
      this.connectedUsers.delete(socket.userId);
      this.userSockets.delete(socket.id);

      // Remove from custom rooms
      for (const [roomId, socketIds] of this.rooms.entries()) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          this.rooms.delete(roomId);
        }
      }

      // Broadcast user offline status
      this.broadcastUserStatus(socket.userId, 'offline');
    });
  }

  /**
   * Handle room operations (join/leave)
   */
  handleRoomOperations(socket) {
    // Join custom room
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(socket.id);
      
      socket.emit('room-joined', { roomId });
      socket.to(roomId).emit('user-joined-room', {
        userId: socket.userId,
        userName: socket.userData.name,
        roomId
      });
    });

    // Leave custom room
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
      
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(socket.id);
      }
      
      socket.emit('room-left', { roomId });
      socket.to(roomId).emit('user-left-room', {
        userId: socket.userId,
        userName: socket.userData.name,
        roomId
      });
    });
  }

  /**
   * Handle messaging
   */
  handleMessaging(socket) {
    // Private message
    socket.on('private-message', ({ recipientId, message, type = 'text' }) => {
      const recipientSocketId = this.connectedUsers.get(recipientId);
      
      const messageData = {
        senderId: socket.userId,
        senderName: socket.userData.name,
        message,
        type,
        timestamp: new Date().toISOString()
      };

      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('private-message', messageData);
        socket.emit('message-sent', { recipientId, ...messageData });
      } else {
        socket.emit('message-failed', { 
          recipientId, 
          error: 'User not online' 
        });
      }
    });

    // Room message
    socket.on('room-message', ({ roomId, message, type = 'text' }) => {
      const messageData = {
        senderId: socket.userId,
        senderName: socket.userData.name,
        message,
        type,
        roomId,
        timestamp: new Date().toISOString()
      };

      socket.to(roomId).emit('room-message', messageData);
      socket.emit('message-sent', messageData);
    });
  }

  /**
   * Handle notifications
   */
  handleNotifications(socket) {
    socket.on('mark-notification-read', ({ notificationId }) => {
      // Handle notification read status
      socket.emit('notification-marked-read', { notificationId });
    });
  }

  /**
   * Broadcast user status to relevant users
   */
  broadcastUserStatus(userId, status) {
    this.io.emit('user-status-changed', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send notification to specific user
   * @param {string} userId - Target user ID
   * @param {Object} notification - Notification data
   */
  sendNotificationToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  /**
   * Send notification to all users in a tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} notification - Notification data
   */
  sendNotificationToTenant(tenantId, notification) {
    this.io.to(`tenant:${tenantId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send notification to users with specific role
   * @param {string} role - User role
   * @param {Object} notification - Notification data
   */
  sendNotificationToRole(role, notification) {
    this.io.to(`role:${role}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send real-time update to room
   * @param {string} roomId - Room ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  sendToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get online users count
   * @returns {number} - Number of connected users
   */
  getOnlineUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get online users in tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Array} - Array of online user IDs
   */
  getOnlineUsersInTenant(tenantId) {
    const room = this.io.sockets.adapter.rooms.get(`tenant:${tenantId}`);
    if (!room) return [];

    const userIds = [];
    for (const socketId of room) {
      const userId = this.userSockets.get(socketId);
      if (userId) userIds.push(userId);
    }
    return userIds;
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} - Online status
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Broadcast system announcement
   * @param {Object} announcement - Announcement data
   */
  broadcastSystemAnnouncement(announcement) {
    this.io.emit('system-announcement', {
      ...announcement,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send real-time data update
   * @param {string} type - Update type (e.g., 'assignment_created', 'user_updated')
   * @param {Object} data - Update data
   * @param {string} tenantId - Optional tenant ID to limit scope
   */
  sendDataUpdate(type, data, tenantId = null) {
    const event = 'data-update';
    const updateData = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    if (tenantId) {
      this.io.to(`tenant:${tenantId}`).emit(event, updateData);
    } else {
      this.io.emit(event, updateData);
    }
  }

  /**
   * Get server statistics
   * @returns {Object} - Server stats
   */
  getStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.rooms.size,
      totalSockets: this.io.engine.clientsCount,
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
module.exports = new SocketService();
