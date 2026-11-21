import { UserRepository } from '../user.repository';
import { getFirestore } from '../../services/firebase';
import { User } from '../../types';

jest.mock('../../services/firebase');
jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      increment: jest.fn((val: number) => ({ _increment: val })),
    },
  },
}));

describe('UserRepository', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;

  beforeEach(() => {
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      data: jest.fn(),
      id: '',
    };
    mockCollection = {
      doc: jest.fn((id: string) => {
        mockDoc.id = id;
        return mockDoc;
      }),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      count: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      count: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockDb = {
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn(),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => ({ ...mockUser, createdAt: { toDate: () => mockUser.createdAt }, updatedAt: { toDate: () => mockUser.updatedAt } }),
      });

      const result = await UserRepository.findById('user123');

      expect(result).toHaveProperty('id', 'user123');
      expect(result?.email).toBe('test@example.com');
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
    });

    it('should return null if user not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await UserRepository.findById('user123');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      mockDoc.get.mockRejectedValue(new Error('Firestore error'));

      await expect(UserRepository.findById('user123')).rejects.toThrow('Firestore error');
    });
  });

  describe('findByUsername', () => {
    it('should return user if found by username', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'user123', data: () => ({ ...mockUser, createdAt: { toDate: () => mockUser.createdAt }, updatedAt: { toDate: () => mockUser.updatedAt } }) }],
      });

      const result = await UserRepository.findByUsername('testuser');

      expect(result).toHaveProperty('id', 'user123');
      expect(result?.email).toBe('test@example.com');
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.where).toHaveBeenCalledWith('username', '==', 'testuser');
    });

    it('should return null if username not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await UserRepository.findByUsername('testuser');

      expect(result).toBeNull();
    });
  });

  describe('checkUsernameExists', () => {
    it('should return true if username exists', async () => {
      mockQuery.get.mockResolvedValue({ empty: false, docs: [] });

      const result = await UserRepository.checkUsernameExists('testuser');

      expect(result).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await UserRepository.checkUsernameExists('testuser');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.set.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => ({ ...mockUser, createdAt: { toDate: () => mockUser.createdAt }, updatedAt: { toDate: () => mockUser.updatedAt } }),
      });

      const result = await UserRepository.create(mockUser);

      expect(result).toHaveProperty('id', 'user123');
      expect(result.email).toBe('test@example.com');
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const updateData = { displayName: 'Updated User' };
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Updated User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => ({ ...mockUser, createdAt: { toDate: () => mockUser.createdAt }, updatedAt: { toDate: () => mockUser.updatedAt } }),
      });

      const result = await UserRepository.update('user123', updateData);

      expect(result).toBeDefined();
      if (result) {
        expect(result.displayName).toBe('Updated User');
      }
      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    it('should return null if user not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await UserRepository.update('user123', { displayName: 'Updated User' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.delete.mockResolvedValue(undefined);

      const result = await UserRepository.delete('user123');

      expect(result).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.delete.mockImplementation(() => {
        return Promise.reject(new Error('Delete error'));
      });

      await expect(UserRepository.delete('user123')).rejects.toThrow('Delete error');
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      const mockUsers: User[] = [
        {
          id: 'user1',
          email: 'test1@example.com',
          username: 'testuser1',
          displayName: 'Test User 1',
          role: 'viewer',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user2',
          email: 'test2@example.com',
          username: 'testuser2',
          displayName: 'Test User 2',
          role: 'creator',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockUsers.map(user => ({
          data: () => ({ ...user, createdAt: { toDate: () => user.createdAt }, updatedAt: { toDate: () => user.updatedAt } }),
        })),
      });

      const mockCountSnapshot = {
        data: () => ({ count: 2 }),
      };
      const mockCountQuery = {
        get: jest.fn(() => Promise.resolve(mockCountSnapshot)),
      };
      
      mockQuery.count.mockReturnValue(mockCountQuery);
      mockCollection.count = jest.fn(() => mockCountQuery);
      mockCollection.where.mockReturnValue(mockQuery);

      const result = await UserRepository.listUsers({ limit: 10, offset: 0 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockUsers: User[] = [
        {
          id: 'user1',
          email: 'test1@example.com',
          username: 'testuser1',
          displayName: 'Test User 1',
          role: 'viewer',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockUsers.map(user => ({
          data: () => ({ ...user, createdAt: { toDate: () => user.createdAt }, updatedAt: { toDate: () => user.updatedAt } }),
        })),
      });

      const result = await UserRepository.searchUsers('test', 10);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('testuser1');
    });
  });

  describe('updateFollowersCount', () => {
    it('should update followers count', async () => {
      await UserRepository.updateFollowersCount('user123', 5);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
        followersCount: expect.objectContaining({ _increment: 5 }),
      }));
    });
  });

  describe('updateFollowingCount', () => {
    it('should update following count', async () => {
      await UserRepository.updateFollowingCount('user123', 3);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({
        followingCount: expect.objectContaining({ _increment: 3 }),
      }));
    });
  });
});
