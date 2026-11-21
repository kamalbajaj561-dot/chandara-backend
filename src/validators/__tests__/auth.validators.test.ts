import { Request, Response, NextFunction } from 'express';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateResetPassword,
  validateConfirmResetPassword,
  validateVerifyEmail,
} from '../auth.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Auth Validators', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('validateRegister', () => {
    it('should pass validation with valid data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
      };

      validateRegister(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid email', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'Password123!',
        displayName: 'Test User',
      };

      expect(() => validateRegister(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });

    it('should fail with weak password', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'weak',
        displayName: 'Test User',
      };

      expect(() => validateRegister(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });

    it('should fail with short display name', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'T',
      };

      expect(() => validateRegister(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });

    it('should fail with invalid role', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        role: 'invalid',
      };

      expect(() => validateRegister(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });
  });

  describe('validateLogin', () => {
    it('should pass validation with valid data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      validateLogin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with missing email', () => {
      mockReq.body = {
        password: 'Password123!',
      };

      expect(() => validateLogin(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });

    it('should fail with missing password', () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      expect(() => validateLogin(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should pass validation with valid token', () => {
      mockReq.body = {
        refreshToken: 'valid-refresh-token',
      };

      validateRefreshToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with missing refresh token', () => {
      mockReq.body = {};

      expect(() => validateRefreshToken(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });
  });

  describe('validateResetPassword', () => {
    it('should pass validation with valid email', () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      validateResetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid email', () => {
      mockReq.body = {
        email: 'invalid-email',
      };

      expect(() => validateResetPassword(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });
  });

  describe('validateConfirmResetPassword', () => {
    it('should pass validation with valid data', () => {
      mockReq.body = {
        oobCode: 'reset-code',
        newPassword: 'NewPassword123!',
      };

      validateConfirmResetPassword(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with missing oobCode', () => {
      mockReq.body = {
        newPassword: 'NewPassword123!',
      };

      expect(() =>
        validateConfirmResetPassword(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(AppError);
    });

    it('should fail with weak new password', () => {
      mockReq.body = {
        oobCode: 'reset-code',
        newPassword: 'weak',
      };

      expect(() =>
        validateConfirmResetPassword(mockReq as Request, mockRes as Response, mockNext)
      ).toThrow(AppError);
    });
  });

  describe('validateVerifyEmail', () => {
    it('should pass validation with valid oobCode', () => {
      mockReq.body = {
        oobCode: 'verification-code',
      };

      validateVerifyEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with missing oobCode', () => {
      mockReq.body = {};

      expect(() => validateVerifyEmail(mockReq as Request, mockRes as Response, mockNext)).toThrow(
        AppError
      );
    });
  });
});
