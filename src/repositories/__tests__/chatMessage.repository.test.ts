import { ChatMessageRepository } from '../chatMessage.repository';
import { getFirestore } from '../../services/firebase';
import { ChatMessage } from '../../types';

jest.mock('../../services/firebase');

describe('ChatMessageRepository', () => {
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
    it('should create a new chat message', async () => {
      const mockMessage: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'> = {
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
      };

      const createdDoc = {
        id: 'msg123',
        exists: true,
        data: () => ({ ...mockMessage, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
      };

      mockCollection.add.mockResolvedValue({ id: 'msg123' });
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.get.mockResolvedValue(createdDoc);

      const repository = new ChatMessageRepository();
      const result = await repository.create(mockMessage);

      expect(result).toBeDefined();
      expect(result.messageId).toBe('msg123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_messages');
    });
  });

  describe('findById', () => {
    it('should return message if found', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'msg123',
        data: () => ({ ...mockMessage, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
      });

      const repository = new ChatMessageRepository();
      const result = await repository.findById('msg123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('msg123');
      expect(result?.messageId).toBe('msg123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_messages');
    });

    it('should return null if message not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new ChatMessageRepository();
      const result = await repository.findById('msg123');

      expect(result).toBeNull();
    });
  });

  describe('findByMessageId', () => {
    it('should return message by message ID', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'msg123', data: () => ({ ...mockMessage, createdAt: mockTimestamp, updatedAt: mockTimestamp }) }],
      });

      const repository = new ChatMessageRepository();
      const result = await repository.findByMessageId('msg123');

      expect(result).not.toBeNull();
      expect(result?.messageId).toBe('msg123');
      expect(mockCollection.where).toHaveBeenCalledWith('messageId', '==', 'msg123');
    });

    it('should return null if message not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const repository = new ChatMessageRepository();
      const result = await repository.findByMessageId('msg123');

      expect(result).toBeNull();
    });
  });

  describe('findByEventId', () => {
    it('should return messages by event ID', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg1',
          messageId: 'msg1',
          eventId: 'event123',
          streamId: 'stream123',
          senderId: 'user123',
          senderName: 'Test User',
          senderRole: 'viewer',
          message: 'Hello',
          messageType: 'text',
          reactions: [],
          isPinned: false,
          isDeleted: false,
          isEdited: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockMessages.map(msg => ({
          data: () => ({ ...msg, createdAt: { toDate: () => msg.createdAt }, updatedAt: { toDate: () => msg.updatedAt } }),
        })),
      });

      const repository = new ChatMessageRepository();
      const result = await repository.findByEventId('event123');

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe('event123');
    });
  });

  describe('editMessage', () => {
    it('should edit a message', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, message: 'Updated message', isEdited: true, createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });

      const repository = new ChatMessageRepository();
      const result = await repository.editMessage('msg123', 'Updated message');

      expect(result).toBeDefined();
      if (result) {
        expect(result.message).toBe('Updated message');
        expect(result.isEdited).toBe(true);
      }
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, isDeleted: true, message: '', createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });

      const repository = new ChatMessageRepository();
      const result = await repository.deleteMessage('msg123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.isDeleted).toBe(true);
      }
    });
  });

  describe('addReaction', () => {
    it('should add a reaction to a message', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, reactions: [{ emoji: '👍', userId: 'user123', userName: 'Test User', timestamp: new Date() }], createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });

      const repository = new ChatMessageRepository();
      const result = await repository.addReaction('msg123', { emoji: '👍', userId: 'user123', userName: 'Test User', timestamp: new Date() });

      expect(result).toBeDefined();
      if (result) {
        expect(result.reactions).toHaveLength(1);
      }
    });
  });

  describe('pinMessage', () => {
    it('should pin a message', async () => {
      const mockMessage: ChatMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user123',
        senderName: 'Test User',
        senderRole: 'viewer',
        message: 'Hello world',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockMessage, isPinned: true, createdAt: { toDate: () => mockMessage.createdAt }, updatedAt: { toDate: () => mockMessage.updatedAt } }),
      });

      const repository = new ChatMessageRepository();
      const result = await repository.pinMessage('msg123', true);

      expect(result).toBeDefined();
      if (result) {
        expect(result.isPinned).toBe(true);
      }
    });
  });
});
