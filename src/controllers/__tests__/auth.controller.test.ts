import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../services/auth.service';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../services/auth.service');

describe('AuthController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { body: {}, user: { userId: 'test-user-id', email: 'test@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 } };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (AuthService.register as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
      };

      await AuthController.register(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
        message: 'Registration successful. Please check your email to verify your account.',
      });
    });

    it('should handle registration errors', async () => {
      const error = new AppError('User already exists', 409);
      (AuthService.register as jest.Mock).mockRejectedValue(error);

      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
      };

      await AuthController.register(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      (AuthService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      await AuthController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
        message: 'Login successful',
      });
    });

    it('should handle login errors', async () => {
      const error = new AppError('Invalid credentials', 401);
      (AuthService.login as jest.Mock).mockRejectedValue(error);

      mockReq.body = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      await AuthController.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('logout', () => {
    it('should logout a user successfully', async () => {
      mockReq.body = { refreshToken: 'test-refresh-token' };
      (AuthService.logout as jest.Mock).mockResolvedValue(undefined);

      await AuthController.logout(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.logout).toHaveBeenCalledWith('test-user-id', 'test-refresh-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful',
      });
    });

    it('should handle missing user', async () => {
      mockReq.user = undefined;

      await AuthController.logout(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (AuthService.refreshTokens as jest.Mock).mockResolvedValue(mockTokens);

      mockReq.body = {
        refreshToken: 'old-refresh-token',
      };

      await AuthController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTokens,
        message: 'Token refreshed successfully',
      });
    });

    it('should handle refresh token errors', async () => {
      const error = new AppError('Invalid refresh token', 401);
      (AuthService.refreshTokens as jest.Mock).mockRejectedValue(error);

      mockReq.body = {
        refreshToken: 'invalid-token',
      };

      await AuthController.refreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      (AuthService.verifyEmail as jest.Mock).mockResolvedValue(undefined);

      mockReq.body = {
        oobCode: 'verification-code',
      };

      await AuthController.verifyEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.verifyEmail).toHaveBeenCalledWith('verification-code');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully',
      });
    });

    it('should handle verification errors', async () => {
      const error = new AppError('Invalid verification code', 400);
      (AuthService.verifyEmail as jest.Mock).mockRejectedValue(error);

      mockReq.body = {
        oobCode: 'invalid-code',
      };

      await AuthController.verifyEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      (AuthService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      mockReq.body = {
        email: 'test@example.com',
      };

      await AuthController.sendPasswordResetEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully',
      });
    });

    it('should handle send password reset email errors', async () => {
      const error = new AppError('Failed to send email', 500);
      (AuthService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(error);

      mockReq.body = {
        email: 'test@example.com',
      };

      await AuthController.sendPasswordResetEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      (AuthService.resetPassword as jest.Mock).mockResolvedValue(undefined);

      mockReq.body = {
        oobCode: 'reset-code',
        newPassword: 'NewPassword123!',
      };

      await AuthController.resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.resetPassword).toHaveBeenCalledWith('reset-code', 'NewPassword123!');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });

    it('should handle reset password errors', async () => {
      const error = new AppError('Invalid reset code', 400);
      (AuthService.resetPassword as jest.Mock).mockRejectedValue(error);

      mockReq.body = {
        oobCode: 'invalid-code',
        newPassword: 'NewPassword123!',
      };

      await AuthController.resetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getMe', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashed-password',
      };

      (AuthService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      await AuthController.getMe(mockReq as Request, mockRes as Response, mockNext);

      expect(AuthService.getUserById).toHaveBeenCalledWith('test-user-id');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'user-id',
          email: 'test@example.com',
        }),
      });
    });

    it('should handle user not found', async () => {
      (AuthService.getUserById as jest.Mock).mockResolvedValue(null);

      await AuthController.getMe(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
      });
    });

    it('should handle missing user', async () => {
      mockReq.user = undefined;

      await AuthController.getMe(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
