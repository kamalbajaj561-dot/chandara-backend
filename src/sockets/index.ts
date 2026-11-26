import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import config from '../config';
import logger from '../utils/logger';
import { authenticateSocket, joinChatRoom, leaveChatRoom, relayTyping, JoinResult } from './chatSocket';

let io: SocketIOServer;

// Connection rate limiting map
const connectionAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_CONNECTIONS_PER_MINUTE = 10;
const CONNECTION_WINDOW_MS = 60000;


// Reserved for future message rate limiting implementation
// const messageRates = new Map<string, { count: number; resetTime: number }>();
// const MAX_MESSAGES_PER_SECOND = 10;
// const MESSAGE_WINDOW_MS = 1000;

export function initializeSocket(server: HTTPServer): void {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.socket.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowUpgrades: true,
  });

  io.use(authenticateSocket());

  const roomSize = (room: string): number => io.sockets.adapter.rooms.get(room)?.size || 0;

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

    // NOTE: chat messages, deletions, reactions, pins and moderation events are emitted ONLY by the server
    // (controllers, after authorization and persistence). Clients may join/leave rooms and send typing hints.
    socket.on('join-room', async (data: unknown, ack?: (r: JoinResult) => void) => {
      const result = await joinChatRoom(socket, data, roomSize);
      if (!result.ok) socket.emit('error', { message: result.error });
      if (typeof ack === 'function') ack(result);
    });

    socket.on('leave-room', (data: unknown) => leaveChatRoom(socket, data));
    socket.on('typing-start', (data: unknown) => { relayTyping(socket, data, true); });
    socket.on('typing-stop', (data: unknown) => { relayTyping(socket, data, false); });

    socket.on('disconnect', () => {
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
