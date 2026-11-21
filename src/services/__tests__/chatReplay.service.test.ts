import { ChatReplayService } from '../chatReplay.service';
import { ChatMessageRepository } from '../../repositories/chatMessage.repository';
import { ChatMessage } from '../../types';
import { getCache, setCache, deleteCache } from '../redis';

jest.mock('../../repositories/chatMessage.repository');
jest.mock('../redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
}));

describe('ChatReplayService', () => {
  let chatReplayService: ChatReplayService;
  let mockChatMessageRepository: jest.Mocked<ChatMessageRepository>;

  beforeEach(() => {
    mockChatMessageRepository = new ChatMessageRepository() as jest.Mocked<ChatMessageRepository>;
    chatReplayService = new ChatReplayService(mockChatMessageRepository);
    jest.clearAllMocks();
    // Mock cache functions to return proper structure
    (getCache as jest.Mock).mockResolvedValue({ data: null });
    (setCache as jest.Mock).mockResolvedValue(undefined);
    (deleteCache as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getRecentMessages', () => {
    it('should return recent messages for event', async () => {
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

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getRecentMessages('event123', 50);

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 50);
    });
  });

  describe('getMessagesBefore', () => {
    it('should return messages before a specific date', async () => {
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

      const beforeDate = new Date();
      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getMessagesBefore('event123', beforeDate, 50);

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 50, expect.any(Date));
    });
  });

  describe('getMessagesAfter', () => {
    it('should return messages after a specific date', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
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
          createdAt: new Date(), // Current time
          updatedAt: new Date(),
        },
      ];

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getMessagesAfter('event123', pastDate, 50);

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 100);
    });
  });

  describe('getMessagesInRange', () => {
    it('should return messages between two dates', async () => {
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

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getMessagesInRange('event123', new Date(Date.now() - 3600000), new Date());

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 200);
    });
  });

  describe('getMessagesByUser', () => {
    it('should return messages by a specific user', async () => {
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

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getMessagesByUser('event123', 'user123');

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 250);
    });
  });

  describe('getRepliedMessages', () => {
    it('should return replied messages', async () => {
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
          replyTo: 'parent-msg',
        },
      ];

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getRepliedMessages('event123', 'parent-msg');

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 100);
    });
  });

  describe('getMessageContext', () => {
    it('should return message context around a specific message', async () => {
      const mockMessage: ChatMessage = {
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
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);
      mockChatMessageRepository.findByEventId.mockResolvedValue([mockMessage]);
      const result = await chatReplayService.getMessageContext('event123', 'msg1', 5);

      expect(result.message).toEqual(mockMessage);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 100);
    });
  });

  describe('getPaginatedMessages', () => {
    it('should return paginated messages', async () => {
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

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getPaginatedMessages('event123', 1, 20);

      expect(result.messages).toEqual(mockMessages);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 20);
    });
  });

  describe('searchMessages', () => {
    it('should return messages matching search query', async () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg1',
          messageId: 'msg1',
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
        },
      ];

      mockChatMessageRepository.searchMessages.mockResolvedValue(mockMessages);
      const result = await chatReplayService.searchMessages('event123', 'world');

      expect(result).toEqual(mockMessages);
      expect(mockChatMessageRepository.searchMessages).toHaveBeenCalledWith('event123', 'world', 50);
    });
  });

  describe('getMessageCount', () => {
    it('should return message count for event', async () => {
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

      mockChatMessageRepository.findByEventId.mockResolvedValue(mockMessages);
      const result = await chatReplayService.getMessageCount('event123');

      expect(result).toBe(1);
      expect(mockChatMessageRepository.findByEventId).toHaveBeenCalledWith('event123', 1000);
    });
  });

  describe('clearCache', () => {
    it('should clear message cache for event', async () => {
      await chatReplayService.clearCache('event123');
      expect(setCache).toHaveBeenCalledWith('chat:event123:pagination:total', 0, 0);
      expect(setCache).toHaveBeenCalledWith('chat:event123:message_count', 0, 0);
    });
  });
});
