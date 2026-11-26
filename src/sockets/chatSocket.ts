import { eventService } from '../services/event.service';
import { ticketRepository } from '../repositories/ticket.repository';
import { assertCanViewEvent, LiveKitAccessDeps } from '../services/livekitAccess';
import { verifyUserFromToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export interface SocketUser {
  userId: string;
  role: string;
  displayName?: string;
}

export interface ChatSocketDeps extends LiveKitAccessDeps {
  verifyToken: (token: string) => Promise<SocketUser>;
}

export const defaultChatSocketDeps: ChatSocketDeps = {
  verifyToken: (t) => verifyUserFromToken(t) as Promise<SocketUser>,
  getEvent: (id) => eventService.getEvent(id),
  findUserTickets: (userId) => ticketRepository.findByUserId(userId, 100, 0),
};

export const MAX_USERS_PER_ROOM = 1000;
const TYPING_MIN_INTERVAL_MS = 1000;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const chatRoomName = (eventId: string): string => `chat:${eventId}`;

/** Socket.IO middleware: only connections with a valid Firebase ID token of an active account are accepted. */
export const authenticateSocket =
  (deps: ChatSocketDeps = defaultChatSocketDeps) =>
  async (socket: any, next: (err?: Error) => void): Promise<void> => {
    try {
      const token = socket.handshake?.auth?.token;
      if (typeof token !== 'string' || token.length === 0) throw new AppError('Authentication required', 401);
      const user = await deps.verifyToken(token);
      socket.data.user = { userId: user.userId, role: user.role, displayName: user.displayName };
      next();
    } catch (err) {
      next(new Error(err instanceof AppError ? err.message : 'Authentication failed'));
    }
  };

export interface JoinResult {
  ok: boolean;
  error?: string;
}

/**
 * Join a chat room after the SAME authorization the REST API applies (public event, paid -> ticket).
 * Identity always comes from the verified token, never from the client payload.
 */
export async function joinChatRoom(
  socket: any,
  payload: unknown,
  getRoomSize: (room: string) => number,
  deps: ChatSocketDeps = defaultChatSocketDeps
): Promise<JoinResult> {
  const eventId = (payload as any)?.eventId;
  if (typeof eventId !== 'string' || !EVENT_ID_PATTERN.test(eventId)) return { ok: false, error: 'Invalid event' };
  const user: SocketUser | undefined = socket.data?.user;
  if (!user) return { ok: false, error: 'Authentication required' };

  try {
    const event = await deps.getEvent(eventId);
    await assertCanViewEvent({ userId: user.userId, role: user.role }, event, deps);
  } catch (err) {
    return { ok: false, error: err instanceof AppError ? err.message : 'Could not join chat' };
  }

  const room = chatRoomName(eventId);
  if (!socket.rooms.has(room) && getRoomSize(room) >= MAX_USERS_PER_ROOM) return { ok: false, error: 'Room is full' };

  // One chat room per socket.
  for (const r of Array.from(socket.rooms as Set<string>)) {
    if (r.startsWith('chat:') && r !== room) socket.leave(r);
  }
  socket.join(room);
  socket.data.eventId = eventId;
  return { ok: true };
}

export function leaveChatRoom(socket: any, payload: unknown): void {
  const eventId = (payload as any)?.eventId;
  if (typeof eventId !== 'string' || !EVENT_ID_PATTERN.test(eventId)) return;
  socket.leave(chatRoomName(eventId));
  if (socket.data.eventId === eventId) socket.data.eventId = undefined;
}

/** Typing indicators: only for rooms the socket really joined, identity from the token, throttled. */
export function relayTyping(socket: any, payload: unknown, typing: boolean, now: number = Date.now()): boolean {
  const eventId = (payload as any)?.eventId;
  const user: SocketUser | undefined = socket.data?.user;
  if (!user || typeof eventId !== 'string') return false;
  const room = chatRoomName(eventId);
  if (!socket.rooms.has(room)) return false;
  if (typing) {
    if (now - (socket.data.lastTypingAt || 0) < TYPING_MIN_INTERVAL_MS) return false;
    socket.data.lastTypingAt = now;
  }
  socket.to(room).emit(typing ? 'user-typing' : 'user-stopped-typing', {
    userId: user.userId,
    userName: user.displayName || 'Viewer',
  });
  return true;
}
