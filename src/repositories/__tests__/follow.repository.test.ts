import { FollowRepository } from '../follow.repository';
import { getFirestore } from '../../services/firebase';
import { Follower } from '../../types';

jest.mock('../../services/firebase');
jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      increment: jest.fn((val: number) => ({ _increment: val })),
    },
  },
}));

describe('FollowRepository', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockQuery: any;
  let mockTransaction: any;

  beforeEach(() => {
    const createMockDoc = (id: string) => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      data: jest.fn(),
      id,
    });

    mockCollection = {
      doc: jest.fn((id: string) => createMockDoc(id)),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      startAfter: jest.fn(() => mockQuery),
      count: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      startAfter: jest.fn(() => mockQuery),
      count: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockTransaction = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockDb = {
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn((callback: any) => callback(mockTransaction)),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIsFollowing', () => {
    it('should return true if following', async () => {
      mockQuery.get.mockResolvedValue({ empty: false, docs: [] });

      const result = await FollowRepository.checkIsFollowing('follower123', 'following123');

      expect(result).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('followers');
      expect(mockCollection.where).toHaveBeenCalledWith('followerId', '==', 'follower123');
    });

    it('should return false if not following', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await FollowRepository.checkIsFollowing('follower123', 'following123');

      expect(result).toBe(false);
    });
  });

  describe('followWithTransaction', () => {
    it('should create follow relationship and update counts', async () => {
      mockTransaction.get.mockImplementation((ref: any) => {
        if (typeof ref === 'object' && ref.id === 'follower123_following123') {
          return Promise.resolve({ exists: false });
        }
        if (typeof ref === 'object' && ref.where) {
          return Promise.resolve({ empty: true, docs: [] });
        }
        return Promise.resolve({ exists: true, data: () => ({ followersCount: 5, followingCount: 3 }) });
      });
      mockTransaction.set.mockResolvedValue(undefined);
      mockTransaction.update.mockResolvedValue(undefined);

      const result = await FollowRepository.followWithTransaction('follower123', 'following123', mockDb);

      expect(result).toHaveProperty('id');
      expect(result.followerId).toBe('follower123');
      expect(result.followingId).toBe('following123');
      expect(mockTransaction.set).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalledTimes(2);
    });

    it('should throw error if already following', async () => {
      mockTransaction.get.mockImplementation((ref: any) => {
        if (typeof ref === 'object' && ref.id === 'follower123_following123') {
          return Promise.resolve({ exists: true });
        }
        if (typeof ref === 'object' && ref.where) {
          return Promise.resolve({ empty: true, docs: [] });
        }
        return Promise.resolve({ exists: true, data: () => ({ followersCount: 5, followingCount: 3 }) });
      });

      await expect(FollowRepository.followWithTransaction('follower123', 'following123', mockDb)).rejects.toThrow('Already following');
    });
  });

  describe('unfollowWithTransaction', () => {
    it('should remove follow relationship and update counts', async () => {
      mockTransaction.get.mockImplementation((ref: any) => {
        if (typeof ref === 'object' && ref.id === 'follower123_following123') {
          return Promise.resolve({ exists: true });
        }
        if (typeof ref === 'object' && ref.where) {
          return Promise.resolve({ empty: true, docs: [] });
        }
        return Promise.resolve({ exists: true, data: () => ({ followersCount: 5, followingCount: 3 }) });
      });
      mockTransaction.delete.mockResolvedValue(undefined);
      mockTransaction.update.mockResolvedValue(undefined);

      const result = await FollowRepository.unfollowWithTransaction('follower123', 'following123', mockDb);

      expect(result).toBe(true);
      expect(mockTransaction.delete).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalledTimes(2);
    });

    it('should throw error if not following', async () => {
      mockTransaction.get.mockImplementation((ref: any) => {
        if (typeof ref === 'object' && ref.id === 'follower123_following123') {
          return Promise.resolve({ exists: false });
        }
        if (typeof ref === 'object' && ref.where) {
          return Promise.resolve({ empty: true, docs: [] });
        }
        return Promise.resolve({ exists: true, data: () => ({ followersCount: 5, followingCount: 3 }) });
      });

      await expect(FollowRepository.unfollowWithTransaction('follower123', 'following123', mockDb)).rejects.toThrow('Not following');
    });
  });

  describe('getFollowers', () => {
    it('should get followers with pagination', async () => {
      const mockFollowers: Follower[] = [
        {
          id: 'follow1',
          followerId: 'follower1',
          followingId: 'following123',
          createdAt: new Date(),
        },
        {
          id: 'follow2',
          followerId: 'follower2',
          followingId: 'following123',
          createdAt: new Date(),
        },
      ];

      mockQuery.get.mockImplementation(() => {
        return Promise.resolve({
          empty: false,
          docs: mockFollowers.map(follow => ({
            data: () => ({ ...follow, createdAt: { toDate: () => follow.createdAt } }),
          })),
        });
      });

      const mockCountQuery = {
        get: jest.fn(() => Promise.resolve({ data: () => ({ count: 2 }) })),
      };
      mockQuery.count.mockReturnValue(mockCountQuery);

      const result = await FollowRepository.getFollowers('following123', { limit: 10, offset: 0 });

      expect(result.followers).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockCollection.where).toHaveBeenCalledWith('followingId', '==', 'following123');
    });
  });

  describe('getFollowing', () => {
    it('should get following with pagination', async () => {
      const mockFollowing: Follower[] = [
        {
          id: 'follow1',
          followerId: 'follower123',
          followingId: 'following1',
          createdAt: new Date(),
        },
        {
          id: 'follow2',
          followerId: 'follower123',
          followingId: 'following2',
          createdAt: new Date(),
        },
      ];

      mockQuery.get.mockImplementation(() => {
        return Promise.resolve({
          empty: false,
          docs: mockFollowing.map(follow => ({
            data: () => ({ ...follow, createdAt: { toDate: () => follow.createdAt } }),
          })),
        });
      });

      const mockCountQuery = {
        get: jest.fn(() => Promise.resolve({ data: () => ({ count: 2 }) })),
      };
      mockQuery.count.mockReturnValue(mockCountQuery);

      const result = await FollowRepository.getFollowing('follower123', { limit: 10, offset: 0 });

      expect(result.following).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockCollection.where).toHaveBeenCalledWith('followerId', '==', 'follower123');
    });
  });

  describe('getFollowersCount', () => {
    it('should return followers count', async () => {
      const mockCountQuery = {
        get: jest.fn(() => Promise.resolve({ data: () => ({ count: 5 }) })),
      };
      mockQuery.count.mockReturnValue(mockCountQuery);

      const result = await FollowRepository.getFollowersCount('following123');

      expect(result).toBe(5);
      expect(mockCollection.where).toHaveBeenCalledWith('followingId', '==', 'following123');
    });
  });

  describe('getFollowingCount', () => {
    it('should return following count', async () => {
      const mockCountQuery = {
        get: jest.fn(() => Promise.resolve({ data: () => ({ count: 3 }) })),
      };
      mockQuery.count.mockReturnValue(mockCountQuery);

      const result = await FollowRepository.getFollowingCount('follower123');

      expect(result).toBe(3);
      expect(mockCollection.where).toHaveBeenCalledWith('followerId', '==', 'follower123');
    });
  });
});
