import { CreatorRepository } from '../creator.repository';
import { getFirestore } from '../../services/firebase';
import { Creator, VerificationRequest } from '../../types';

jest.mock('../../services/firebase');

describe('CreatorRepository', () => {
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
    it('should return creator if found', async () => {
      const mockCreator: Creator = {
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

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'creator123',
        data: () => ({ ...mockCreator, createdAt: { toDate: () => mockCreator.createdAt }, updatedAt: { toDate: () => mockCreator.updatedAt } }),
      });

      const result = await CreatorRepository.findById('creator123');

      expect(result).toHaveProperty('id', 'creator123');
      expect(result?.userId).toBe('user123');
      expect(mockDb.collection).toHaveBeenCalledWith('creators');
      expect(mockCollection.doc).toHaveBeenCalledWith('creator123');
    });

    it('should return null if creator not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await CreatorRepository.findById('creator123');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return creator if found by user ID', async () => {
      const mockCreator: Creator = {
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

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'creator123', data: () => ({ ...mockCreator, createdAt: { toDate: () => mockCreator.createdAt }, updatedAt: { toDate: () => mockCreator.updatedAt } }) }],
      });

      const result = await CreatorRepository.findByUserId('user123');

      expect(result).toHaveProperty('id', 'creator123');
      expect(result?.userId).toBe('user123');
      expect(mockDb.collection).toHaveBeenCalledWith('creators');
      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });

    it('should return null if user ID not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await CreatorRepository.findByUserId('user123');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return creator if found by username', async () => {
      const mockCreator: Creator = {
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

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'creator123', data: () => ({ ...mockCreator, createdAt: { toDate: () => mockCreator.createdAt }, updatedAt: { toDate: () => mockCreator.updatedAt } }) }],
      });

      const result = await CreatorRepository.findByUsername('testcreator');

      expect(result).toHaveProperty('id', 'creator123');
      expect(result?.username).toBe('testcreator');
      expect(mockCollection.where).toHaveBeenCalledWith('username', '==', 'testcreator');
    });

    it('should return null if username not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await CreatorRepository.findByUsername('testcreator');

      expect(result).toBeNull();
    });
  });

  describe('checkUsernameExists', () => {
    it('should return true if username exists', async () => {
      mockQuery.get.mockResolvedValue({ empty: false, docs: [] });

      const result = await CreatorRepository.checkUsernameExists('testcreator');

      expect(result).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const result = await CreatorRepository.checkUsernameExists('testcreator');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new creator', async () => {
      const mockCreator: Creator = {
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

      mockDoc.set.mockResolvedValue(undefined);

      const result = await CreatorRepository.create(mockCreator);

      expect(result).toHaveProperty('id', 'creator123');
      expect(result?.userId).toBe('user123');
      expect(mockDb.collection).toHaveBeenCalledWith('creators');
      expect(mockCollection.doc).toHaveBeenCalledWith('creator123');
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing creator', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Updated Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'creator123',
        data: () => ({ ...mockCreator, createdAt: { toDate: () => mockCreator.createdAt }, updatedAt: { toDate: () => mockCreator.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);

      const updateData = { displayName: 'Updated Creator' };
      const result = await CreatorRepository.update('creator123', updateData);

      expect(result).toBeDefined();
      if (result) {
        expect(result.displayName).toBe('Updated Creator');
      }
      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    it('should return null if creator not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await CreatorRepository.update('creator123', { displayName: 'Updated Creator' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a creator', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.delete.mockResolvedValue(undefined);

      const result = await CreatorRepository.delete('creator123');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.delete.mockRejectedValue(new Error('Delete error'));

      await expect(CreatorRepository.delete('creator123')).rejects.toThrow('Delete error');
    });
  });

  describe('listCreators', () => {
    it('should list creators with pagination', async () => {
      const mockCreators: Creator[] = [
        {
          id: 'creator1',
          userId: 'user1',
          username: 'creator1',
          displayName: 'Creator 1',
          verified: false,
          verificationStatus: 'pending',
          featured: false,
          followersCount: 0,
          eventsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'creator2',
          userId: 'user2',
          username: 'creator2',
          displayName: 'Creator 2',
          verified: true,
          verificationStatus: 'approved',
          featured: true,
          followersCount: 100,
          eventsCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockCreators.map(creator => ({
          data: () => ({ ...creator, createdAt: { toDate: () => creator.createdAt }, updatedAt: { toDate: () => creator.updatedAt } }),
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

      const result = await CreatorRepository.listCreators({ limit: 10, offset: 0 });

      expect(result.creators).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('searchCreators', () => {
    it('should search creators by query', async () => {
      const mockCreators: Creator[] = [
        {
          id: 'creator1',
          userId: 'user1',
          username: 'creator1',
          displayName: 'Creator 1',
          verified: false,
          verificationStatus: 'pending',
          featured: false,
          followersCount: 0,
          eventsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockCreators.map(creator => ({
          data: () => ({ ...creator, createdAt: { toDate: () => creator.createdAt }, updatedAt: { toDate: () => creator.updatedAt } }),
        })),
      });

      const result = await CreatorRepository.searchCreators('creator', 10);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('creator1');
    });
  });

  describe('getFeaturedCreators', () => {
    it('should get featured creators', async () => {
      const mockCreators: Creator[] = [
        {
          id: 'creator1',
          userId: 'user1',
          username: 'creator1',
          displayName: 'Creator 1',
          verified: true,
          verificationStatus: 'approved',
          featured: true,
          followersCount: 100,
          eventsCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockCreators.map(creator => ({
          data: () => ({ ...creator, createdAt: { toDate: () => creator.createdAt }, updatedAt: { toDate: () => creator.updatedAt } }),
        })),
      });

      const result = await CreatorRepository.getFeaturedCreators(10);

      expect(result).toHaveLength(1);
      expect(result[0].featured).toBe(true);
      expect(mockCollection.where).toHaveBeenCalledWith('featured', '==', true);
    });
  });

  describe('getCreatorsByCategory', () => {
    it('should get creators by category', async () => {
      const mockCreators: Creator[] = [
        {
          id: 'creator1',
          userId: 'user1',
          username: 'creator1',
          displayName: 'Creator 1',
          category: 'music',
          verified: true,
          verificationStatus: 'approved',
          featured: false,
          followersCount: 50,
          eventsCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockCreators.map(creator => ({
          data: () => ({ ...creator, createdAt: { toDate: () => creator.createdAt }, updatedAt: { toDate: () => creator.updatedAt } }),
        })),
      });

      const result = await CreatorRepository.getCreatorsByCategory('music', 10);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('music');
      expect(mockCollection.where).toHaveBeenCalledWith('category', '==', 'music');
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update verification status', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: true,
        verificationStatus: 'approved',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const verificationRequest: VerificationRequest = {
        documentType: 'passport',
        submittedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'creator123',
        data: () => ({ ...mockCreator, createdAt: { toDate: () => mockCreator.createdAt }, updatedAt: { toDate: () => mockCreator.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);

      const result = await CreatorRepository.updateVerificationStatus('creator123', 'approved', verificationRequest);

      expect(result).toBeDefined();
      if (result) {
        expect(result.verificationStatus).toBe('approved');
        expect(result.verified).toBe(true);
      }
      expect(mockDoc.update).toHaveBeenCalledWith({
        verificationStatus: 'approved',
        verified: true,
        verificationRequest,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('setFeatured', () => {
    it('should set featured status', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: true,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'creator123',
        data: () => ({ ...mockCreator, createdAt: { toDate: () => mockCreator.createdAt }, updatedAt: { toDate: () => mockCreator.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);

      const result = await CreatorRepository.setFeatured('creator123', true);

      expect(result).toBeDefined();
      if (result) {
        expect(result.featured).toBe(true);
      }
      expect(mockDoc.update).toHaveBeenCalledWith({
        featured: true,
        updatedAt: expect.any(Date),
      });
    });
  });
});
