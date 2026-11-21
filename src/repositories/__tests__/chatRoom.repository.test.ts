import { ChatRoomRepository } from '../chatRoom.repository';
import { getFirestore } from '../../services/firebase';
import { ChatRoom } from '../../types';

jest.mock('../../services/firebase');

describe('ChatRoomRepository', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockTimestamp: any;

  beforeEach(() => {
    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      data: jest.fn(),
    };
    mockCollection = {
      doc: jest.fn(() => mockDoc),
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
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new chat room', async () => {
      const mockRoom: Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'> = {
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
      };

      const createdDoc = {
        id: 'room123',
        exists: true,
        data: () => ({ ...mockRoom, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
      };

      mockCollection.add.mockResolvedValue({ id: 'room123' });
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.get.mockResolvedValue(createdDoc);

      const repository = new ChatRoomRepository();
      const result = await repository.create(mockRoom);

      expect(result).toBeDefined();
      expect(result.eventId).toBe('event123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_rooms');
    });
  });

  describe('findById', () => {
    it('should return chat room if found', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'room123',
        data: () => ({ ...mockRoom, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.findById('room123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('room123');
      expect(result?.eventId).toBe('event123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_rooms');
    });

    it('should return null if room not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new ChatRoomRepository();
      const result = await repository.findById('room123');

      expect(result).toBeNull();
    });
  });

  describe('findByEventId', () => {
    it('should return chat room by event ID', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'room123', data: () => ({ ...mockRoom, createdAt: mockTimestamp, updatedAt: mockTimestamp }) }],
      });

      const repository = new ChatRoomRepository();
      const result = await repository.findByEventId('event123');

      expect(result).not.toBeNull();
      expect(result?.eventId).toBe('event123');
      expect(mockCollection.where).toHaveBeenCalledWith('eventId', '==', 'event123');
    });

    it('should return null if room not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const repository = new ChatRoomRepository();
      const result = await repository.findByEventId('event123');

      expect(result).toBeNull();
    });
  });

  describe('updateSlowMode', () => {
    it('should update slow mode settings', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, slowMode: true, slowModeInterval: 30, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.updateSlowMode('room123', true, 30);

      expect(result).toBeDefined();
      if (result) {
        expect(result.slowMode).toBe(true);
        expect(result.slowModeInterval).toBe(30);
      }
    });
  });

  describe('toggleChatEnabled', () => {
    it('should toggle chat enabled status', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, chatEnabled: false, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.toggleChatEnabled('room123', false);

      expect(result).toBeDefined();
      if (result) {
        expect(result.chatEnabled).toBe(false);
      }
    });
  });

  describe('addModerator', () => {
    it('should add a moderator to the room', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, moderators: ['mod123'], createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.addModerator('room123', 'mod123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.moderators).toContain('mod123');
      }
    });
  });

  describe('removeModerator', () => {
    it('should remove a moderator from the room', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: ['mod123'],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, moderators: [], createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.removeModerator('room123', 'mod123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.moderators).not.toContain('mod123');
      }
    });
  });

  describe('addBannedUser', () => {
    it('should add a banned user to the room', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, bannedUsers: ['user123'], createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.addBannedUser('room123', 'user123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.bannedUsers).toContain('user123');
      }
    });
  });

  describe('incrementMessageCount', () => {
    it('should increment message count', async () => {
      const mockRoom: ChatRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        slowModeInterval: 10,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockRoom, messageCount: 1, createdAt: { toDate: () => mockRoom.createdAt }, updatedAt: { toDate: () => mockRoom.updatedAt } }),
      });

      const repository = new ChatRoomRepository();
      const result = await repository.incrementMessageCount('room123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.messageCount).toBe(1);
      }
    });
  });
});
