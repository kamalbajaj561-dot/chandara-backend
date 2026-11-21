import { ChatService } from '../chat.service';
import { ChatRoomRepository } from '../../repositories/chatRoom.repository';
import { ChatMessageRepository } from '../../repositories/chatMessage.repository';
import { ChatReportRepository } from '../../repositories/chatReport.repository';
import { ChatBanRepository } from '../../repositories/chatBan.repository';
import { EventService } from '../event.service';
import { StreamService } from '../stream.service';
import { getCache, setCache } from '../redis';

jest.mock('../../repositories/chatRoom.repository');
jest.mock('../../repositories/chatMessage.repository');
jest.mock('../../repositories/chatReport.repository');
jest.mock('../../repositories/chatBan.repository');
jest.mock('../event.service');
jest.mock('../stream.service');
jest.mock('../redis');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockChatRoomRepository: jest.Mocked<ChatRoomRepository>;
  let mockChatMessageRepository: jest.Mocked<ChatMessageRepository>;
  let mockChatReportRepository: jest.Mocked<ChatReportRepository>;
  let mockChatBanRepository: jest.Mocked<ChatBanRepository>;
  let mockEventService: jest.Mocked<EventService>;
  let mockStreamService: jest.Mocked<StreamService>;

  beforeEach(() => {
    mockChatRoomRepository = new ChatRoomRepository() as jest.Mocked<ChatRoomRepository>;
    mockChatMessageRepository = new ChatMessageRepository() as jest.Mocked<ChatMessageRepository>;
    mockChatReportRepository = new ChatReportRepository() as jest.Mocked<ChatReportRepository>;
    mockChatBanRepository = new ChatBanRepository() as jest.Mocked<ChatBanRepository>;
    mockEventService = new EventService() as jest.Mocked<EventService>;
    mockStreamService = new StreamService() as jest.Mocked<StreamService>;

    (getCache as jest.Mock).mockResolvedValue({ data: null });
    (setCache as jest.Mock).mockResolvedValue(undefined);

    chatService = new ChatService(
      mockChatRoomRepository,
      mockChatMessageRepository,
      mockChatReportRepository,
      mockChatBanRepository,
      mockEventService,
      mockStreamService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
      };

      const mockMessage = {
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

      mockEventService.getEvent.mockResolvedValue({ creatorUid: 'creator123' } as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockStreamService.getStream.mockResolvedValue({ streamId: 'stream123' } as any);
      mockChatMessageRepository.create.mockResolvedValue(mockMessage as any);
      mockChatRoomRepository.incrementMessageCount.mockResolvedValue(mockRoom as any);

      const result = await chatService.sendMessage(
        'event123',
        'user123',
        'Test User',
        'viewer',
        'Hello world',
        'text'
      );

      expect(result).toBeDefined();
      expect(result.message).toBe('Hello world');
      expect(mockChatMessageRepository.create).toHaveBeenCalled();
    });

    it('should throw error if chat is disabled', async () => {
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        chatEnabled: false,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
      };

      mockEventService.getEvent.mockResolvedValue({ creatorUid: 'creator123' } as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);

      await expect(
        chatService.sendMessage('event123', 'user123', 'Test User', 'viewer', 'Hello world', 'text')
      ).rejects.toThrow('Chat is disabled for this event');
    });

    it('should throw error if user is banned', async () => {
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: ['user123'],
        mutedUsers: [],
        messageCount: 0,
        activeUsers: 0,
      };

      mockEventService.getEvent.mockResolvedValue({ creatorUid: 'creator123' } as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);

      await expect(
        chatService.sendMessage('event123', 'user123', 'Test User', 'viewer', 'Hello world', 'text')
      ).rejects.toThrow('You are banned from this chat');
    });

    it('should throw error if user is muted', async () => {
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        slowMode: false,
        chatEnabled: true,
        subscriberOnly: false,
        followersOnly: false,
        moderators: [],
        bannedUsers: [],
        mutedUsers: ['user123'],
        messageCount: 0,
        activeUsers: 0,
      };

      mockEventService.getEvent.mockResolvedValue({ creatorUid: 'creator123' } as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);

      await expect(
        chatService.sendMessage('event123', 'user123', 'Test User', 'viewer', 'Hello world', 'text')
      ).rejects.toThrow('You are muted in this chat');
    });
  });

  describe('editMessage', () => {
    it('should edit a message successfully', async () => {
      const mockMessage = {
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

      const updatedMessage = {
        ...mockMessage,
        message: 'Updated message',
        isEdited: true,
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage as any);
      mockChatMessageRepository.editMessage.mockResolvedValue(updatedMessage as any);

      const result = await chatService.editMessage('msg123', 'user123', 'Updated message');

      expect(result).toBeDefined();
      expect(result?.message).toBe('Updated message');
      expect(result?.isEdited).toBe(true);
    });

    it('should throw error if message not found', async () => {
      mockChatMessageRepository.findByMessageId.mockResolvedValue(null);

      await expect(
        chatService.editMessage('msg123', 'user123', 'Updated message')
      ).rejects.toThrow('Message not found');
    });

    it('should throw error if user is not the sender', async () => {
      const mockMessage = {
        id: 'msg123',
        messageId: 'msg123',
        eventId: 'event123',
        streamId: 'stream123',
        senderId: 'user456',
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

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage as any);

      await expect(
        chatService.editMessage('msg123', 'user123', 'Updated message')
      ).rejects.toThrow('You can only edit your own messages');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message successfully', async () => {
      const mockMessage = {
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

      const deletedMessage = {
        ...mockMessage,
        isDeleted: true,
        message: '',
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage as any);
      mockChatMessageRepository.deleteMessage.mockResolvedValue(deletedMessage as any);

      const result = await chatService.deleteMessage('msg123', 'user123', 'viewer');

      expect(result).toBeDefined();
      expect(result?.isDeleted).toBe(true);
    });
  });

  describe('pinMessage', () => {
    it('should pin a message successfully', async () => {
      const mockMessage = {
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

      const pinnedMessage = {
        ...mockMessage,
        isPinned: true,
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage as any);
      mockChatMessageRepository.pinMessage.mockResolvedValue(pinnedMessage as any);

      const result = await chatService.pinMessage('msg123', 'user123', 'moderator');

      expect(result).toBeDefined();
      expect(result?.isPinned).toBe(true);
    });

    it('should throw error for non-moderator', async () => {
      const mockMessage = {
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

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage as any);

      await expect(
        chatService.pinMessage('msg123', 'user123', 'viewer')
      ).rejects.toThrow('Only moderators can pin messages');
    });
  });

  describe('reportMessage', () => {
    it('should report a message successfully', async () => {
      const mockMessage = {
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

      const mockReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user123',
        reportedUserName: 'Test User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatMessageRepository.findByMessageId.mockResolvedValue(mockMessage as any);
      mockChatReportRepository.create.mockResolvedValue(mockReport as any);

      const result = await chatService.reportMessage(
        'msg123',
        'user123',
        'Test User',
        'Inappropriate content',
        'Message contains offensive language'
      );

      expect(result).toBeDefined();
      expect(result?.reason).toBe('Inappropriate content');
      expect(mockChatReportRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateSlowMode', () => {
    it('should update slow mode settings', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
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
      };

      const updatedRoom = {
        ...mockRoom,
        slowMode: true,
        slowModeInterval: 30,
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockChatRoomRepository.updateSlowMode.mockResolvedValue(updatedRoom as any);

      const result = await chatService.updateSlowMode('event123', true, 30, 'creator123', 'creator');

      expect(result).toBeDefined();
      expect(result?.slowMode).toBe(true);
      expect(result?.slowModeInterval).toBe(30);
    });

    it('should throw error for non-creator', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
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
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);

      await expect(
        chatService.updateSlowMode('event123', true, 30, 'user456', 'viewer')
      ).rejects.toThrow('Only the event creator can update slow mode');
    });
  });
});
