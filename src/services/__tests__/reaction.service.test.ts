import { ReactionService } from '../reaction.service';
import { ChatMessageRepository } from '../../repositories/chatMessage.repository';
import { ChatMessage } from '../../types';

jest.mock('../../repositories/chatMessage.repository');

describe('ReactionService', () => {
  let reactionService: ReactionService;
  let mockChatMessageRepository: jest.Mocked<ChatMessageRepository>;

  beforeEach(() => {
    mockChatMessageRepository = new ChatMessageRepository() as jest.Mocked<ChatMessageRepository>;
    reactionService = new ReactionService(mockChatMessageRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      const updatedMessage: ChatMessage = {
        ...mockMessage,
        reactions: [
          {
            emoji: '👍',
            userId: 'user123',
            userName: 'Test User',
            timestamp: new Date(),
          },
        ],
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);
      mockChatMessageRepository.addReaction.mockResolvedValue(updatedMessage);

      const result = await reactionService.addReaction('msg123', 'user123', 'Test User', '👍');

      expect(result).toBeDefined();
      expect(result?.reactions).toHaveLength(1);
      expect(result?.reactions[0].emoji).toBe('👍');
      expect(mockChatMessageRepository.addReaction).toHaveBeenCalledWith(
        'msg123',
        { emoji: '👍', userId: 'user123', userName: 'Test User', timestamp: expect.any(Date) }
      );
    });

    it('should throw error if message not found', async () => {
      mockChatMessageRepository.findByMessageId.mockResolvedValue(null);

      await expect(
        reactionService.addReaction('msg123', 'user123', 'Test User', '👍')
      ).rejects.toThrow('Message not found');
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a message', async () => {
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
        reactions: [
          {
            emoji: '👍',
            userId: 'user123',
            userName: 'Test User',
            timestamp: new Date(),
          },
        ],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMessage: ChatMessage = {
        ...mockMessage,
        reactions: [],
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);
      mockChatMessageRepository.removeReaction.mockResolvedValue(updatedMessage);

      const result = await reactionService.removeReaction('msg123', 'user123', '👍');

      expect(result).toBeDefined();
      expect(result?.reactions).toHaveLength(0);
      expect(mockChatMessageRepository.removeReaction).toHaveBeenCalledWith('msg123', '👍', 'user123');
    });

    it('should throw error if message not found', async () => {
      mockChatMessageRepository.findByMessageId.mockResolvedValue(null);

      await expect(
        reactionService.removeReaction('msg123', 'user123', '👍')
      ).rejects.toThrow('Message not found');
    });
  });

  describe('getMessageReactions', () => {
    it('should return reactions for a message', async () => {
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
        reactions: [
          {
            emoji: '👍',
            userId: 'user123',
            userName: 'Test User',
            timestamp: new Date(),
          },
          {
            emoji: '❤️',
            userId: 'user456',
            userName: 'Another User',
            timestamp: new Date(),
          },
        ],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);

      const result = await reactionService.getMessageReactions('msg123');

      expect(result).toHaveLength(2);
      expect(result[0].emoji).toBe('👍');
      expect(result[1].emoji).toBe('❤️');
    });

    it('should return empty array if message not found', async () => {
      mockChatMessageRepository.findByMessageId.mockResolvedValue(null);

      await expect(
        reactionService.getMessageReactions('msg123')
      ).rejects.toThrow('Message not found');
    });
  });

  describe('getReactionCount', () => {
    it('should return reaction count for a message', async () => {
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
        reactions: [
          {
            emoji: '👍',
            userId: 'user123',
            userName: 'Test User',
            timestamp: new Date(),
          },
          {
            emoji: '👍',
            userId: 'user456',
            userName: 'Another User',
            timestamp: new Date(),
          },
          {
            emoji: '❤️',
            userId: 'user789',
            userName: 'Third User',
            timestamp: new Date(),
          },
        ],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);

      const result = await reactionService.getReactionCount('msg123', '👍');

      expect(result).toEqual(2);
    });

    it('should return empty object if message not found', async () => {
      mockChatMessageRepository.findByMessageId.mockResolvedValue(null);

      await expect(
        reactionService.getReactionCount('msg123', '👍')
      ).rejects.toThrow('Message not found');
    });
  });

  describe('getUserReactions', () => {
    it('should return reactions by a specific user', async () => {
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
        reactions: [
          {
            emoji: '👍',
            userId: 'user123',
            userName: 'Test User',
            timestamp: new Date(),
          },
          {
            emoji: '❤️',
            userId: 'user456',
            userName: 'Another User',
            timestamp: new Date(),
          },
        ],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);

      const result = await reactionService.getUserReactions('user123', 'msg123');

      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe('👍');
      expect(result[0].userId).toBe('user123');
    });

    it('should return empty array if user has no reactions', async () => {
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
        reactions: [
          {
            emoji: '❤️',
            userId: 'user456',
            userName: 'Another User',
            timestamp: new Date(),
          },
        ],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage);

      const result = await reactionService.getUserReactions('msg123', 'user123');

      expect(result).toEqual([]);
    });
  });
});
