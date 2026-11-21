import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import config from '../config';
import logger from '../utils/logger';

let io: SocketIOServer;

// Connection rate limiting map
const connectionAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_CONNECTIONS_PER_MINUTE = 10;
const CONNECTION_WINDOW_MS = 60000;

// Room size limits
const MAX_USERS_PER_ROOM = 1000;
const roomSizes = new Map<string, number>();

// Reserved for future message rate limiting implementation
// const messageRates = new Map<string, { count: number; resetTime: number }>();
// const MAX_MESSAGES_PER_SECOND = 10;
// const MESSAGE_WINDOW_MS = 1000;

export function initializeSocket(server: HTTPServer): void {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.socket.corsOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowUpgrades: true,
  });

  io.on('connection', (socket: any) => {
    const clientIp = socket.handshake.address;

    // Check connection rate limit
    const now = Date.now();
    const attempts = connectionAttempts.get(clientIp);
    if (attempts && attempts.count >= MAX_CONNECTIONS_PER_MINUTE && now < attempts.resetTime) {
      logger.warn(`Connection rate limit exceeded for ${clientIp}`);
      socket.disconnect(true);
      return;
    }

    // Update connection attempts
    if (attempts && now >= attempts.resetTime) {
      connectionAttempts.set(clientIp, { count: 1, resetTime: now + CONNECTION_WINDOW_MS });
    } else if (attempts) {
      attempts.count++;
    } else {
      connectionAttempts.set(clientIp, { count: 1, resetTime: now + CONNECTION_WINDOW_MS });
    }

    logger.info(`Client connected: ${socket.id}`);

    // Chat room events
    socket.on('join-room', (data: { eventId: string; userId: string; userName: string }) => {
      const room = `chat:${data.eventId}`;

      // Check room size limit
      const currentSize = roomSizes.get(room) || 0;
      if (currentSize >= MAX_USERS_PER_ROOM) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      socket.join(room);
      roomSizes.set(room, currentSize + 1);
      socket.data.eventId = data.eventId;
      socket.data.userId = data.userId;
      socket.data.userName = data.userName;
      logger.info(`Socket ${socket.id} joined chat room ${room} (size: ${currentSize + 1})`);

      // Notify others in the room
      socket.to(room).emit('user-joined', {
        userId: data.userId,
        userName: data.userName,
      });
    });

    socket.on('leave-room', (data: { eventId: string }) => {
      const room = `chat:${data.eventId}`;
      socket.leave(room);
      
      // Decrement room size
      const currentSize = roomSizes.get(room) || 0;
      if (currentSize > 0) {
        roomSizes.set(room, currentSize - 1);
      }
      
      logger.info(`Socket ${socket.id} left chat room ${room} (size: ${Math.max(0, currentSize - 1)})`);

      // Notify others in the room
      socket.to(room).emit('user-left', {
        userId: socket.data.userId,
        userName: socket.data.userName,
      });
    });

    // Chat message events
    socket.on('chat-message', (data: { eventId: string; message: any }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('new-message', data.message);
      logger.info(`Chat message sent to room ${room}`);
    });

    socket.on('message-edited', (data: { eventId: string; message: any }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('message-updated', data.message);
      logger.info(`Message edited in room ${room}`);
    });

    socket.on('message-deleted', (data: { eventId: string; messageId: string }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('message-removed', { messageId: data.messageId });
      logger.info(`Message deleted in room ${room}`);
    });

    // Reaction events
    socket.on('reaction-added', (data: { eventId: string; messageId: string; reaction: any }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('new-reaction', {
        messageId: data.messageId,
        reaction: data.reaction,
      });
      logger.info(`Reaction added to message in room ${room}`);
    });

    socket.on('reaction-removed', (data: { eventId: string; messageId: string; emoji: string; userId: string }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('reaction-removed', {
        messageId: data.messageId,
        emoji: data.emoji,
        userId: data.userId,
      });
      logger.info(`Reaction removed from message in room ${room}`);
    });

    // Typing events
    socket.on('typing-start', (data: { eventId: string; userId: string; userName: string }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('user-typing', {
        userId: data.userId,
        userName: data.userName,
      });
    });

    socket.on('typing-stop', (data: { eventId: string; userId: string }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('user-stopped-typing', {
        userId: data.userId,
      });
    });

    // Moderation events
    socket.on('message-pinned', (data: { eventId: string; messageId: string; pinned: boolean }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('message-pin-changed', {
        messageId: data.messageId,
        pinned: data.pinned,
      });
      logger.info(`Message pin status changed in room ${room}`);
    });

    socket.on('user-muted', (data: { eventId: string; userId: string; userName: string; muted: boolean }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('user-mute-changed', {
        userId: data.userId,
        userName: data.userName,
        muted: data.muted,
      });
      logger.info(`User mute status changed in room ${room}`);
    });

    socket.on('user-banned', (data: { eventId: string; userId: string; userName: string; banned: boolean }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('user-ban-changed', {
        userId: data.userId,
        userName: data.userName,
        banned: data.banned,
      });
      logger.info(`User ban status changed in room ${room}`);
    });

    socket.on('user-timeout', (data: { eventId: string; userId: string; userName: string; duration: number }) => {
      const room = `chat:${data.eventId}`;
      socket.to(room).emit('user-timed-out', {
        userId: data.userId,
        userName: data.userName,
        duration: data.duration,
      });
      logger.info(`User timed out in room ${room}`);
    });

    // System message events
    socket.on('system-message', (data: { eventId: string; message: any }) => {
      const room = `chat:${data.eventId}`;
      io.to(room).emit('system-message', data.message);
      logger.info(`System message sent to room ${room}`);
    });

    socket.on('disconnect', () => {
      const room = socket.data.eventId ? `chat:${socket.data.eventId}` : null;
      if (room) {
        // Decrement room size on disconnect
        const currentSize = roomSizes.get(room) || 0;
        if (currentSize > 0) {
          roomSizes.set(room, currentSize - 1);
        }
        
        socket.to(room).emit('user-left', {
          userId: socket.data.userId,
          userName: socket.data.userName,
        });
      }
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io initialized');
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function broadcastToRoom(roomId: string, event: string, data: any): void {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  io.to(roomId).emit(event, data);
}

export function broadcastToAll(event: string, data: any): void {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  io.emit(event, data);
}

export function broadcastToChatRoom(eventId: string, event: string, data: any): void {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  const room = `chat:${eventId}`;
  io.to(room).emit(event, data);
}
