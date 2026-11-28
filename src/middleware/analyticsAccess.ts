import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { eventService } from '../services/event.service';
import { getEventOwnerId } from '../utils/eventOwner';

const isAdmin = (req: Request) => (req.user as any)?.role === 'administrator';
const uid = (req: Request): string | undefined => (req.user as any)?.id || (req.user as any)?.userId;

/** Creator analytics: the creator themself or an administrator. Must run after authMiddleware. */
export const requireCreatorOrAdmin =
  (param = 'id') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (isAdmin(req) || (uid(req) && uid(req) === req.params[param])) return next();
    return next(new AppError('You can only view your own analytics', 403));
  };

/**
 * Event analytics: the event's owner or an administrator. Unknown events look the same as forbidden ones
 * for non-admins so event ids cannot be probed. Must run after authMiddleware.
 */
export const requireEventOwnerOrAdmin =
  (param = 'id', getEvent: (id: string) => Promise<any> = (id) => eventService.getEvent(id, { id: '', isAdmin: true })) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new AppError('Authentication required', 401));
      if (isAdmin(req)) return next();
      let event: any = null;
      try {
        event = await getEvent(req.params[param]);
      } catch {
        event = null;
      }
      if (event && uid(req) && getEventOwnerId(event) === uid(req)) return next();
      return next(new AppError('You can only view analytics for your own events', 403));
    } catch (err) {
      next(err);
    }
  };
