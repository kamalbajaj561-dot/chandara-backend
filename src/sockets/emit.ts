import { getIO } from './index';
import logger from '../utils/logger';

/**
 * Server-side broadcast to a chat room. Called by controllers AFTER an action was authorized and persisted;
 * clients can never trigger these events themselves. A missing/uninitialised socket server (tests, CLI) is not an error.
 */
export function emitToChatRoom(eventId: string | undefined, event: string, payload: unknown): void {
  if (!eventId) return;
  try {
    getIO().to(`chat:${eventId}`).emit(event, payload);
  } catch (err) {
    logger.debug(`Socket emit skipped (${event}): ${(err as Error).message}`);
  }
}

/** Remove a banned user's sockets from an event's chat room (they stop receiving messages immediately). */
export async function removeUserFromChatRoom(eventId: string | undefined, userId: string): Promise<void> {
  if (!eventId) return;
  try {
    const sockets = await getIO().in(`chat:${eventId}`).fetchSockets();
    sockets.filter((s) => s.data?.user?.userId === userId).forEach((s) => s.leave(`chat:${eventId}`));
  } catch (err) {
    logger.debug(`Socket removal skipped: ${(err as Error).message}`);
  }
}
