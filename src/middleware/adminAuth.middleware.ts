import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/user.repository';
import logger from '../utils/logger';

/**
 * Admin Authorization Middleware
 * Ensures the requesting user has administrator role
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await UserRepository.findById(userId);
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.role !== 'administrator') {
      logger.warn(`Non-admin user ${userId} attempted to access admin endpoint`);
      res.status(403).json({ error: 'Forbidden: Administrator access required' });
      return;
    }

    // User is admin, proceed
    next();
  } catch (error) {
    logger.error('Error in admin authorization:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Optional Admin Middleware
 * Checks if user is admin but doesn't block if not
 * Adds isAdmin flag to request for downstream use
 */
export async function optionalAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      (req as any).isAdmin = false;
      next();
      return;
    }

    const user = await UserRepository.findById(userId);
    
    if (!user) {
      (req as any).isAdmin = false;
      next();
      return;
    }

    (req as any).isAdmin = user.role === 'administrator';
    next();
  } catch (error) {
    logger.error('Error in optional admin check:', error);
    (req as any).isAdmin = false;
    next();
  }
}
