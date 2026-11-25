import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../services/firebase';
import { getFirestore } from '../services/firebase';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

interface JwtPayload {
  userId: string;
  /** Alias of userId; several controllers read req.user.id. */
  id?: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// The frontend/Firestore store 'user' | 'streamer' | 'admin'; backend route guards use
// 'viewer' | 'creator' | 'administrator'. Normalize so both vocabularies work.
const ROLE_ALIASES: Record<string, string> = {
  user: 'viewer',
  streamer: 'creator',
  admin: 'administrator',
};
export const normalizeRole = (role: unknown): string => {
  const r = typeof role === 'string' ? role : 'viewer';
  return ROLE_ALIASES[r] || r;
};

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip authentication for OPTIONS preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);

    // Verify Firebase ID token using Firebase Admin SDK
    const auth = getAuth();
    if (!auth) {
      throw new AppError('Firebase not initialized', 500);
    }
    const decodedToken = await auth!.verifyIdToken(token);

    // Get user from Firestore to get role and status
    const db = getFirestore();
    if (!db) {
      throw new AppError('Firestore not initialized', 500);
    }
    const userDoc = await db!.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      throw new AppError('User not found', 404);
    }

    const userData = userDoc.data();

    // Check if user is active
    if (userData?.status === 'suspended') {
      throw new AppError('Account suspended', 403);
    }
    if (userData?.status === 'banned') {
      throw new AppError('Account banned', 403);
    }

    // Attach user info to request
    req.user = {
      userId: decodedToken.uid,
      id: decodedToken.uid,
      email: decodedToken.email || '',
      role: normalizeRole(userData?.role),
      type: 'access',
      iat: decodedToken.iat || 0,
      exp: decodedToken.exp || 0,
    };

    next();
  } catch (error) {
    // Express 4 does not catch rejections from async middleware: an uncaught throw here
    // would be an unhandledRejection (server shutdown). Always hand the error to next().
    if (error instanceof AppError) {
      if (error.statusCode >= 500) logger.error('Auth middleware error:', error);
      return next(error);
    }
    logger.warn('Auth middleware rejected request: invalid token');
    return next(new AppError('Invalid token', 401));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Verify Firebase ID token using Firebase Admin SDK
      const auth = getAuth();
      if (!auth) {
        return next();
      }
      const decodedToken = await auth.verifyIdToken(token);

      // Get user from Firestore to get role and status
      const db = getFirestore();
      if (!db) {
        return next();
      }
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();

      if (userDoc.exists) {
        const userData = userDoc.data();

        // Check if user is active
        if (userData?.status !== 'suspended' && userData?.status !== 'banned') {
          req.user = {
            userId: decodedToken.uid,
      id: decodedToken.uid,
            email: decodedToken.email || '',
            role: normalizeRole(userData?.role),
            type: 'access',
            iat: decodedToken.iat || 0,
            exp: decodedToken.exp || 0,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};
