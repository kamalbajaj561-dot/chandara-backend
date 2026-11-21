import { getRedisClient } from './redis';
import logger from '../utils/logger';

const LOCKOUT_THRESHOLD = 5; // Number of failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
const ATTEMPT_WINDOW = 15 * 60; // 15 minutes in seconds

export class AccountLockoutService {
  static async recordFailedAttempt(identifier: string): Promise<{ attempts: number; locked: boolean; lockoutTimeRemaining?: number }> {
    try {
      const redis = getRedisClient();
      const key = `auth:failed_attempts:${identifier}`;
      
      // Increment failed attempts
      const attempts = await redis.incr(key);
      
      // Set expiration on first attempt
      if (attempts === 1) {
        await redis.expire(key, ATTEMPT_WINDOW);
      }
      
      // Check if threshold reached
      if (attempts >= LOCKOUT_THRESHOLD) {
        const lockoutKey = `auth:lockout:${identifier}`;
        await redis.set(lockoutKey, '1');
        await redis.expire(lockoutKey, LOCKOUT_DURATION);
        
        logger.warn(`Account locked for identifier: ${identifier} after ${attempts} failed attempts`);
        
        return {
          attempts,
          locked: true,
          lockoutTimeRemaining: LOCKOUT_DURATION,
        };
      }
      
      logger.info(`Failed attempt ${attempts} for identifier: ${identifier}`);
      
      return {
        attempts,
        locked: false,
      };
    } catch (error) {
      logger.error('Error recording failed attempt:', error);
      // Fail open - don't block if Redis fails
      return {
        attempts: 0,
        locked: false,
      };
    }
  }
  
  static async checkLockout(identifier: string): Promise<{ locked: boolean; timeRemaining?: number }> {
    try {
      const redis = getRedisClient();
      const lockoutKey = `auth:lockout:${identifier}`;
      
      const locked = await redis.exists(lockoutKey);
      
      if (locked) {
        const ttl = await redis.ttl(lockoutKey);
        return {
          locked: true,
          timeRemaining: ttl,
        };
      }
      
      return {
        locked: false,
      };
    } catch (error) {
      logger.error('Error checking lockout:', error);
      // Fail open - don't block if Redis fails
      return {
        locked: false,
      };
    }
  }
  
  static async resetFailedAttempts(identifier: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `auth:failed_attempts:${identifier}`;
      await redis.del(key);
      
      logger.info(`Reset failed attempts for identifier: ${identifier}`);
    } catch (error) {
      logger.error('Error resetting failed attempts:', error);
    }
  }
  
  static async resetLockout(identifier: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const lockoutKey = `auth:lockout:${identifier}`;
      await redis.del(lockoutKey);
      
      logger.info(`Reset lockout for identifier: ${identifier}`);
    } catch (error) {
      logger.error('Error resetting lockout:', error);
    }
  }
  
  static async getRemainingAttempts(identifier: string): Promise<number> {
    try {
      const redis = getRedisClient();
      const key = `auth:failed_attempts:${identifier}`;
      const attempts = await redis.get(key);
      
      if (!attempts) {
        return LOCKOUT_THRESHOLD;
      }
      
      const attemptsNum = parseInt(attempts, 10);
      return Math.max(0, LOCKOUT_THRESHOLD - attemptsNum);
    } catch (error) {
      logger.error('Error getting remaining attempts:', error);
      return LOCKOUT_THRESHOLD;
    }
  }
}
