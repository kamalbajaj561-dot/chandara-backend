import { Request, Response, NextFunction } from 'express';
import { FollowService } from '../services/follow.service';
import { ApiResponse, PaginatedResponse } from '../types';

export class FollowController {
  static async followUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user?.userId;
      const { userId } = req.params;

      if (!followerId) {
        throw new Error('User not authenticated');
      }

      const follow = await FollowService.followUser(followerId, userId);

      const response: ApiResponse = {
        success: true,
        data: follow,
        message: 'User followed successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async unfollowUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user?.userId;
      const { userId } = req.params;

      if (!followerId) {
        throw new Error('User not authenticated');
      }

      const result = await FollowService.unfollowUser(followerId, userId);

      const response: ApiResponse = {
        success: true,
        data: { unfollowed: result },
        message: 'User unfollowed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async checkIsFollowing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user?.userId;
      const { userId } = req.params;

      if (!followerId) {
        throw new Error('User not authenticated');
      }

      const result = await FollowService.checkIsFollowing(followerId, userId);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getFollowers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit, offset } = req.query;

      const result = await FollowService.getFollowers(userId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      const response: PaginatedResponse<any> = {
        data: result.followers,
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

  static async getFollowing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit, offset } = req.query;

      const result = await FollowService.getFollowing(userId, {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      const response: PaginatedResponse<any> = {
        data: result.following,
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

  static async getFollowersCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const result = await FollowService.getFollowersCount(userId);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getFollowingCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const result = await FollowService.getFollowingCount(userId);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async followCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user?.userId;
      const { creatorId } = req.params;

      if (!followerId) {
        throw new Error('User not authenticated');
      }

      const follow = await FollowService.followCreator(followerId, creatorId);

      const response: ApiResponse = {
        success: true,
        data: follow,
        message: 'Creator followed successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async unfollowCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const followerId = req.user?.userId;
      const { creatorId } = req.params;

      if (!followerId) {
        throw new Error('User not authenticated');
      }

      const result = await FollowService.unfollowCreator(followerId, creatorId);

      const response: ApiResponse = {
        success: true,
        data: { unfollowed: result },
        message: 'Creator unfollowed successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
