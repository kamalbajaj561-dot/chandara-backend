import { CreatorRepository } from '../repositories/creator.repository';
import { UserRepository } from '../repositories/user.repository';
import { Creator, SocialLinks, VerificationRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface UpdateCreatorProfileData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  category?: string;
  language?: string;
  country?: string;
  socialLinks?: SocialLinks;
}

interface CreateCreatorData {
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  category?: string;
  language?: string;
  country?: string;
  socialLinks?: SocialLinks;
}

export class CreatorService {
  static async getProfile(creatorId: string): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }
      return creator;
    } catch (error) {
      logger.error('Error getting creator profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get creator profile', 500);
    }
  }

  static async getProfileByUserId(userId: string): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findByUserId(userId);
      if (!creator) {
        throw new AppError('Creator profile not found', 404);
      }
      return creator;
    } catch (error) {
      logger.error('Error getting creator profile by user ID:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get creator profile', 500);
    }
  }

  static async getPublicProfile(creatorId: string): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      // Return only public fields
      const publicProfile: Creator = {
        id: creator.id,
        userId: creator.userId,
        username: creator.username,
        displayName: creator.displayName,
        bio: creator.bio,
        avatar: creator.avatar,
        banner: creator.banner,
        category: creator.category,
        language: creator.language,
        country: creator.country,
        socialLinks: creator.socialLinks,
        verified: creator.verified,
        featured: creator.featured,
        followersCount: creator.followersCount,
        eventsCount: creator.eventsCount,
        createdAt: creator.createdAt,
      } as any;

      return publicProfile;
    } catch (error) {
      logger.error('Error getting public creator profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get public profile', 500);
    }
  }

  static async getPublicProfileByUsername(username: string): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findByUsername(username);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      // Return only public fields
      const publicProfile: Creator = {
        id: creator.id,
        userId: creator.userId,
        username: creator.username,
        displayName: creator.displayName,
        bio: creator.bio,
        avatar: creator.avatar,
        banner: creator.banner,
        category: creator.category,
        language: creator.language,
        country: creator.country,
        socialLinks: creator.socialLinks,
        verified: creator.verified,
        featured: creator.featured,
        followersCount: creator.followersCount,
        eventsCount: creator.eventsCount,
        createdAt: creator.createdAt,
      } as any;

      return publicProfile;
    } catch (error) {
      logger.error('Error getting public creator profile by username:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get public profile', 500);
    }
  }

  static async createCreator(userId: string, data: CreateCreatorData): Promise<Creator> {
    try {
      // Check if user exists
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user already has a creator profile
      const existingCreator = await CreatorRepository.findByUserId(userId);
      if (existingCreator) {
        throw new AppError('Creator profile already exists', 409);
      }

      // Check username uniqueness
      const usernameExists = await CreatorRepository.checkUsernameExists(data.username);
      if (usernameExists) {
        throw new AppError('Username already taken', 409);
      }

      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(data.username)) {
        throw new AppError(
          'Username must be 3-30 characters and can only contain letters, numbers, and underscores',
          400
        );
      }

      // Generate creator ID
      const creatorId = `creator_${userId}`;

      const creator: Creator = {
        id: creatorId,
        userId,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
        banner: data.banner,
        category: data.category,
        language: data.language,
        country: data.country,
        socialLinks: data.socialLinks,
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdCreator = await CreatorRepository.create(creator);

      // Update user role to creator
      await UserRepository.update(userId, { role: 'creator' });

      logger.info(`Creator profile created: ${creatorId}`);
      return createdCreator;
    } catch (error) {
      logger.error('Error creating creator:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create creator profile', 500);
    }
  }

  static async updateProfile(creatorId: string, data: UpdateCreatorProfileData): Promise<Creator> {
    try {
      const existingCreator = await CreatorRepository.findById(creatorId);
      if (!existingCreator) {
        throw new AppError('Creator not found', 404);
      }

      // Check username uniqueness if username is being updated
      if (data.username && data.username !== existingCreator.username) {
        const usernameExists = await CreatorRepository.checkUsernameExists(data.username);
        if (usernameExists) {
          throw new AppError('Username already taken', 409);
        }
      }

      // Validate username format if provided
      if (data.username) {
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(data.username)) {
          throw new AppError(
            'Username must be 3-30 characters and can only contain letters, numbers, and underscores',
            400
          );
        }
      }

      const updatedCreator = await CreatorRepository.update(creatorId, data);
      if (!updatedCreator) {
        throw new AppError('Failed to update profile', 500);
      }

      return updatedCreator;
    } catch (error) {
      logger.error('Error updating creator profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update profile', 500);
    }
  }

  static async deleteCreator(creatorId: string): Promise<void> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      const deleted = await CreatorRepository.delete(creatorId);
      if (!deleted) {
        throw new AppError('Failed to delete creator', 500);
      }

      // Revert user role to viewer
      await UserRepository.update(creator.userId, { role: 'viewer' });

      logger.info(`Creator deleted: ${creatorId}`);
    } catch (error) {
      logger.error('Error deleting creator:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete creator', 500);
    }
  }

  static async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    try {
      // Validate username format
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        throw new AppError(
          'Username must be 3-30 characters and can only contain letters, numbers, and underscores',
          400
        );
      }

      const exists = await CreatorRepository.checkUsernameExists(username);
      return { available: !exists };
    } catch (error) {
      logger.error('Error checking creator username availability:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to check username availability', 500);
    }
  }

  static async searchCreators(query: string, limit: number = 20): Promise<Creator[]> {
    try {
      if (!query || query.length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400);
      }

      const creators = await CreatorRepository.searchCreators(query, limit);
      return creators;
    } catch (error) {
      logger.error('Error searching creators:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to search creators', 500);
    }
  }

  static async listCreators(options: {
    limit?: number;
    offset?: number;
    category?: string;
    verified?: boolean;
    featured?: boolean;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  } = {}): Promise<{ creators: Creator[]; total: number }> {
    try {
      const result = await CreatorRepository.listCreators(options);
      return result;
    } catch (error) {
      logger.error('Error listing creators:', error);
      throw new AppError('Failed to list creators', 500);
    }
  }

  static async getFeaturedCreators(limit: number = 10): Promise<Creator[]> {
    try {
      const creators = await CreatorRepository.getFeaturedCreators(limit);
      return creators;
    } catch (error) {
      logger.error('Error getting featured creators:', error);
      throw new AppError('Failed to get featured creators', 500);
    }
  }

  static async getCreatorsByCategory(category: string, limit: number = 20): Promise<Creator[]> {
    try {
      const creators = await CreatorRepository.getCreatorsByCategory(category, limit);
      return creators;
    } catch (error) {
      logger.error('Error getting creators by category:', error);
      throw new AppError('Failed to get creators by category', 500);
    }
  }

  static async submitVerificationRequest(
    creatorId: string,
    verificationData: {
      documentType: string;
      documentNumber?: string;
      additionalInfo?: string;
    }
  ): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      if (creator.verificationStatus === 'approved') {
        throw new AppError('Creator is already verified', 400);
      }

      const verificationRequest: VerificationRequest = {
        documentType: verificationData.documentType,
        documentNumber: verificationData.documentNumber,
        additionalInfo: verificationData.additionalInfo,
        submittedAt: new Date(),
      };

      const updatedCreator = await CreatorRepository.updateVerificationStatus(
        creatorId,
        'pending',
        verificationRequest
      );

      if (!updatedCreator) {
        throw new AppError('Failed to submit verification request', 500);
      }

      logger.info(`Verification request submitted for creator: ${creatorId}`);
      return updatedCreator;
    } catch (error) {
      logger.error('Error submitting verification request:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to submit verification request', 500);
    }
  }

  static async approveVerificationRequest(
    creatorId: string,
    adminId: string
  ): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      if (creator.verificationStatus === 'approved') {
        throw new AppError('Creator is already verified', 400);
      }

      const verificationRequest: VerificationRequest = {
        ...creator.verificationRequest!,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      };

      const updatedCreator = await CreatorRepository.updateVerificationStatus(
        creatorId,
        'approved',
        verificationRequest
      );

      if (!updatedCreator) {
        throw new AppError('Failed to approve verification request', 500);
      }

      logger.info(`Verification request approved for creator: ${creatorId} by admin: ${adminId}`);
      return updatedCreator;
    } catch (error) {
      logger.error('Error approving verification request:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to approve verification request', 500);
    }
  }

  static async rejectVerificationRequest(
    creatorId: string,
    adminId: string,
    rejectionReason: string
  ): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      if (creator.verificationStatus === 'approved') {
        throw new AppError('Cannot reject an already verified creator', 400);
      }

      const verificationRequest: VerificationRequest = {
        ...creator.verificationRequest!,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason,
      };

      const updatedCreator = await CreatorRepository.updateVerificationStatus(
        creatorId,
        'rejected',
        verificationRequest
      );

      if (!updatedCreator) {
        throw new AppError('Failed to reject verification request', 500);
      }

      logger.info(`Verification request rejected for creator: ${creatorId} by admin: ${adminId}`);
      return updatedCreator;
    } catch (error) {
      logger.error('Error rejecting verification request:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to reject verification request', 500);
    }
  }

  static async setFeatured(creatorId: string, featured: boolean): Promise<Creator> {
    try {
      const creator = await CreatorRepository.findById(creatorId);
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      const updatedCreator = await CreatorRepository.setFeatured(creatorId, featured);
      if (!updatedCreator) {
        throw new AppError('Failed to set featured status', 500);
      }

      logger.info(`Creator featured status updated: ${creatorId} -> ${featured}`);
      return updatedCreator;
    } catch (error) {
      logger.error('Error setting featured status:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to set featured status', 500);
    }
  }
}
