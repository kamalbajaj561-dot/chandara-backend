import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../services/redis';
import { AppError } from './errorHandler';
import logger from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'rate_limit',
  skipSuccessfulRequests: false,
};

export const createRateLimiter = (options: Partial<RateLimitOptions> = {}) => {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      const key = `${opts.keyPrefix}:${req.ip}`;
      const current = await redis.incr(key);

      if (current === 1) {
        // Set expiration on first request
        await redis.expire(key, Math.ceil(opts.windowMs / 1000));
      }

      if (current > opts.maxRequests) {
        const ttl = await redis.ttl(key);
        throw new AppError(
          `Too many requests. Please try again in ${ttl} seconds.`,
          429
        );
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', opts.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (opts.maxRequests - current).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + opts.windowMs).toISOString());

      next();
    } catch (error) {
      if (error instanceof AppError) {
        // Async middleware must not throw under Express 4; forward to the error handler.
        return next(error);
      }
      logger.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
};

// Pre-configured rate limiters for different auth endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'auth_rate_limit',
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyPrefix: 'login_rate_limit',
});

export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyPrefix: 'register_rate_limit',
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyPrefix: 'password_reset_rate_limit',
});
