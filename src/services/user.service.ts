import { UserRepository } from '../repositories/user.repository';
import { User, SocialLinks } from '../types';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface UpdateUserProfileData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  language?: string;
  country?: string;
  socialLinks?: SocialLinks;
}

export class UserService {
  static async getProfile(userId: string): Promise<User> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      return user;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get user profile', 500);
    }
  }

  static async getPublicProfile(userId: string): Promise<User> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Return only public fields
      const publicProfile: User = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        banner: user.banner,
        role: user.role,
        language: user.language,
        country: user.country,
        socialLinks: user.socialLinks,
        createdAt: user.createdAt,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
      } as any;

      return publicProfile;
    } catch (error) {
      logger.error('Error getting public profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get public profile', 500);
    }
  }

  static async getPublicProfileByUsername(username: string): Promise<User> {
    try {
      const user = await UserRepository.findByUsername(username);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Return only public fields
      const publicProfile: User = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        banner: user.banner,
        role: user.role,
        language: user.language,
        country: user.country,
        socialLinks: user.socialLinks,
        createdAt: user.createdAt,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
      } as any;

      return publicProfile;
    } catch (error) {
      logger.error('Error getting public profile by username:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get public profile', 500);
    }
  }

  static async updateProfile(userId: string, data: UpdateUserProfileData): Promise<User> {
    try {
      const existingUser = await UserRepository.findById(userId);
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }

      // Check username uniqueness if username is being updated
      if (data.username && data.username !== existingUser.username) {
        const usernameExists = await UserRepository.checkUsernameExists(data.username);
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

      const updatedUser = await UserRepository.update(userId, data);
      if (!updatedUser) {
        throw new AppError('Failed to update profile', 500);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update profile', 500);
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

      const exists = await UserRepository.checkUsernameExists(username);
      return { available: !exists };
    } catch (error) {
      logger.error('Error checking username availability:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to check username availability', 500);
    }
  }

  static async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    try {
      if (!query || query.length < 2) {
        throw new AppError('Search query must be at least 2 characters', 400);
      }

      const users = await UserRepository.searchUsers(query, limit);
      return users;
    } catch (error) {
      logger.error('Error searching users:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to search users', 500);
    }
  }

  static async listUsers(options: {
    limit?: number;
    offset?: number;
    status?: User['status'];
    role?: User['role'];
  } = {}): Promise<{ users: User[]; total: number }> {
    try {
      const result = await UserRepository.listUsers(options);
      return result;
    } catch (error) {
      logger.error('Error listing users:', error);
      throw new AppError('Failed to list users', 500);
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const deleted = await UserRepository.delete(userId);
      if (!deleted) {
        throw new AppError('Failed to delete user', 500);
      }

      logger.info(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete user', 500);
    }
  }

  static async updateUserStatus(
    userId: string,
    status: User['status']
  ): Promise<User> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const updatedUser = await UserRepository.update(userId, { status });
      if (!updatedUser) {
        throw new AppError('Failed to update user status', 500);
      }

      logger.info(`User status updated: ${userId} -> ${status}`);
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user status:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update user status', 500);
    }
  }

  static async updateUserRole(
    userId: string,
    role: User['role']
  ): Promise<User> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const updatedUser = await UserRepository.update(userId, { role });
      if (!updatedUser) {
        throw new AppError('Failed to update user role', 500);
      }

      logger.info(`User role updated: ${userId} -> ${role}`);
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user role:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update user role', 500);
    }
  }
}
