import { AccountLockoutService } from '../accountLockout.service';
import { getRedisClient } from '../redis';

jest.mock('../redis');
jest.mock('../../utils/logger');

describe('AccountLockoutService', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
      ttl: jest.fn(),
      keys: jest.fn(),
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    jest.clearAllMocks();
  });

  describe('recordFailedAttempt', () => {
    it('should record failed attempt and not lock out', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await AccountLockoutService.recordFailedAttempt('test@example.com');

      expect(result.attempts).toBe(1);
      expect(result.locked).toBe(false);
      expect(mockRedis.incr).toHaveBeenCalledWith('auth:failed_attempts:test@example.com');
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should lock account after threshold attempts', async () => {
      mockRedis.incr.mockResolvedValue(5);
      mockRedis.set = jest.fn().mockResolvedValue('OK');

      const result = await AccountLockoutService.recordFailedAttempt('test@example.com');

      expect(result.attempts).toBe(5);
      expect(result.locked).toBe(true);
      expect(result.lockoutTimeRemaining).toBe(900);
      expect(mockRedis.set).toHaveBeenCalledWith('auth:lockout:test@example.com', '1');
    });

    it('should fail open on Redis error', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis error'));

      const result = await AccountLockoutService.recordFailedAttempt('test@example.com');

      expect(result.attempts).toBe(0);
      expect(result.locked).toBe(false);
    });
  });

  describe('checkLockout', () => {
    it('should return not locked when account is not locked', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await AccountLockoutService.checkLockout('test@example.com');

      expect(result.locked).toBe(false);
      expect(mockRedis.exists).toHaveBeenCalledWith('auth:lockout:test@example.com');
    });

    it('should return locked with time remaining when account is locked', async () => {
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.ttl.mockResolvedValue(300);

      const result = await AccountLockoutService.checkLockout('test@example.com');

      expect(result.locked).toBe(true);
      expect(result.timeRemaining).toBe(300);
    });

    it('should fail open on Redis error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));

      const result = await AccountLockoutService.checkLockout('test@example.com');

      expect(result.locked).toBe(false);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts', async () => {
      mockRedis.del.mockResolvedValue(1);

      await AccountLockoutService.resetFailedAttempts('test@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith('auth:failed_attempts:test@example.com');
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(AccountLockoutService.resetFailedAttempts('test@example.com')).resolves.not.toThrow();
    });
  });

  describe('resetLockout', () => {
    it('should reset lockout', async () => {
      mockRedis.del.mockResolvedValue(1);

      await AccountLockoutService.resetLockout('test@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith('auth:lockout:test@example.com');
    });

    it('should handle Redis error gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(AccountLockoutService.resetLockout('test@example.com')).resolves.not.toThrow();
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return full attempts for new user', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await AccountLockoutService.getRemainingAttempts('test@example.com');

      expect(result).toBe(5);
    });

    it('should return remaining attempts after failed attempts', async () => {
      mockRedis.get.mockResolvedValue('2');

      const result = await AccountLockoutService.getRemainingAttempts('test@example.com');

      expect(result).toBe(3);
    });

    it('should return 0 when attempts exceed threshold', async () => {
      mockRedis.get.mockResolvedValue('10');

      const result = await AccountLockoutService.getRemainingAttempts('test@example.com');

      expect(result).toBe(0);
    });

    it('should fail open on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await AccountLockoutService.getRemainingAttempts('test@example.com');

      expect(result).toBe(5);
    });
  });
});
