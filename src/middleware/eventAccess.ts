import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';
import { assertCanViewEvent, LiveKitAccessDeps } from '../services/livekitAccess';

/**
 * Express guard for routes under /:eventId that expose event content (chat).
 * Free public events stay open; paid events require a signed-in user with a valid ticket (or the owner/admin).
 * Must run after authMiddleware (required) or optionalAuth (read-only routes).
 */
export const requireEventAccess =
  (deps?: LiveKitAccessDeps & { getEvent?: LiveKitAccessDeps['getEvent'] }) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params;
      const getEvent = deps?.getEvent ?? ((id: string) => eventService.getEvent(id));
      const event = await getEvent(eventId);
      const u: any = req.user;
      const user = u ? { userId: u.userId, role: u.role } : undefined;
      await assertCanViewEvent(user, event, deps);
      next();
    } catch (err) {
      next(err);
    }
  };
