import { eventService } from './event.service';
import { ticketRepository } from '../repositories/ticket.repository';
import { AppError } from '../middleware/errorHandler';
import { Event, TicketingTicket } from '../types';

export type LiveKitRole = 'publisher' | 'subscriber' | 'moderator';

export interface LiveKitAccessUser {
  userId: string;
  role: string;
}

export interface LiveKitAccessDeps {
  getEvent: (id: string) => Promise<Event>;
  findUserTickets: (userId: string) => Promise<TicketingTicket[]>;
}

const defaultDeps: LiveKitAccessDeps = {
  getEvent: (id) => eventService.getEvent(id),
  findUserTickets: (userId) => ticketRepository.findByUserId(userId, 100, 0),
};

const ROOM_NAME_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** Event id candidates for a room name: the raw name, or the id inside `[chandara-]event-<id>-<stream>`. */
export function eventIdCandidates(roomName: string): string[] {
  const candidates = [roomName];
  const match = /^(?:chandara-)?event-([A-Za-z0-9]+)-/.exec(roomName);
  if (match) candidates.unshift(match[1]);
  return candidates;
}

async function resolveEvent(roomName: string, deps: LiveKitAccessDeps): Promise<Event | null> {
  for (const id of eventIdCandidates(roomName)) {
    try {
      return await deps.getEvent(id);
    } catch (err) {
      if (!(err instanceof AppError && err.statusCode === 404)) throw err;
    }
  }
  return null;
}

/**
 * Server-side authorization for LiveKit tokens. The client only suggests a role;
 * what it is actually allowed to do is decided here from the verified user.
 *  - admin: any room/role.
 *  - publisher / moderator: only the event's creator.
 *  - subscriber: anyone for free, live/scheduled events; paid events need a valid ticket.
 */
export async function authorizeLiveKitAccess(
  user: LiveKitAccessUser,
  roomName: string,
  role: LiveKitRole,
  deps: LiveKitAccessDeps = defaultDeps
): Promise<void> {
  if (typeof roomName !== 'string' || !ROOM_NAME_PATTERN.test(roomName)) {
    throw new AppError('Invalid room name', 400);
  }
  if (user.role === 'administrator' || user.role === 'admin') return;

  const event = await resolveEvent(roomName, deps);
  if (!event) throw new AppError('Event not found', 404);

  const isOwner = event.creatorUid === user.userId;

  if (role === 'publisher' || role === 'moderator') {
    if (!isOwner) throw new AppError('Only the event creator can publish or moderate this stream', 403);
    return;
  }

  if (isOwner) return;
  if (event.status === 'draft' || event.status === 'cancelled') {
    throw new AppError('This event is not available', 403);
  }
  if (event.ticketPrice > 0) {
    const tickets = await deps.findUserTickets(user.userId);
    const hasTicket = tickets.some(
      (t) => t.eventId === event.id && (t.status === 'active' || t.status === 'used')
    );
    if (!hasTicket) throw new AppError('A valid ticket is required to watch this event', 403);
  }
}
