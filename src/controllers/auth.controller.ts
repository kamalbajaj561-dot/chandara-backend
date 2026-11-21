import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../types';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName, role } = req.body;

      const result = await AuthService.register({
        email,
        password,
        displayName,
        role,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
        message: 'Registration successful. Please check your email to verify your account.',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login({ email, password });

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
        message: 'Login successful',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const refreshToken = req.body.refreshToken;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      await AuthService.logout(userId, refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Logout successful',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      const tokens = await AuthService.refreshTokens(refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        message: 'Token refreshed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oobCode } = req.body;

      await AuthService.verifyEmail(oobCode);

      const response: ApiResponse = {
        success: true,
        message: 'Email verified successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async sendPasswordResetEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      await AuthService.sendPasswordResetEmail(email);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset email sent successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { oobCode, newPassword } = req.body;

      await AuthService.resetPassword(oobCode, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await AuthService.getUserById(userId);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
