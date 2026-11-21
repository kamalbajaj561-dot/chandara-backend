import { AuthService } from '../auth.service';
import { getAuth, getFirestore } from '../firebase';
import { AppError } from '../../middleware/errorHandler';
import { getRedisClient } from '../redis';
import { AccountLockoutService } from '../accountLockout.service';

jest.mock('../firebase');
jest.mock('../redis');
jest.mock('../../utils/logger');
jest.mock('../accountLockout.service');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
        createUser: jest.fn().mockResolvedValue({
          uid: 'user-id',
          email: 'test@example.com',
          displayName: 'Test User',
        }),
        generateEmailVerificationLink: jest.fn().mockResolvedValue('verification-link'),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        set: jest.fn().mockResolvedValue(undefined),
      };

      const mockRedis = {
        set: jest.fn().mockResolvedValue('OK'),
        expire: jest.fn().mockResolvedValue(1),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);
      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

      const result = await AuthService.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        role: 'viewer',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens).toBeDefined();
      expect(mockAuth.createUser).toHaveBeenCalled();
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockResolvedValue({ uid: 'existing-user' }),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(
        AuthService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockResolvedValue({
          uid: 'user-id',
          email: 'test@example.com',
        }),
      };

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          id: 'user-id',
          email: 'test@example.com',
          role: 'viewer',
          status: 'active',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      const mockRedis = {
        set: jest.fn().mockResolvedValue('OK'),
        expire: jest.fn().mockResolvedValue(1),
      };

      (AccountLockoutService.checkLockout as jest.Mock).mockResolvedValue({ locked: false });
      (AccountLockoutService.resetFailedAttempts as jest.Mock).mockResolvedValue(undefined);
      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);
      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

      const result = await AuthService.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(AccountLockoutService.checkLockout).toHaveBeenCalledWith('test@example.com');
      expect(AccountLockoutService.resetFailedAttempts).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw error for locked account', async () => {
      (AccountLockoutService.checkLockout as jest.Mock).mockResolvedValue({
        locked: true,
        timeRemaining: 900,
      });

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw error for invalid credentials', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
      };

      (AccountLockoutService.checkLockout as jest.Mock).mockResolvedValue({ locked: false });
      (AccountLockoutService.recordFailedAttempt as jest.Mock).mockResolvedValue({
        attempts: 1,
        locked: false,
      });
      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow(AppError);
      expect(AccountLockoutService.recordFailedAttempt).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw error for suspended account', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockResolvedValue({
          uid: 'user-id',
        }),
      };

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          status: 'suspended',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      (AccountLockoutService.checkLockout as jest.Mock).mockResolvedValue({ locked: false });
      (AccountLockoutService.recordFailedAttempt as jest.Mock).mockResolvedValue({
        attempts: 1,
        locked: false,
      });
      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await expect(
        AuthService.login({
          email: 'test@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-id',
        type: 'refresh',
      });
      jwt.sign = jest.fn().mockReturnValue('new-token');

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          email: 'test@example.com',
          role: 'viewer',
          status: 'active',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      const mockRedis = {
        exists: jest.fn().mockResolvedValue(1),
        del: jest.fn().mockResolvedValue(1),
        set: jest.fn().mockResolvedValue('OK'),
        expire: jest.fn().mockResolvedValue(1),
      };

      (getFirestore as jest.Mock).mockReturnValue(mockDb);
      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

      const result = await AuthService.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockRedis.exists).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should throw error for invalid refresh token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshTokens('invalid-token')).rejects.toThrow(AppError);
    });

    it('should throw error for revoked refresh token', async () => {
      const jwt = require('jsonwebtoken');
      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-id',
        type: 'refresh',
      });

      const mockRedis = {
        exists: jest.fn().mockResolvedValue(0),
      };

      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

      await expect(AuthService.refreshTokens('revoked-token')).rejects.toThrow(AppError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockAuth = {
        applyActionCode: jest.fn().mockResolvedValue({ uid: 'user-id' }),
        getUserByEmail: jest.fn().mockResolvedValue({ uid: 'user-id' }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(undefined),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      await expect(AuthService.verifyEmail('valid-code')).resolves.not.toThrow();
      expect(mockAuth.applyActionCode).toHaveBeenCalledWith('valid-code');
      expect(mockDb.update).toHaveBeenCalledWith({
        verified: true,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error for invalid code', async () => {
      const mockAuth = {
        applyActionCode: jest.fn().mockRejectedValue(new Error('Invalid code')),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(AuthService.verifyEmail('invalid-code')).rejects.toThrow(AppError);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockResolvedValue({ uid: 'user-id' }),
        generatePasswordResetLink: jest.fn().mockResolvedValue('reset-link'),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(AuthService.sendPasswordResetEmail('test@example.com')).resolves.not.toThrow();
      expect(mockAuth.generatePasswordResetLink).toHaveBeenCalled();
    });

    it('should not reveal user existence for non-existent email', async () => {
      const mockAuth = {
        getUserByEmail: jest.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(AuthService.sendPasswordResetEmail('nonexistent@example.com')).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockAuth = {
        confirmPasswordReset: jest.fn().mockResolvedValue(undefined),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(AuthService.resetPassword('code', 'NewPassword123!')).resolves.not.toThrow();
      expect(mockAuth.confirmPasswordReset).toHaveBeenCalledWith('code', 'NewPassword123!');
    });

    it('should throw error for invalid reset code', async () => {
      const mockAuth = {
        confirmPasswordReset: jest.fn().mockRejectedValue(new Error('Invalid code')),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await expect(AuthService.resetPassword('invalid-code', 'NewPassword123!')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully with refresh token', async () => {
      const mockRedis = {
        del: jest.fn().mockResolvedValue(1),
      };

      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

      await expect(AuthService.logout('user-id', 'refresh-token')).resolves.not.toThrow();
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should logout successfully without refresh token (revoke all)', async () => {
      const mockRedis = {
        keys: jest.fn().mockResolvedValue(['key1', 'key2']),
        del: jest.fn().mockResolvedValue(2),
      };

      (getRedisClient as jest.Mock).mockReturnValue(mockRedis);

      await expect(AuthService.logout('user-id')).resolves.not.toThrow();
      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should get user by id successfully', async () => {
      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          id: 'user-id',
          email: 'test@example.com',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await AuthService.getUserById('user-id');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent user', async () => {
      const mockUserDoc = {
        exists: false,
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      const result = await AuthService.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
