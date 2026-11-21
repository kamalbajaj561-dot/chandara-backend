import { ChatMessageRepository } from '../repositories/chatMessage.repository';
import { ChatService } from './chat.service';
import { getCache, setCache } from './redis';
import { AppError } from '../middleware/errorHandler';
import { ChatMessage } from '../types';

export class ChatReplayService {
  private chatMessageRepository: ChatMessageRepository;
  private chatService: ChatService;

  constructor(
    chatMessageRepository?: ChatMessageRepository,
    chatService?: ChatService
  ) {
    this.chatMessageRepository = chatMessageRepository || new ChatMessageRepository();
    this.chatService = chatService || new ChatService();
  }

  async getRecentMessages(eventId: string, limit = 50): Promise<ChatMessage[]> {
    const cached = await this.chatService.getRecentMessagesFromCache(eventId);
    if (cached && cached.length > 0) {
      return cached.slice(-limit);
    }

    const messages = await this.chatMessageRepository.findByEventId(eventId, limit);
    return messages;
  }

  async getMessagesBefore(eventId: string, before: Date, limit = 50): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.findByEventId(eventId, limit, before);
  }

  async getMessagesAfter(eventId: string, after: Date, limit = 50): Promise<ChatMessage[]> {
    const allMessages = await this.chatMessageRepository.findByEventId(eventId, limit * 2);
    return allMessages.filter((msg) => msg.createdAt > after).slice(0, limit);
  }

  async getMessagesInRange(eventId: string, startDate: Date, endDate: Date, limit = 100): Promise<ChatMessage[]> {
    const allMessages = await this.chatMessageRepository.findByEventId(eventId, limit * 2);
    return allMessages.filter((msg) => msg.createdAt >= startDate && msg.createdAt <= endDate);
  }

  async getMessagesByUser(eventId: string, userId: string, limit = 50): Promise<ChatMessage[]> {
    const allMessages = await this.chatMessageRepository.findByEventId(eventId, limit * 5);
    return allMessages.filter((msg) => msg.senderId === userId).slice(0, limit);
  }

  async getRepliedMessages(eventId: string, messageId: string, limit = 50): Promise<ChatMessage[]> {
    const allMessages = await this.chatMessageRepository.findByEventId(eventId, limit * 2);
    return allMessages.filter((msg) => msg.replyTo === messageId);
  }

  async getMessageContext(eventId: string, messageId: string, contextSize = 5): Promise<{
    message: ChatMessage;
    before: ChatMessage[];
    after: ChatMessage[];
  }> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    const allMessages = await this.chatMessageRepository.findByEventId(eventId, 100);
    const messageIndex = allMessages.findIndex((msg) => msg.messageId === messageId);

    if (messageIndex === -1) {
      throw new AppError('Message not found in event', 404);
    }

    const before = allMessages.slice(Math.max(0, messageIndex - contextSize), messageIndex);
    const after = allMessages.slice(messageIndex + 1, messageIndex + 1 + contextSize);

    return {
      message,
      before,
      after,
    };
  }

  async getPaginatedMessages(
    eventId: string,
    page = 1,
    limit = 50
  ): Promise<{
    messages: ChatMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const cacheKey = `chat:${eventId}:pagination:total`;
    const cachedTotalResult = await getCache<number>(cacheKey);

    let total = cachedTotalResult.data;
    if (!total) {
      const allMessages = await this.chatMessageRepository.findByEventId(eventId, 1000);
      total = allMessages.length;
      await setCache(cacheKey, total, 300);
    }

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.min(Math.max(1, page), totalPages);

    const skip = (currentPage - 1) * limit;
    const messages = await this.chatMessageRepository.findByEventId(eventId, limit + skip);
    const paginatedMessages = messages.slice(skip, skip + limit);

    return {
      messages: paginatedMessages,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
    };
  }

  async searchMessages(eventId: string, query: string, limit = 50): Promise<ChatMessage[]> {
    return await this.chatMessageRepository.searchMessages(eventId, query, limit);
  }

  async getMessageCount(eventId: string): Promise<number> {
    const cacheKey = `chat:${eventId}:message_count`;
    const cachedResult = await getCache<number>(cacheKey);

    if (cachedResult.data !== null) {
      return cachedResult.data;
    }

    const messages = await this.chatMessageRepository.findByEventId(eventId, 1000);
    const count = messages.length;

    await setCache(cacheKey, count, 300);
    return count;
  }

  async clearCache(eventId: string): Promise<void> {
    await this.chatService.clearRecentMessagesCache(eventId);
    await setCache(`chat:${eventId}:pagination:total`, 0, 0);
    await setCache(`chat:${eventId}:message_count`, 0, 0);
  }
}

export const chatReplayService = new ChatReplayService();
