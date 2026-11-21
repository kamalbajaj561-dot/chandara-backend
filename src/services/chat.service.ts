import { ChatRoomRepository } from '../repositories/chatRoom.repository';
import { ChatMessageRepository } from '../repositories/chatMessage.repository';
import { ChatReportRepository } from '../repositories/chatReport.repository';
import { ChatBanRepository } from '../repositories/chatBan.repository';
import { EventService } from './event.service';
import { StreamService } from './stream.service';
import { getCache, setCache, deleteCache } from './redis';
import { AppError } from '../middleware/errorHandler';
import { ChatRoom, ChatMessage, ChatReport, MessageReaction } from '../types';
import { randomBytes } from 'crypto';

export class ChatService {
  private chatRoomRepository: ChatRoomRepository;
  private chatMessageRepository: ChatMessageRepository;
  private chatReportRepository: ChatReportRepository;
  // @ts-ignore - Reserved for future use
  private _chatBanRepository: ChatBanRepository;
  private eventService: EventService;
  private streamService: StreamService;

  constructor(
    chatRoomRepository?: ChatRoomRepository,
    chatMessageRepository?: ChatMessageRepository,
    chatReportRepository?: ChatReportRepository,
    chatBanRepository?: ChatBanRepository,
    eventService?: EventService,
    streamService?: StreamService
  ) {
    this.chatRoomRepository = chatRoomRepository || new ChatRoomRepository();
    this.chatMessageRepository = chatMessageRepository || new ChatMessageRepository();
    this.chatReportRepository = chatReportRepository || new ChatReportRepository();
    this._chatBanRepository = chatBanRepository || new ChatBanRepository();
    this.eventService = eventService || new EventService();
    this.streamService = streamService || new StreamService();
  }

  async getOrCreateChatRoom(eventId: string): Promise<ChatRoom> {
    let room = await this.chatRoomRepository.findByEventId(eventId);

    if (!room) {
      const roomData: Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'> = {
        eventId,
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

      room = await this.chatRoomRepository.create(roomData);
    }

    return room;
  }

  async sendMessage(
    eventId: string,
    userId: string,
    userName: string,
    userRole: 'viewer' | 'creator' | 'moderator' | 'administrator',
    message: string,
    messageType: 'text' | 'emoji' | 'image' | 'system' = 'text',
    replyTo?: string
  ): Promise<ChatMessage> {
    // const event = await this.eventService.getEvent(eventId); // Reserved for future use
    const room = await this.getOrCreateChatRoom(eventId);

    if (!room.chatEnabled) {
      throw new AppError('Chat is disabled for this event', 403);
    }

    if (room.bannedUsers.includes(userId)) {
      throw new AppError('You are banned from this chat', 403);
    }

    if (room.mutedUsers.includes(userId)) {
      throw new AppError('You are muted in this chat', 403);
    }

    if (room.subscriberOnly && userRole === 'viewer') {
      throw new AppError('Chat is subscribers only', 403);
    }

    if (room.followersOnly && userRole === 'viewer') {
      throw new AppError('Chat is followers only', 403);
    }

    if (room.slowMode && userRole === 'viewer') {
      const lastMessageKey = `chat:${eventId}:user:${userId}:last_message`;
      const lastMessageTimeResult = await getCache<number>(lastMessageKey);
      const intervalMs = room.slowModeInterval * 1000;

      if (lastMessageTimeResult.data && Date.now() - lastMessageTimeResult.data < intervalMs) {
        throw new AppError(`Slow mode is enabled. Please wait ${room.slowModeInterval} seconds between messages.`, 429);
      }

      await setCache(lastMessageKey, Date.now(), intervalMs / 1000);
    }

    const stream = await this.streamService.getStream(eventId);
    const streamId = stream?.streamId || '';

    const messageId = randomBytes(16).toString('hex');
    const messageData: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'> = {
      messageId,
      eventId,
      streamId,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      message,
      messageType,
      replyTo,
      reactions: [],
      isPinned: false,
      isDeleted: false,
      isEdited: false,
    };

    const createdMessage = await this.chatMessageRepository.create(messageData);
    await this.chatRoomRepository.incrementMessageCount(room.id);

    await this.cacheRecentMessage(eventId, createdMessage);

    return createdMessage;
  }

  async editMessage(messageId: string, userId: string, newMessage: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId !== userId) {
      throw new AppError('You can only edit your own messages', 403);
    }

    if (message.isDeleted) {
      throw new AppError('Cannot edit deleted messages', 400);
    }

    const editedMessage = await this.chatMessageRepository.editMessage(message.id, newMessage);
    if (!editedMessage) {
      throw new AppError('Failed to edit message', 500);
    }

    return editedMessage;
  }

  async deleteMessage(messageId: string, userId: string, userRole: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId !== userId && userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('You can only delete your own messages', 403);
    }

    const deletedMessage = await this.chatMessageRepository.deleteMessage(message.id);
    if (!deletedMessage) {
      throw new AppError('Failed to delete message', 500);
    }

    return deletedMessage;
  }

  async pinMessage(messageId: string, _userId: string, userRole: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (userRole !== 'creator' && userRole !== 'moderator' && userRole !== 'administrator') {
      throw new AppError('Only moderators can pin messages', 403);
    }

    const pinnedMessage = await this.chatMessageRepository.pinMessage(message.id, !message.isPinned);
    if (!pinnedMessage) {
      throw new AppError('Failed to pin message', 500);
    }

    return pinnedMessage;
  }

  async addReaction(messageId: string, userId: string, userName: string, emoji: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.isDeleted) {
      throw new AppError('Cannot react to deleted messages', 400);
    }

    const reaction: MessageReaction = {
      emoji,
      userId,
      userName,
      timestamp: new Date(),
    };

    const updatedMessage = await this.chatMessageRepository.addReaction(message.id, reaction);
    if (!updatedMessage) {
      throw new AppError('Failed to add reaction', 500);
    }

    return updatedMessage;
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const updatedMessage = await this.chatMessageRepository.removeReaction(message.id, emoji, userId);
    if (!updatedMessage) {
      throw new AppError('Failed to remove reaction', 500);
    }

    return updatedMessage;
  }

  async getMessages(eventId: string, limit = 50, before?: Date): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.findByEventId(eventId, limit, before);
  }

  async getPinnedMessages(eventId: string): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.findPinnedByEventId(eventId);
  }

  async searchMessages(eventId: string, searchTerm: string, limit = 50): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.searchMessages(eventId, searchTerm, limit);
  }

  async getChatRoom(eventId: string): Promise<ChatRoom> {
    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }
    return room;
  }

  async updateSlowMode(eventId: string, slowMode: boolean, interval: number, userId: string, userRole: string): Promise<ChatRoom> {
    const event = await this.eventService.getEvent(eventId);
    if (event.creatorUid !== userId && userRole !== 'administrator') {
      throw new AppError('Only the event creator can update slow mode', 403);
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const updatedRoom = await this.chatRoomRepository.updateSlowMode(room.id, slowMode, interval);
    if (!updatedRoom) {
      throw new AppError('Failed to update slow mode', 500);
    }

    return updatedRoom;
  }

  async toggleChatEnabled(eventId: string, enabled: boolean, userId: string, userRole: string): Promise<ChatRoom> {
    const event = await this.eventService.getEvent(eventId);
    if (event.creatorUid !== userId && userRole !== 'administrator') {
      throw new AppError('Only the event creator can toggle chat', 403);
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const updatedRoom = await this.chatRoomRepository.toggleChatEnabled(room.id, enabled);
    if (!updatedRoom) {
      throw new AppError('Failed to toggle chat', 500);
    }

    return updatedRoom;
  }

  async setSubscriberOnly(eventId: string, subscriberOnly: boolean, userId: string, userRole: string): Promise<ChatRoom> {
    const event = await this.eventService.getEvent(eventId);
    if (event.creatorUid !== userId && userRole !== 'administrator') {
      throw new AppError('Only the event creator can change subscriber-only mode', 403);
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const updatedRoom = await this.chatRoomRepository.setSubscriberOnly(room.id, subscriberOnly);
    if (!updatedRoom) {
      throw new AppError('Failed to update subscriber-only mode', 500);
    }

    return updatedRoom;
  }

  async setFollowersOnly(eventId: string, followersOnly: boolean, userId: string, userRole: string): Promise<ChatRoom> {
    const event = await this.eventService.getEvent(eventId);
    if (event.creatorUid !== userId && userRole !== 'administrator') {
      throw new AppError('Only the event creator can change followers-only mode', 403);
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const updatedRoom = await this.chatRoomRepository.setFollowersOnly(room.id, followersOnly);
    if (!updatedRoom) {
      throw new AppError('Failed to update followers-only mode', 500);
    }

    return updatedRoom;
  }

  async addModerator(eventId: string, moderatorId: string, userId: string, userRole: string): Promise<ChatRoom> {
    const event = await this.eventService.getEvent(eventId);
    if (event.creatorUid !== userId && userRole !== 'administrator') {
      throw new AppError('Only the event creator can add moderators', 403);
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const updatedRoom = await this.chatRoomRepository.addModerator(room.id, moderatorId);
    if (!updatedRoom) {
      throw new AppError('Failed to add moderator', 500);
    }

    return updatedRoom;
  }

  async removeModerator(eventId: string, moderatorId: string, userId: string, userRole: string): Promise<ChatRoom> {
    const event = await this.eventService.getEvent(eventId);
    if (event.creatorUid !== userId && userRole !== 'administrator') {
      throw new AppError('Only the event creator can remove moderators', 403);
    }

    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new AppError('Chat room not found', 404);
    }

    const updatedRoom = await this.chatRoomRepository.removeModerator(room.id, moderatorId);
    if (!updatedRoom) {
      throw new AppError('Failed to remove moderator', 500);
    }

    return updatedRoom;
  }

  async reportMessage(
    messageId: string,
    reporterId: string,
    reporterName: string,
    reason: string,
    description?: string
  ): Promise<ChatReport> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const reportId = randomBytes(16).toString('hex');
    const reportData: Omit<ChatReport, 'id' | 'createdAt' | 'updatedAt'> = {
      reportId,
      messageId,
      eventId: message.eventId,
      reporterId,
      reporterName,
      reportedUserId: message.senderId,
      reportedUserName: message.senderName,
      reason,
      description,
      status: 'pending',
    };

    const report = await this.chatReportRepository.create(reportData);
    return report;
  }

  async getRecentMessagesFromCache(eventId: string): Promise<ChatMessage[] | null> {
    const cacheKey = `chat:${eventId}:recent_messages`;
    const cachedResult = await getCache<ChatMessage[]>(cacheKey);
    return cachedResult.data;
  }

  private async cacheRecentMessage(eventId: string, message: ChatMessage): Promise<void> {
    const cacheKey = `chat:${eventId}:recent_messages`;
    const cachedResult = await getCache<ChatMessage[]>(cacheKey);
    const messages = cachedResult.data || [];
    messages.push(message);

    if (messages.length > 50) {
      messages.shift();
    }

    await setCache(cacheKey, messages, 3600);
  }

  async clearRecentMessagesCache(eventId: string): Promise<void> {
    const cacheKey = `chat:${eventId}:recent_messages`;
    await deleteCache(cacheKey);
  }

  async updateActiveUsers(eventId: string, count: number): Promise<void> {
    const room = await this.chatRoomRepository.findByEventId(eventId);
    if (room) {
      await this.chatRoomRepository.updateActiveUsers(room.id, count);
    }
  }
}

export const chatService = new ChatService();
