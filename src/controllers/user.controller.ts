import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse, PaginatedResponse } from '../types';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await UserService.getProfile(userId);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await UserService.getPublicProfile(userId);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicProfileByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;

      const user = await UserService.getPublicProfileByUsername(username);

      const response: ApiResponse = {
        success: true,
        data: user,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await UserService.updateProfile(userId, req.body);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Profile updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async checkUsernameAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;

      const result = await UserService.checkUsernameAvailability(username);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, limit } = req.query;

      const users = await UserService.searchUsers(
        query as string,
        limit ? parseInt(limit as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        data: users,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset, status, role } = req.query;

      const result = await UserService.listUsers({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        status: status as any,
        role: role as any,
      });

      const response: PaginatedResponse<any> = {
        data: result.users,
        pagination: {
          page: Math.floor((offset ? parseInt(offset as string) : 0) / (limit ? parseInt(limit as string) : 20)) + 1,
          limit: limit ? parseInt(limit as string) : 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (limit ? parseInt(limit as string) : 20)),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      await UserService.deleteUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      const user = await UserService.updateUserStatus(userId, status);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User status updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      const user = await UserService.updateUserRole(userId, role);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User role updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
