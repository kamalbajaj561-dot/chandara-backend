import { Request, Response, NextFunction } from 'express';
import { ChatController } from '../chat.controller';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../services/chat.service');
jest.mock('../../services/moderation.service');
jest.mock('../../services/reaction.service');
jest.mock('../../services/spamDetection.service');
jest.mock('../../services/typing.service');
jest.mock('../../services/chatReplay.service');

describe('ChatController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let controller: ChatController;
  let mockChatService: any;
  let mockModerationService: any;
  let mockReactionService: any;
  let mockTypingService: any;
  let mockChatReplayService: any;

  beforeEach(() => {
    // Mock all services
    mockChatService = {
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
      editMessage: jest.fn(),
      deleteMessage: jest.fn(),
      pinMessage: jest.fn(),
      reportMessage: jest.fn(),
      getChatRoom: jest.fn(),
      updateSlowMode: jest.fn(),
      toggleChatEnabled: jest.fn(),
      setSubscriberOnly: jest.fn(),
      setFollowersOnly: jest.fn(),
      addModerator: jest.fn(),
      removeModerator: jest.fn(),
      getPinnedMessages: jest.fn(),
      searchMessages: jest.fn(),
    };

    mockModerationService = {
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      timeoutUser: jest.fn(),
      banUser: jest.fn(),
      unbanUser: jest.fn(),
      getModerationData: jest.fn(),
    };

    mockReactionService = {
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
    };

    const mockSpamDetectionService: any = {
      detectSpam: jest.fn().mockResolvedValue({ isSpam: false }),
      logSuspiciousActivity: jest.fn().mockResolvedValue(undefined),
    };

    mockTypingService = {
      getTypingUsers: jest.fn(),
      setTyping: jest.fn(),
      clearTyping: jest.fn(),
    };

    mockChatReplayService = {
      getPaginatedMessages: jest.fn(),
    };

    controller = new ChatController(
      mockChatService,
      mockModerationService,
      mockReactionService,
      mockSpamDetectionService,
      mockTypingService,
      mockChatReplayService
    );

    mockReq = { body: {}, params: {}, user: { id: 'user123', userId: 'user123', displayName: 'Test User', username: 'testuser', role: 'viewer', email: 'test@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 } as any };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
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

      mockChatService.sendMessage.mockResolvedValue(mockMessage);
      mockReq.params = { eventId: 'event123' };
      mockReq.body = {
        eventId: 'event123',
        message: 'Hello world',
        messageType: 'text',
      };

      await controller.sendMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message sent successfully',
      });
    });

    it('should handle send message errors', async () => {
      const error = new AppError('Chat is disabled', 403);
      mockChatService.sendMessage.mockRejectedValue(error);
      mockReq.body = {
        eventId: 'event123',
        message: 'Hello world',
      };

      await controller.sendMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
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
        message: 'Updated message',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: false,
        isEdited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatService.editMessage.mockResolvedValue(mockMessage);
      mockReq.params = { id: 'msg123' };
      mockReq.body = {
        message: 'Updated message',
      };

      await controller.editMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message edited successfully',
      });
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
        message: '',
        messageType: 'text',
        reactions: [],
        isPinned: false,
        isDeleted: true,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatService.deleteMessage.mockResolvedValue(mockMessage);
      mockReq.params = { id: 'msg123' };

      await controller.deleteMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message deleted successfully',
      });
    });
  });

  describe('addReaction', () => {
    it('should add a reaction successfully', async () => {
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
        reactions: [{ emoji: '👍', userId: 'user123', userName: 'Test User', timestamp: new Date() }],
        isPinned: false,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReactionService.addReaction.mockResolvedValue(mockMessage);
      mockReq.params = { id: 'msg123' };
      mockReq.body = {
        emoji: '👍',
      };

      await controller.addReaction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Reaction added successfully',
      });
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction successfully', async () => {
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

      mockReactionService.removeReaction.mockResolvedValue(mockMessage);
      mockReq.params = { id: 'msg123' };
      mockReq.body = {
        emoji: '👍',
      };

      await controller.removeReaction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Reaction removed successfully',
      });
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
        isPinned: true,
        isDeleted: false,
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatService.pinMessage.mockResolvedValue(mockMessage);
      mockReq.params = { id: 'msg123' };

      await controller.pinMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
        message: 'Message pinned successfully',
      });
    });
  });

  describe('reportMessage', () => {
    it('should report a message successfully', async () => {
      const mockReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatService.reportMessage.mockResolvedValue(mockReport);
      mockReq.body = {
        messageId: 'msg123',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
      };

      await controller.reportMessage(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        message: 'Report submitted successfully',
      });
    });
  });

  describe('muteUser', () => {
    it('should mute a user successfully', async () => {
      mockReq.user = { userId: 'mod123', role: 'moderator', email: 'mod@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        userId: 'user456',
        reason: 'Spam',
      };

      mockModerationService.muteUser.mockResolvedValue(undefined);

      await controller.muteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User muted successfully',
      });
    });
  });

  describe('unmuteUser', () => {
    it('should unmute a user successfully', async () => {
      mockReq.user = { userId: 'mod123', role: 'moderator', email: 'mod@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        userId: 'user456',
      };

      mockModerationService.unmuteUser.mockResolvedValue(undefined);

      await controller.unmuteUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User unmuted successfully',
      });
    });
  });

  describe('timeoutUser', () => {
    it('should timeout a user successfully', async () => {
      mockReq.user = { userId: 'mod123', role: 'moderator', email: 'mod@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        userId: 'user456',
        userName: 'User to timeout',
        duration: 3600,
        reason: 'Spam',
      };

      mockModerationService.timeoutUser.mockResolvedValue(undefined);

      await controller.timeoutUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User timed out successfully',
      });
    });
  });

  describe('banUser', () => {
    it('should ban a user successfully', async () => {
      mockReq.user = { userId: 'mod123', role: 'moderator', email: 'mod@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        userId: 'user456',
        userName: 'User to ban',
        reason: 'Harassment',
      };

      mockModerationService.banUser.mockResolvedValue(undefined);

      await controller.banUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User banned successfully',
      });
    });
  });

  describe('unbanUser', () => {
    it('should unban a user successfully', async () => {
      mockReq.user = { userId: 'mod123', role: 'moderator', email: 'mod@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        userId: 'user456',
      };

      mockModerationService.unbanUser.mockResolvedValue(undefined);

      await controller.unbanUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User unbanned successfully',
      });
    });
  });

  describe('updateSlowMode', () => {
    it('should update slow mode successfully', async () => {
      mockReq.user = { userId: 'creator123', role: 'creator', email: 'creator@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.params = { eventId: 'event123' };
      mockReq.body = {
        slowMode: true,
        interval: 30,
      };

      mockChatService.updateSlowMode.mockResolvedValue(undefined);

      await controller.updateSlowMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Slow mode updated successfully',
      });
    });
  });

  describe('toggleChatEnabled', () => {
    it('should toggle chat enabled status successfully', async () => {
      mockReq.user = { userId: 'creator123', role: 'creator', email: 'creator@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.params = { eventId: 'event123' };
      mockReq.body = {
        enabled: false,
      };

      mockChatService.toggleChatEnabled.mockResolvedValue(undefined);

      await controller.toggleChatEnabled(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: undefined,
        message: expect.stringMatching(/Chat (enabled|disabled) successfully/),
      });
    });
  });

  describe('setSubscriberOnly', () => {
    it('should set subscriber only mode successfully', async () => {
      mockReq.user = { userId: 'creator123', role: 'creator', email: 'creator@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.params = { eventId: 'event123' };
      mockReq.body = {
        subscriberOnly: true,
      };

      mockChatService.setSubscriberOnly.mockResolvedValue(undefined);

      await controller.setSubscriberOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: undefined,
        message: 'Subscriber-only mode updated successfully',
      });
    });
  });

  describe('setFollowersOnly', () => {
    it('should set followers only mode successfully', async () => {
      mockReq.user = { userId: 'creator123', role: 'creator', email: 'creator@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.params = { eventId: 'event123' };
      mockReq.body = {
        followersOnly: true,
      };

      mockChatService.setFollowersOnly.mockResolvedValue(undefined);

      await controller.setFollowersOnly(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: undefined,
        message: 'Followers-only mode updated successfully',
      });
    });
  });

  describe('addModerator', () => {
    it('should add a moderator successfully', async () => {
      mockReq.user = { userId: 'creator123', role: 'creator', email: 'creator@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        moderatorId: 'mod456',
      };

      mockChatService.addModerator.mockResolvedValue(undefined);

      await controller.addModerator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Moderator added successfully',
      });
    });
  });

  describe('removeModerator', () => {
    it('should remove a moderator successfully', async () => {
      mockReq.user = { userId: 'creator123', role: 'creator', email: 'creator@example.com', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        eventId: 'event123',
        moderatorId: 'mod456',
      };

      mockChatService.removeModerator.mockResolvedValue(undefined);

      await controller.removeModerator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Moderator removed successfully',
      });
    });
  });

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      const mockMessages = [
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

      mockChatService.getMessages.mockResolvedValue(mockMessages);
      mockReq.params = { eventId: 'event123' };
      mockReq.query = {};

      await controller.getMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
      });
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const mockMessages = [
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

      mockChatService.searchMessages.mockResolvedValue(mockMessages);
      mockReq.params = { eventId: 'event123' };
      mockReq.query = { q: 'world' };

      await controller.searchMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
      });
    });
  });

  describe('setTyping', () => {
    it('should set typing status successfully', async () => {
      mockTypingService.setTyping.mockResolvedValue(undefined);
      mockReq.params = {
        eventId: 'event123',
      };

      await controller.setTyping(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Typing indicator set',
      });
    });
  });

  describe('getTypingUsers', () => {
    it('should get typing users successfully', async () => {
      const typingUsers = [
        { userId: 'user123', userName: 'Test User', timestamp: Date.now() },
      ];

      mockTypingService.getTypingUsers.mockResolvedValue(typingUsers);
      mockReq.params = { eventId: 'event123' };

      await controller.getTypingUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: typingUsers,
      });
    });
  });

  describe('getChatRoom', () => {
    it('should get chat room successfully', async () => {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatService.getChatRoom.mockResolvedValue(mockRoom);
      mockReq.params = { eventId: 'event123' };

      await controller.getChatRoom(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoom,
      });
    });
  });

  describe('getPaginatedMessages', () => {
    it('should get paginated replay messages successfully', async () => {
      const mockMessages = [
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

      mockChatReplayService.getPaginatedMessages.mockResolvedValue({
        messages: mockMessages,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
      mockReq.params = { eventId: 'event123' };
      mockReq.query = { page: '1', limit: '10' };

      await controller.getPaginatedMessages(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
    });
  });
});
