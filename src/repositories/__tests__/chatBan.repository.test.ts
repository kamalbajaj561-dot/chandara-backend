import { ChatBanRepository } from '../chatBan.repository';
import { getFirestore } from '../../services/firebase';
import { ChatBan } from '../../types';

jest.mock('../../services/firebase');

describe('ChatBanRepository', () => {
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
      get: jest.fn(),
    };
    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockDb = {
      collection: jest.fn(() => mockCollection),
      batch: jest.fn(() => ({
        delete: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new chat ban', async () => {
      const mockBan: Omit<ChatBan, 'id' | 'createdAt' | 'updatedAt'> = {
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Inappropriate behavior',
        banType: 'temporary',
        duration: 3600,
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
      };

      mockCollection.add.mockResolvedValue({
        id: 'ban123',
      });
      mockDoc.get.mockResolvedValue({
        id: 'ban123',
        exists: true,
        data: () => ({ ...mockBan, id: 'ban123', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() }, expiresAt: { toDate: () => new Date(Date.now() + 3600000) } }),
      });

      const repository = new ChatBanRepository();
      const result = await repository.create(mockBan);

      expect(result).toBeDefined();
      expect(result.banId).toBe('ban123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_bans');
    });
  });

  describe('findById', () => {
    it('should return ban if found', async () => {
      const mockBan: ChatBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Inappropriate behavior',
        banType: 'temporary',
        duration: 3600,
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'ban123',
        data: () => ({ ...mockBan, createdAt: { toDate: () => mockBan.createdAt }, updatedAt: { toDate: () => mockBan.updatedAt }, expiresAt: { toDate: () => mockBan.expiresAt } }),
      });

      const repository = new ChatBanRepository();
      const result = await repository.findById('ban123');

      expect(result).toHaveProperty('id', 'ban123');
      expect(result?.banId).toBe('ban123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_bans');
    });

    it('should return null if ban not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new ChatBanRepository();
      const result = await repository.findById('ban123');

      expect(result).toBeNull();
    });
  });

  describe('findByBanId', () => {
    it('should return ban by ban ID', async () => {
      const mockBan: ChatBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Inappropriate behavior',
        banType: 'temporary',
        duration: 3600,
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'ban123', data: () => ({ ...mockBan, createdAt: { toDate: () => mockBan.createdAt }, updatedAt: { toDate: () => mockBan.updatedAt }, expiresAt: { toDate: () => mockBan.expiresAt } }) }],
      });

      const repository = new ChatBanRepository();
      const result = await repository.findByBanId('ban123');

      expect(result).toHaveProperty('id', 'ban123');
      expect(result?.banId).toBe('ban123');
      expect(mockCollection.where).toHaveBeenCalledWith('banId', '==', 'ban123');
    });

    it('should return null if ban not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const repository = new ChatBanRepository();
      const result = await repository.findByBanId('ban123');

      expect(result).toBeNull();
    });
  });

  describe('findByEventId', () => {
    it('should return bans by event ID', async () => {
      const mockBans: ChatBan[] = [
        {
          id: 'ban1',
          banId: 'ban1',
          eventId: 'event123',
          userId: 'user123',
          userName: 'Test User',
          bannedBy: 'mod123',
          bannedByName: 'Moderator',
          reason: 'Inappropriate behavior',
          banType: 'temporary',
          duration: 3600,
          expiresAt: new Date(Date.now() + 3600000),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockBans.map(ban => ({
          id: ban.id,
          data: () => ({ ...ban, createdAt: { toDate: () => ban.createdAt }, updatedAt: { toDate: () => ban.updatedAt }, expiresAt: { toDate: () => ban.expiresAt } }),
        })),
      });

      const repository = new ChatBanRepository();
      const result = await repository.findByEventId('event123');

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe('event123');
    });
  });

  describe('findActiveByUserId', () => {
    it('should return active ban for user', async () => {
      const mockBan: ChatBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Inappropriate behavior',
        banType: 'permanent',
        duration: undefined,
        expiresAt: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'ban123', data: () => ({ ...mockBan, createdAt: { toDate: () => mockBan.createdAt }, updatedAt: { toDate: () => mockBan.updatedAt }, expiresAt: undefined }) }],
      });

      const repository = new ChatBanRepository();
      const result = await repository.findActiveByUserId('user123');

      expect(result).toHaveProperty('id', 'ban123');
      expect(result?.banType).toBe('permanent');
    });

    it('should return null if no active ban found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const repository = new ChatBanRepository();
      const result = await repository.findActiveByUserId('user123');

      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('should deactivate a ban', async () => {
      const mockBan: ChatBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Inappropriate behavior',
        banType: 'temporary',
        duration: 3600,
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'ban123',
        data: () => ({ ...mockBan, createdAt: { toDate: () => mockBan.createdAt }, updatedAt: { toDate: () => mockBan.updatedAt }, expiresAt: { toDate: () => mockBan.expiresAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'ban123',
        data: () => ({ ...mockBan, isActive: false, createdAt: { toDate: () => mockBan.createdAt }, updatedAt: { toDate: () => mockBan.updatedAt }, expiresAt: { toDate: () => mockBan.expiresAt } }),
      });

      const repository = new ChatBanRepository();
      const result = await repository.deactivate('ban123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.isActive).toBe(false);
      }
    });
  });

  describe('delete', () => {
    it('should delete a ban', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.delete.mockResolvedValue(undefined);

      const repository = new ChatBanRepository();
      const result = await repository.delete('ban123');

      expect(result).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('chat_bans');
      expect(mockCollection.doc).toHaveBeenCalledWith('ban123');
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should return false if ban not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new ChatBanRepository();
      const result = await repository.delete('ban123');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredBans', () => {
    it('should cleanup expired bans', async () => {
      const mockBan: ChatBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Inappropriate behavior',
        banType: 'temporary',
        duration: 3600,
        expiresAt: new Date(Date.now() - 1000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'ban123', data: () => ({ ...mockBan, createdAt: { toDate: () => mockBan.createdAt }, updatedAt: { toDate: () => mockBan.updatedAt }, expiresAt: { toDate: () => mockBan.expiresAt } }), ref: mockDoc }],
      });

      const repository = new ChatBanRepository();
      const result = await repository.cleanupExpiredBans();

      expect(result).toBe(1);
    });

    it('should return 0 if no expired bans', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const repository = new ChatBanRepository();
      const result = await repository.cleanupExpiredBans();

      expect(result).toBe(0);
    });
  });
});
