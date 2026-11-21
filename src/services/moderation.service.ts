import { ChatRoomRepository } from '../repositories/chatRoom.repository';
import { ChatBanRepository } from '../repositories/chatBan.repository';
import { ChatReportRepository } from '../repositories/chatReport.repository';
import { ChatMessageRepository } from '../repositories/chatMessage.repository';
import { EventService } from './event.service';
import { getCache, setCache, deleteCache } from './redis';
import { AppError } from '../middleware/errorHandler';
import { ChatBan, ChatReport } from '../types';
import { randomBytes } from 'crypto';

export class ModerationService {
  private chatRoomRepository: ChatRoomRepository;
  private chatBanRepository: ChatBanRepository;
  private chatReportRepository: ChatReportRepository;
  // @ts-ignore - Reserved for future use
  private _chatMessageRepository: ChatMessageRepository;
  private eventService: EventService;

  constructor(
    chatRoomRepository?: ChatRoomRepository,
    chatBanRepository?: ChatBanRepository,
    chatReportRepository?: ChatReportRepository,
    chatMessageRepository?: ChatMessageRepository,
    eventService?: EventService
  ) {
    this.chatRoomRepository = chatRoomRepository || new ChatRoomRepository();
    this.chatBanRepository = chatBanRepository || new ChatBanRepository();
    this.chatReportRepository = chatReportRepository || new ChatReportRepository();
    this._chatMessageRepository = chatMessageRepository || new ChatMessageRepository();
    this.eventService = eventService || new EventService();
  }

  async muteUser(eventId: string, userId: string, moderatorId: string, _moderatorName: string, userRole: string): Promise<void> {
    const event = await this.eventService.getEvent(eventId);
    const room = await this.chatRoomRepository.findByEventId(eventId);

    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    if (userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can mute users', 403);
    }

    if (!room.moderators.includes(moderatorId) && event.creatorUid !== moderatorId && userRole !== 'administrator') {
      throw new AppError('You are not a moderator for this chat', 403);
    }

    await this.chatRoomRepository.addMutedUser(room.id, userId);

    await setCache(`chat:${eventId}:muted:${userId}`, 'true', 3600);
  }

  async unmuteUser(eventId: string, userId: string, moderatorId: string, userRole: string): Promise<void> {
    const event = await this.eventService.getEvent(eventId);
    const room = await this.chatRoomRepository.findByEventId(eventId);

    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    if (userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can unmute users', 403);
    }

    if (!room.moderators.includes(moderatorId) && event.creatorUid !== moderatorId && userRole !== 'administrator') {
      throw new AppError('You are not a moderator for this chat', 403);
    }

    await this.chatRoomRepository.removeMutedUser(room.id, userId);

    await deleteCache(`chat:${eventId}:muted:${userId}`);
  }

  async timeoutUser(
    eventId: string,
    userId: string,
    userName: string,
    duration: number,
    reason: string,
    moderatorId: string,
    moderatorName: string,
    userRole: string
  ): Promise<ChatBan> {
    const event = await this.eventService.getEvent(eventId);
    const room = await this.chatRoomRepository.findByEventId(eventId);

    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    if (userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can timeout users', 403);
    }

    if (!room.moderators.includes(moderatorId) && event.creatorUid !== moderatorId && userRole !== 'administrator') {
      throw new AppError('You are not a moderator for this chat', 403);
    }

    const banId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + duration * 1000);

    const banData: Omit<ChatBan, 'id' | 'createdAt' | 'updatedAt'> = {
      banId,
      eventId,
      userId,
      userName,
      bannedBy: moderatorId,
      bannedByName: moderatorName,
      reason,
      banType: 'temporary',
      duration,
      expiresAt,
      isActive: true,
    };

    const ban = await this.chatBanRepository.create(banData);
    await this.chatRoomRepository.addBannedUser(room.id, userId);

    await setCache(`chat:${eventId}:banned:${userId}`, 'true', duration);

    return ban;
  }

  async banUser(
    eventId: string,
    userId: string,
    userName: string,
    reason: string,
    moderatorId: string,
    moderatorName: string,
    userRole: string
  ): Promise<ChatBan> {
    const event = await this.eventService.getEvent(eventId);
    const room = await this.chatRoomRepository.findByEventId(eventId);

    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    if (userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can ban users', 403);
    }

    if (!room.moderators.includes(moderatorId) && event.creatorUid !== moderatorId && userRole !== 'administrator') {
      throw new AppError('You are not a moderator for this chat', 403);
    }

    const banId = randomBytes(16).toString('hex');

    const banData: Omit<ChatBan, 'id' | 'createdAt' | 'updatedAt'> = {
      banId,
      eventId,
      userId,
      userName,
      bannedBy: moderatorId,
      bannedByName: moderatorName,
      reason,
      banType: 'permanent',
      isActive: true,
    };

    const ban = await this.chatBanRepository.create(banData);
    await this.chatRoomRepository.addBannedUser(room.id, userId);

    await setCache(`chat:${eventId}:banned:${userId}`, 'true', 86400);

    return ban;
  }

  async unbanUser(eventId: string, userId: string, moderatorId: string, userRole: string): Promise<void> {
    const event = await this.eventService.getEvent(eventId);
    const room = await this.chatRoomRepository.findByEventId(eventId);

    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    if (userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can unban users', 403);
    }

    if (!room.moderators.includes(moderatorId) && event.creatorUid !== moderatorId && userRole !== 'administrator') {
      throw new AppError('You are not a moderator for this chat', 403);
    }

    await this.chatRoomRepository.removeBannedUser(room.id, userId);

    const activeBan = await this.chatBanRepository.findActiveByUserId(userId);
    if (activeBan) {
      await this.chatBanRepository.deactivate(activeBan.id);
    }

    await deleteCache(`chat:${eventId}:banned:${userId}`);
  }

  async isUserBanned(eventId: string, userId: string): Promise<boolean> {
    const cacheKey = `chat:${eventId}:banned:${userId}`;
    const cachedResult = await getCache<string>(cacheKey);
    if (cachedResult.data === 'true') {
      return true;
    }

    const activeBan = await this.chatBanRepository.findActiveByUserId(userId);
    if (activeBan && activeBan.eventId === eventId) {
      await setCache(cacheKey, 'true', 86400);
      return true;
    }

    return false;
  }

  async isUserMuted(eventId: string, userId: string): Promise<boolean> {
    const cacheKey = `chat:${eventId}:muted:${userId}`;
    const cachedResult = await getCache<string>(cacheKey);
    if (cachedResult.data === 'true') {
      return true;
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (room && room.mutedUsers.includes(userId)) {
      await setCache(cacheKey, 'true', 3600);
      return true;
    }

    return false;
  }

  async getActiveBans(eventId: string): Promise<ChatBan[]> {
    return await this.chatBanRepository.findActiveByEventId(eventId);
  }

  async getModerationData(eventId: string): Promise<{
    bannedUsers: ChatBan[];
    moderators: string[];
    mutedUsers: string[];
  }> {
    const bannedUsers = await this.chatBanRepository.findActiveByEventId(eventId);
    const room = await this.chatRoomRepository.findByEventId(eventId);

    return {
      bannedUsers,
      moderators: room?.moderators || [],
      mutedUsers: room?.mutedUsers || [],
    };
  }

  async assignReport(reportId: string, assignedTo: string, userRole: string): Promise<ChatReport> {
    if (userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can assign reports', 403);
    }

    const report = await this.chatReportRepository.findByReportId(reportId);
    if (!report) {
      throw new AppError('Report not found', 404);
    }

    const updatedReport = await this.chatReportRepository.assignTo(report.id, assignedTo);
    if (!updatedReport) {
      throw new AppError('Failed to assign report', 500);
    }

    return updatedReport;
  }

  async resolveReport(reportId: string, resolution: string, userRole: string): Promise<ChatReport> {
    if (userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can resolve reports', 403);
    }

    const report = await this.chatReportRepository.findByReportId(reportId);
    if (!report) {
      throw new AppError('Report not found', 404);
    }

    const updatedReport = await this.chatReportRepository.resolve(report.id, resolution);
    if (!updatedReport) {
      throw new AppError('Failed to resolve report', 500);
    }

    return updatedReport;
  }

  async rejectReport(reportId: string, resolution: string, userRole: string): Promise<ChatReport> {
    if (userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can reject reports', 403);
    }

    const report = await this.chatReportRepository.findByReportId(reportId);
    if (!report) {
      throw new AppError('Report not found', 404);
    }

    const updatedReport = await this.chatReportRepository.reject(report.id, resolution);
    if (!updatedReport) {
      throw new AppError('Failed to reject report', 500);
    }

    return updatedReport;
  }

  async getReports(eventId: string, limit = 50): Promise<ChatReport[]> {
    return await this.chatReportRepository.findByEventId(eventId, limit);
  }

  async getPendingReports(limit = 50): Promise<ChatReport[]> {
    return await this.chatReportRepository.findByStatus('pending', limit);
  }

  async cleanupExpiredBans(): Promise<number> {
    return await this.chatBanRepository.cleanupExpiredBans();
  }
}

export const moderationService = new ModerationService();
