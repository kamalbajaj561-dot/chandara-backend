import { FollowService } from '../follow.service';
import { FollowRepository } from '../../repositories/follow.repository';
import { UserRepository } from '../../repositories/user.repository';
import { CreatorRepository } from '../../repositories/creator.repository';
import { getFirestore } from '../../services/firebase';
import { Follower } from '../../types';

jest.mock('../../repositories/follow.repository');
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/creator.repository');
jest.mock('../../services/firebase');

describe('FollowService', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {};
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    jest.clearAllMocks();
  });

  describe('followUser', () => {
    it('should follow a user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFollow: Follower = {
        id: 'follow123',
        followerId: 'follower123',
        followingId: 'user123',
        createdAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(false);
      (FollowRepository.followWithTransaction as jest.Mock).mockResolvedValue(mockFollow);

      const result = await FollowService.followUser('follower123', 'user123');

      expect(result).toEqual(mockFollow);
      expect(FollowRepository.followWithTransaction).toHaveBeenCalledWith('follower123', 'user123', mockDb);
    });

    it('should throw error if following yourself', async () => {
      await expect(FollowService.followUser('user123', 'user123')).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw error if follower not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({});

      await expect(FollowService.followUser('follower123', 'user123')).rejects.toThrow('Follower not found');
    });

    it('should throw error if following user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValueOnce({}).mockResolvedValueOnce(null);

      await expect(FollowService.followUser('follower123', 'user123')).rejects.toThrow('User to follow not found');
    });

    it('should throw error if already following', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(true);

      await expect(FollowService.followUser('follower123', 'user123')).rejects.toThrow('Already following this user');
    });
  });

  describe('unfollowUser', () => {
    it('should unfollow a user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(true);
      (FollowRepository.unfollowWithTransaction as jest.Mock).mockResolvedValue(true);

      const result = await FollowService.unfollowUser('follower123', 'user123');

      expect(result).toBe(true);
      expect(FollowRepository.unfollowWithTransaction).toHaveBeenCalledWith('follower123', 'user123', mockDb);
    });

    it('should throw error if unfollowing yourself', async () => {
      await expect(FollowService.unfollowUser('user123', 'user123')).rejects.toThrow('Cannot unfollow yourself');
    });

    it('should throw error if not following', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(false);

      await expect(FollowService.unfollowUser('follower123', 'user123')).rejects.toThrow('Not following this user');
    });
  });

  describe('checkIsFollowing', () => {
    it('should return following status', async () => {
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(true);

      const result = await FollowService.checkIsFollowing('follower123', 'user123');

      expect(result.following).toBe(true);
    });
  });

  describe('getFollowers', () => {
    it('should get followers', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFollowers: Follower[] = [
        {
          id: 'follow1',
          followerId: 'follower1',
          followingId: 'user123',
          createdAt: new Date(),
        },
      ];

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (FollowRepository.getFollowers as jest.Mock).mockResolvedValue({ followers: mockFollowers, total: 1 });

      const result = await FollowService.getFollowers('user123', { limit: 10, offset: 0 });

      expect(result.followers).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(FollowService.getFollowers('user123')).rejects.toThrow('User not found');
    });
  });

  describe('getFollowing', () => {
    it('should get following', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFollowing: Follower[] = [
        {
          id: 'follow1',
          followerId: 'user123',
          followingId: 'following1',
          createdAt: new Date(),
        },
      ];

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (FollowRepository.getFollowing as jest.Mock).mockResolvedValue({ following: mockFollowing, total: 1 });

      const result = await FollowService.getFollowing('user123', { limit: 10, offset: 0 });

      expect(result.following).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(FollowService.getFollowing('user123')).rejects.toThrow('User not found');
    });
  });

  describe('getFollowersCount', () => {
    it('should return followers count', async () => {
      (FollowRepository.getFollowersCount as jest.Mock).mockResolvedValue(5);

      const result = await FollowService.getFollowersCount('user123');

      expect(result.count).toBe(5);
    });
  });

  describe('getFollowingCount', () => {
    it('should return following count', async () => {
      (FollowRepository.getFollowingCount as jest.Mock).mockResolvedValue(3);

      const result = await FollowService.getFollowingCount('user123');

      expect(result.count).toBe(3);
    });
  });

  describe('followCreator', () => {
    it('should follow a creator', async () => {
      const mockUser = {
        id: 'follower123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockFollow: Follower = {
        id: 'follow123',
        followerId: 'follower123',
        followingId: 'user123',
        createdAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(false);
      (FollowRepository.followWithTransaction as jest.Mock).mockResolvedValue(mockFollow);

      const result = await FollowService.followCreator('follower123', 'creator123');

      expect(result).toEqual(mockFollow);
      expect(FollowRepository.followWithTransaction).toHaveBeenCalledWith('follower123', 'user123', mockDb);
    });

    it('should throw error if following yourself', async () => {
      await expect(FollowService.followCreator('creator123', 'creator123')).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw error if follower not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(FollowService.followCreator('follower123', 'creator123')).rejects.toThrow('Follower not found');
    });

    it('should throw error if creator not found', async () => {
      const mockUser = {
        id: 'follower123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(FollowService.followCreator('follower123', 'creator123')).rejects.toThrow('Creator not found');
    });

    it('should throw error if already following', async () => {
      const mockUser = {
        id: 'follower123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(true);

      await expect(FollowService.followCreator('follower123', 'creator123')).rejects.toThrow('Already following this creator');
    });
  });

  describe('unfollowCreator', () => {
    it('should unfollow a creator', async () => {
      const mockUser = {
        id: 'follower123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(true);
      (FollowRepository.unfollowWithTransaction as jest.Mock).mockResolvedValue(true);

      const result = await FollowService.unfollowCreator('follower123', 'creator123');

      expect(result).toBe(true);
      expect(FollowRepository.unfollowWithTransaction).toHaveBeenCalledWith('follower123', 'user123', mockDb);
    });

    it('should throw error if unfollowing yourself', async () => {
      await expect(FollowService.unfollowCreator('creator123', 'creator123')).rejects.toThrow('Cannot unfollow yourself');
    });

    it('should throw error if not following', async () => {
      const mockUser = {
        id: 'follower123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (FollowRepository.checkIsFollowing as jest.Mock).mockResolvedValue(false);

      await expect(FollowService.unfollowCreator('follower123', 'creator123')).rejects.toThrow('Not following this creator');
    });
  });
});
