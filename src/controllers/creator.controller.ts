import { Request, Response, NextFunction } from 'express';
import { CreatorService } from '../services/creator.service';
import { ApiResponse, PaginatedResponse } from '../types';

export class CreatorController {
  static async getMyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const creator = await CreatorService.getProfileByUserId(userId);

      const response: ApiResponse = {
        success: true,
        data: creator,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;

      const creator = await CreatorService.getProfile(creatorId);

      const response: ApiResponse = {
        success: true,
        data: creator,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;

      const creator = await CreatorService.getPublicProfile(creatorId);

      const response: ApiResponse = {
        success: true,
        data: creator,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPublicProfileByUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;

      const creator = await CreatorService.getPublicProfileByUsername(username);

      const response: ApiResponse = {
        success: true,
        data: creator,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const creator = await CreatorService.createCreator(userId, req.body);

      const response: ApiResponse = {
        success: true,
        data: creator,
        message: 'Creator profile created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;

      const creator = await CreatorService.updateProfile(creatorId, req.body);

      const response: ApiResponse = {
        success: true,
        data: creator,
        message: 'Creator profile updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async deleteProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;

      await CreatorService.deleteCreator(creatorId);

      const response: ApiResponse = {
        success: true,
        message: 'Creator profile deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async checkUsernameAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username } = req.params;

      const result = await CreatorService.checkUsernameAvailability(username);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async searchCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, limit } = req.query;

      const creators = await CreatorService.searchCreators(
        query as string,
        limit ? parseInt(limit as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        data: creators,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async listCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset, category, verified, featured, verificationStatus } = req.query;

      const result = await CreatorService.listCreators({
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        category: category as string,
        verified: verified ? verified === 'true' : undefined,
        featured: featured ? featured === 'true' : undefined,
        verificationStatus: verificationStatus as any,
      });

      const response: PaginatedResponse<any> = {
        data: result.creators,
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

  static async getFeaturedCreators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit } = req.query;

      const creators = await CreatorService.getFeaturedCreators(
        limit ? parseInt(limit as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        data: creators,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getCreatorsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;
      const { limit } = req.query;

      const creators = await CreatorService.getCreatorsByCategory(
        category,
        limit ? parseInt(limit as string) : undefined
      );

      const response: ApiResponse = {
        success: true,
        data: creators,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async submitVerificationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;

      const creator = await CreatorService.submitVerificationRequest(creatorId, req.body);

      const response: ApiResponse = {
        success: true,
        data: creator,
        message: 'Verification request submitted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async approveVerificationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new Error('Admin not authenticated');
      }

      const creator = await CreatorService.approveVerificationRequest(creatorId, adminId);

      const response: ApiResponse = {
        success: true,
        data: creator,
        message: 'Verification request approved successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async rejectVerificationRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new Error('Admin not authenticated');
      }

      const { rejectionReason } = req.body;

      const creator = await CreatorService.rejectVerificationRequest(creatorId, adminId, rejectionReason);

      const response: ApiResponse = {
        success: true,
        data: creator,
        message: 'Verification request rejected successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async setFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorId } = req.params;

      const creator = await CreatorService.setFeatured(creatorId, req.body.featured);

      const response: ApiResponse = {
        success: true,
        data: creator,
        message: `Creator ${req.body.featured ? 'featured' : 'unfeatured'} successfully`,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
