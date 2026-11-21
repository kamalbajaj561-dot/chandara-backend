import { ChatMessageRepository } from '../repositories/chatMessage.repository';
import { AppError } from '../middleware/errorHandler';
import { ChatMessage, MessageReaction } from '../types';

export class ReactionService {
  private chatMessageRepository: ChatMessageRepository;

  constructor(chatMessageRepository?: ChatMessageRepository) {
    this.chatMessageRepository = chatMessageRepository || new ChatMessageRepository();
  }

  async addReaction(
    messageId: string,
    userId: string,
    userName: string,
    emoji: string
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.isDeleted) {
      throw new AppError('Cannot react to deleted messages', 400);
    }

    const existingReaction = message.reactions.find(
      (r) => r.emoji === emoji && r.userId === userId
    );

    if (existingReaction) {
      throw new AppError('You have already reacted with this emoji', 400);
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

    const hasReaction = message.reactions.some(
      (r) => r.emoji === emoji && r.userId === userId
    );

    if (!hasReaction) {
      throw new AppError('You have not reacted with this emoji', 400);
    }

    const updatedMessage = await this.chatMessageRepository.removeReaction(message.id, emoji, userId);
    if (!updatedMessage) {
      throw new AppError('Failed to remove reaction', 500);
    }

    return updatedMessage;
  }

  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    return message.reactions;
  }

  async getReactionCount(messageId: string, emoji: string): Promise<number> {
    const message = await this.chatMessageRepository.findByMessageId(messageId);
    if (!message) {
      throw new AppError('Message not found', 404);
    }

    return message.reactions.filter((r) => r.emoji === emoji).length;
  }

  async getUserReactions(userId: string, messageId?: string): Promise<MessageReaction[]> {
    if (messageId) {
      const message = await this.chatMessageRepository.findByMessageId(messageId);
      if (!message) {
        throw new AppError('Message not found', 404);
      }

      return message.reactions.filter((r) => r.userId === userId);
    }

    return [];
  }
}

export const reactionService = new ReactionService();
