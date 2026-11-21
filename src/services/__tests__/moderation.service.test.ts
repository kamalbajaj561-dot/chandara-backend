import { ModerationService } from '../moderation.service';
import { ChatRoomRepository } from '../../repositories/chatRoom.repository';
import { ChatBanRepository } from '../../repositories/chatBan.repository';
import { ChatReportRepository } from '../../repositories/chatReport.repository';
import { ChatMessageRepository } from '../../repositories/chatMessage.repository';
import { EventService } from '../event.service';
import { getCache, setCache } from '../redis';

jest.mock('../../repositories/chatRoom.repository');
jest.mock('../../repositories/chatBan.repository');
jest.mock('../../repositories/chatReport.repository');
jest.mock('../../repositories/chatMessage.repository');
jest.mock('../event.service');
jest.mock('../redis');

describe('ModerationService', () => {
  let moderationService: ModerationService;
  let mockChatRoomRepository: jest.Mocked<ChatRoomRepository>;
  let mockChatBanRepository: jest.Mocked<ChatBanRepository>;
  let mockChatReportRepository: jest.Mocked<ChatReportRepository>;
  let mockChatMessageRepository: jest.Mocked<ChatMessageRepository>;
  let mockEventService: jest.Mocked<EventService>;

  beforeEach(() => {
    mockChatRoomRepository = new ChatRoomRepository() as jest.Mocked<ChatRoomRepository>;
    mockChatBanRepository = new ChatBanRepository() as jest.Mocked<ChatBanRepository>;
    mockChatReportRepository = new ChatReportRepository() as jest.Mocked<ChatReportRepository>;
    mockChatMessageRepository = new ChatMessageRepository() as jest.Mocked<ChatMessageRepository>;
    mockEventService = new EventService() as jest.Mocked<EventService>;

    (getCache as jest.Mock).mockResolvedValue({ data: null });
    (setCache as jest.Mock).mockResolvedValue(undefined);

    moderationService = new ModerationService(
      mockChatRoomRepository,
      mockChatBanRepository,
      mockChatReportRepository,
      mockChatMessageRepository,
      mockEventService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('muteUser', () => {
    it('should mute a user successfully', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: ['mod123'],
        bannedUsers: [],
        mutedUsers: [],
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockChatRoomRepository.addMutedUser.mockResolvedValue(mockRoom as any);

      await moderationService.muteUser('event123', 'user123', 'mod123', 'Moderator', 'moderator');

      expect(mockChatRoomRepository.addMutedUser).toHaveBeenCalledWith('room123', 'user123');
    });

    it('should throw error for non-moderator', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: [],
        bannedUsers: [],
        mutedUsers: [],
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);

      await expect(
        moderationService.muteUser('event123', 'user123', 'user456', 'User', 'viewer')
      ).rejects.toThrow('Only moderators can mute users');
    });
  });

  describe('unmuteUser', () => {
    it('should unmute a user successfully', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: ['mod123'],
        bannedUsers: [],
        mutedUsers: ['user123'],
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockChatRoomRepository.removeMutedUser.mockResolvedValue(mockRoom as any);

      await moderationService.unmuteUser('event123', 'user123', 'mod123', 'moderator');

      expect(mockChatRoomRepository.removeMutedUser).toHaveBeenCalledWith('room123', 'user123');
    });
  });

  describe('timeoutUser', () => {
    it('should timeout a user successfully', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: ['mod123'],
        bannedUsers: [],
        mutedUsers: [],
      };

      const mockBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Spam',
        banType: 'temporary',
        duration: 3600,
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockChatBanRepository.create.mockResolvedValue(mockBan as any);
      mockChatRoomRepository.addBannedUser.mockResolvedValue(mockRoom as any);

      const result = await moderationService.timeoutUser(
        'event123',
        'user123',
        'Test User',
        3600,
        'Spam',
        'mod123',
        'Moderator',
        'moderator'
      );

      expect(result).toBeDefined();
      expect(result?.banType).toBe('temporary');
      expect(mockChatBanRepository.create).toHaveBeenCalled();
    });
  });

  describe('banUser', () => {
    it('should ban a user successfully', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: ['mod123'],
        bannedUsers: [],
        mutedUsers: [],
      };

      const mockBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Harassment',
        banType: 'permanent',
        duration: undefined,
        expiresAt: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockChatBanRepository.create.mockResolvedValue(mockBan as any);
      mockChatRoomRepository.addBannedUser.mockResolvedValue(mockRoom as any);

      const result = await moderationService.banUser(
        'event123',
        'user123',
        'Test User',
        'Harassment',
        'mod123',
        'Moderator',
        'moderator'
      );

      expect(result).toBeDefined();
      expect(result?.banType).toBe('permanent');
    });
  });

  describe('unbanUser', () => {
    it('should unban a user successfully', async () => {
      const mockEvent = { creatorUid: 'creator123' };
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: ['mod123'],
        bannedUsers: ['user123'],
        mutedUsers: [],
      };

      const mockBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Harassment',
        banType: 'permanent',
        duration: undefined,
        expiresAt: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);
      mockChatBanRepository.findActiveByUserId.mockResolvedValue(mockBan as any);
      mockChatRoomRepository.removeBannedUser.mockResolvedValue(mockRoom as any);
      mockChatBanRepository.deactivate.mockResolvedValue(mockBan as any);

      await moderationService.unbanUser('event123', 'user123', 'mod123', 'moderator');

      expect(mockChatBanRepository.deactivate).toHaveBeenCalledWith('ban123');
    });
  });

  describe('isUserBanned', () => {
    it('should return true if user is banned', async () => {
      const mockBan = {
        id: 'ban123',
        banId: 'ban123',
        eventId: 'event123',
        userId: 'user123',
        userName: 'Test User',
        bannedBy: 'mod123',
        bannedByName: 'Moderator',
        reason: 'Harassment',
        banType: 'permanent',
        duration: undefined,
        expiresAt: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockChatBanRepository.findActiveByUserId.mockResolvedValue(mockBan as any);

      const result = await moderationService.isUserBanned('event123', 'user123');

      expect(result).toBe(true);
    });

    it('should return false if user is not banned', async () => {
      mockChatBanRepository.findActiveByUserId.mockResolvedValue(null);

      const result = await moderationService.isUserBanned('event123', 'user123');

      expect(result).toBe(false);
    });
  });

  describe('getModerationData', () => {
    it('should return moderation data', async () => {
      const mockBans: any[] = [];
      const mockRoom = {
        id: 'room123',
        eventId: 'event123',
        moderators: ['mod123'],
        bannedUsers: [],
        mutedUsers: ['user123'],
      };

      mockChatBanRepository.findActiveByEventId.mockResolvedValue(mockBans as any);
      mockChatRoomRepository.findByEventId.mockResolvedValue(mockRoom as any);

      const result = await moderationService.getModerationData('event123');

      expect(result).toBeDefined();
      expect(result?.bannedUsers).toEqual([]);
      expect(result?.moderators).toEqual(['mod123']);
      expect(result?.mutedUsers).toEqual(['user123']);
    });
  });

  describe('assignReport', () => {
    it('should assign a report to a moderator', async () => {
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

      const assignedReport = {
        ...mockReport,
        assignedTo: 'mod123',
      };

      mockChatReportRepository.findByReportId.mockResolvedValue(mockReport as any);
      mockChatReportRepository.assignTo.mockResolvedValue(assignedReport as any);

      const result = await moderationService.assignReport('report123', 'mod123', 'moderator');

      expect(result).toBeDefined();
      expect(result?.assignedTo).toBe('mod123');
    });

    it('should throw error for non-moderator', async () => {
      await expect(
        moderationService.assignReport('report123', 'mod123', 'viewer')
      ).rejects.toThrow('Only moderators can assign reports');
    });
  });

  describe('resolveReport', () => {
    it('should resolve a report', async () => {
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

      const resolvedReport = {
        ...mockReport,
        status: 'resolved',
        resolution: 'Action taken',
      };

      mockChatReportRepository.findByReportId.mockResolvedValue(mockReport as any);
      mockChatReportRepository.resolve.mockResolvedValue(resolvedReport as any);

      const result = await moderationService.resolveReport('report123', 'Action taken', 'moderator');

      expect(result).toBeDefined();
      expect(result?.status).toBe('resolved');
      expect(result?.resolution).toBe('Action taken');
    });
  });

  describe('rejectReport', () => {
    it('should reject a report', async () => {
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

      const rejectedReport = {
        ...mockReport,
        status: 'rejected',
        resolution: 'No action needed',
      };

      mockChatReportRepository.findByReportId.mockResolvedValue(mockReport as any);
      mockChatReportRepository.reject.mockResolvedValue(rejectedReport as any);

      const result = await moderationService.rejectReport('report123', 'No action needed', 'moderator');

      expect(result).toBeDefined();
      expect(result?.status).toBe('rejected');
    });
  });
});
