import { FollowRepository } from '../repositories/follow.repository';
import { UserRepository } from '../repositories/user.repository';
import { CreatorRepository } from '../repositories/creator.repository';
import { Follower } from '../types';
import { AppError } from '../middleware/errorHandler';
import { getFirestore } from '../services/firebase';
import logger from '../utils/logger';

export class FollowService {
  static async followUser(followerId: string, followingId: string): Promise<Follower> {
    try {
      if (followerId === followingId) {
        throw new AppError('Cannot follow yourself', 400);
      }

      // Check if both users exist
      const [follower, following] = await Promise.all([
        UserRepository.findById(followerId),
        UserRepository.findById(followingId),
      ]);

      if (!follower) {
        throw new AppError('Follower not found', 404);
      }
      if (!following) {
        throw new AppError('User to follow not found', 404);
      }

      // Check if already following
      const isFollowing = await FollowRepository.checkIsFollowing(followerId, followingId);
      if (isFollowing) {
        throw new AppError('Already following this user', 409);
      }

      // Use transaction to follow
      const db = getFirestore();
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      const follow = await FollowRepository.followWithTransaction(followerId, followingId, db);

      logger.info(`User ${followerId} followed user ${followingId}`);
      return follow;
    } catch (error) {
      logger.error('Error following user:', error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message === 'Already following') {
        throw new AppError('Already following this user', 409);
      }
      throw new AppError('Failed to follow user', 500);
    }
  }

  static async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      if (followerId === followingId) {
        throw new AppError('Cannot unfollow yourself', 400);
      }

      // Check if both users exist
      const [follower, following] = await Promise.all([
        UserRepository.findById(followerId),
        UserRepository.findById(followingId),
      ]);

      if (!follower) {
        throw new AppError('Follower not found', 404);
      }
      if (!following) {
        throw new AppError('User to unfollow not found', 404);
      }

      // Check if following
      const isFollowing = await FollowRepository.checkIsFollowing(followerId, followingId);
      if (!isFollowing) {
        throw new AppError('Not following this user', 400);
      }

      // Use transaction to unfollow
      const db = getFirestore();
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      const result = await FollowRepository.unfollowWithTransaction(followerId, followingId, db);

      logger.info(`User ${followerId} unfollowed user ${followingId}`);
      return result;
    } catch (error) {
      logger.error('Error unfollowing user:', error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message === 'Not following') {
        throw new AppError('Not following this user', 400);
      }
      throw new AppError('Failed to unfollow user', 500);
    }
  }

  static async checkIsFollowing(followerId: string, followingId: string): Promise<{ following: boolean }> {
    try {
      const isFollowing = await FollowRepository.checkIsFollowing(followerId, followingId);
      return { following: isFollowing };
    } catch (error) {
      logger.error('Error checking follow status:', error);
      throw new AppError('Failed to check follow status', 500);
    }
  }

  static async getFollowers(userId: string, options: { limit?: number; offset?: number } = {}): Promise<{
    followers: Follower[];
    total: number;
  }> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const result = await FollowRepository.getFollowers(userId, options);
      return result;
    } catch (error) {
      logger.error('Error getting followers:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get followers', 500);
    }
  }

  static async getFollowing(userId: string, options: { limit?: number; offset?: number } = {}): Promise<{
    following: Follower[];
    total: number;
  }> {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const result = await FollowRepository.getFollowing(userId, options);
      return result;
    } catch (error) {
      logger.error('Error getting following:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get following', 500);
    }
  }

  static async getFollowersCount(userId: string): Promise<{ count: number }> {
    try {
      const count = await FollowRepository.getFollowersCount(userId);
      return { count };
    } catch (error) {
      logger.error('Error getting followers count:', error);
      throw new AppError('Failed to get followers count', 500);
    }
  }

  static async getFollowingCount(userId: string): Promise<{ count: number }> {
    try {
      const count = await FollowRepository.getFollowingCount(userId);
      return { count };
    } catch (error) {
      logger.error('Error getting following count:', error);
      throw new AppError('Failed to get following count', 500);
    }
  }

  static async followCreator(followerId: string, creatorId: string): Promise<Follower> {
    try {
      if (followerId === creatorId) {
        throw new AppError('Cannot follow yourself', 400);
      }

      // Check if follower exists and creator exists
      const [follower, creator] = await Promise.all([
        UserRepository.findById(followerId),
        CreatorRepository.findById(creatorId),
      ]);

      if (!follower) {
        throw new AppError('Follower not found', 404);
      }
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      // Check if already following
      const isFollowing = await FollowRepository.checkIsFollowing(followerId, creator.userId);
      if (isFollowing) {
        throw new AppError('Already following this creator', 409);
      }

      // Use transaction to follow (follows the creator's user ID)
      const db = getFirestore();
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      const follow = await FollowRepository.followWithTransaction(followerId, creator.userId, db);

      logger.info(`User ${followerId} followed creator ${creatorId}`);
      return follow;
    } catch (error) {
      logger.error('Error following creator:', error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message === 'Already following') {
        throw new AppError('Already following this creator', 409);
      }
      throw new AppError('Failed to follow creator', 500);
    }
  }

  static async unfollowCreator(followerId: string, creatorId: string): Promise<boolean> {
    try {
      if (followerId === creatorId) {
        throw new AppError('Cannot unfollow yourself', 400);
      }

      // Check if follower exists and creator exists
      const [follower, creator] = await Promise.all([
        UserRepository.findById(followerId),
        CreatorRepository.findById(creatorId),
      ]);

      if (!follower) {
        throw new AppError('Follower not found', 404);
      }
      if (!creator) {
        throw new AppError('Creator not found', 404);
      }

      // Check if following
      const isFollowing = await FollowRepository.checkIsFollowing(followerId, creator.userId);
      if (!isFollowing) {
        throw new AppError('Not following this creator', 400);
      }

      // Use transaction to unfollow (unfollows the creator's user ID)
      const db = getFirestore();
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      const result = await FollowRepository.unfollowWithTransaction(followerId, creator.userId, db);

      logger.info(`User ${followerId} unfollowed creator ${creatorId}`);
      return result;
    } catch (error) {
      logger.error('Error unfollowing creator:', error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message === 'Not following') {
        throw new AppError('Not following this creator', 400);
      }
      throw new AppError('Failed to unfollow creator', 500);
    }
  }
}
