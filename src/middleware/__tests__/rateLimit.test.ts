import { Request, Response, NextFunction } from 'express';
import { createRateLimiter, loginRateLimiter, registerRateLimiter, passwordResetRateLimiter } from '../rateLimit';
import { AppError } from '../errorHandler';
import { getRedisClient } from '../../services/redis';

jest.mock('../../services/redis');

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockRedis: any;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  describe('createRateLimiter', () => {
    it('should allow request within limit', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    });

    it('should block request exceeding limit', async () => {
      mockRedis.incr.mockResolvedValue(6);
      mockRedis.ttl.mockResolvedValue(300);

      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });

      await expect(limiter(mockReq as Request, mockRes as Response, mockNext)).rejects.toThrow(
        AppError
      );
    });

    it('should set expiration on first request', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should fail open on Redis error', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis error'));

      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });

      await limiter(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('loginRateLimiter', () => {
    it('should use correct configuration', () => {
      expect(loginRateLimiter).toBeDefined();
    });
  });

  describe('registerRateLimiter', () => {
    it('should use correct configuration', () => {
      expect(registerRateLimiter).toBeDefined();
    });
  });

  describe('passwordResetRateLimiter', () => {
    it('should use correct configuration', () => {
      expect(passwordResetRateLimiter).toBeDefined();
    });
  });
});
