import { Request, Response, NextFunction } from 'express';
import { ChatService } from '../services/chat.service';
import { ModerationService } from '../services/moderation.service';
import { ReactionService } from '../services/reaction.service';
import { SpamDetectionService } from '../services/spamDetection.service';
import { TypingService } from '../services/typing.service';
import { ChatReplayService } from '../services/chatReplay.service';
import { emitToChatRoom, removeUserFromChatRoom } from '../sockets/emit';

export class ChatController {
  private chatService: ChatService;
  private moderationService: ModerationService;
  private reactionService: ReactionService;
  private spamDetectionService: SpamDetectionService;
  private typingService: TypingService;
  private chatReplayService: ChatReplayService;

  constructor(
    chatService?: ChatService,
    moderationService?: ModerationService,
    reactionService?: ReactionService,
    spamDetectionService?: SpamDetectionService,
    typingService?: TypingService,
    chatReplayService?: ChatReplayService
  ) {
    this.chatService = chatService || new ChatService();
    this.moderationService = moderationService || new ModerationService();
    this.reactionService = reactionService || new ReactionService();
    this.spamDetectionService = spamDetectionService || new SpamDetectionService();
    this.typingService = typingService || new TypingService();
    this.chatReplayService = chatReplayService || new ChatReplayService();
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const { limit, before } = req.query;

      const limitNum = limit ? parseInt(limit as string) : 50;
      const beforeDate = before ? new Date(before as string) : undefined;

      const messages = await this.chatService.getMessages(eventId, limitNum, beforeDate);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { message, messageType, replyTo } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const spamResult = await this.spamDetectionService.detectSpam(
        user.id,
        eventId,
        message,
        messageType || 'text'
      );

      if (spamResult.isSpam) {
        await this.spamDetectionService.logSuspiciousActivity(user.id, eventId, spamResult.reason || 'spam');
        return res.status(429).json({
          success: false,
          error: 'Message blocked',
          reason: spamResult.reason,
        });
      }

      const newMessage = await this.chatService.sendMessage(
        eventId,
        user.id,
        user.displayName || user.username,
        user.role,
        message,
        messageType || 'text',
        replyTo
      );

      emitToChatRoom(eventId, 'new-message', newMessage);

      res.status(201).json({
        success: true,
        data: newMessage,
        message: 'Message sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async editMessage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const editedMessage = await this.chatService.editMessage(id, user.id, message);

      emitToChatRoom((editedMessage as any)?.eventId, 'message-updated', editedMessage);

      res.status(200).json({
        success: true,
        data: editedMessage,
        message: 'Message edited successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const deletedMessage = await this.chatService.deleteMessage(id, user.id, user.role);

      emitToChatRoom((deletedMessage as any)?.eventId, 'message-removed', { messageId: id });

      res.status(200).json({
        success: true,
        data: deletedMessage,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const message = await this.reactionService.addReaction(
        id,
        user.id,
        user.displayName || user.username,
        emoji
      );

      emitToChatRoom((message as any)?.eventId, 'message-pin-changed', { messageId: id, pinned: Boolean((message as any)?.isPinned) });

      res.status(200).json({
        success: true,
        data: message,
        message: 'Reaction added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const { emoji } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const message = await this.reactionService.removeReaction(id, user.id, emoji);

      res.status(200).json({
        success: true,
        data: message,
        message: 'Reaction removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async pinMessage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { id } = req.params;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const message = await this.chatService.pinMessage(id, user.id, user.role);

      res.status(200).json({
        success: true,
        data: message,
        message: message.isPinned ? 'Message pinned successfully' : 'Message unpinned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async reportMessage(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { messageId, reason, description } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const report = await this.chatService.reportMessage(
        messageId,
        user.id,
        user.displayName || user.username,
        reason,
        description
      );

      res.status(201).json({
        success: true,
        data: report,
        message: 'Report submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async muteUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId, userId } = req.body;
      const moderator = req.user as any;

      if (!moderator) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await this.moderationService.muteUser(
        eventId,
        userId,
        moderator.id,
        moderator.displayName || moderator.username,
        moderator.role
      );

      emitToChatRoom(eventId, 'user-mute-changed', { userId, muted: true });
      res.status(200).json({
        success: true,
        message: 'User muted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async unmuteUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId, userId } = req.body;
      const moderator = req.user as any;

      if (!moderator) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await this.moderationService.unmuteUser(eventId, userId, moderator.id, moderator.role);

      emitToChatRoom(eventId, 'user-mute-changed', { userId, muted: false });
      res.status(200).json({
        success: true,
        message: 'User unmuted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async timeoutUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId, userId, userName, duration, reason } = req.body;
      const moderator = req.user as any;

      if (!moderator) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const ban = await this.moderationService.timeoutUser(
        eventId,
        userId,
        userName,
        duration,
        reason,
        moderator.id,
        moderator.displayName || moderator.username,
        moderator.role
      );

      emitToChatRoom(eventId, 'user-timed-out', { userId, duration });
      res.status(200).json({
        success: true,
        data: ban,
        message: 'User timed out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async banUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId, userId, userName, reason } = req.body;
      const moderator = req.user as any;

      if (!moderator) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const ban = await this.moderationService.banUser(
        eventId,
        userId,
        userName,
        reason,
        moderator.id,
        moderator.displayName || moderator.username,
        moderator.role
      );

      emitToChatRoom(eventId, 'user-ban-changed', { userId, banned: true });
      await removeUserFromChatRoom(eventId, userId);
      res.status(200).json({
        success: true,
        data: ban,
        message: 'User banned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async unbanUser(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId, userId } = req.body;
      const moderator = req.user as any;

      if (!moderator) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await this.moderationService.unbanUser(eventId, userId, moderator.id, moderator.role);

      emitToChatRoom(eventId, 'user-ban-changed', { userId, banned: false });
      res.status(200).json({
        success: true,
        message: 'User unbanned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getModerationData(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;

      const moderationData = await this.moderationService.getModerationData(eventId);

      res.status(200).json({
        success: true,
        data: moderationData,
      });
    } catch (error) {
      next(error);
    }
  }

  async getChatRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;

      const room = await this.chatService.getChatRoom(eventId);

      res.status(200).json({
        success: true,
        data: room,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSlowMode(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { slowMode, interval } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const room = await this.chatService.updateSlowMode(
        eventId,
        slowMode,
        interval,
        user.id,
        user.role
      );

      res.status(200).json({
        success: true,
        data: room,
        message: 'Slow mode updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleChatEnabled(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { enabled } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const room = await this.chatService.toggleChatEnabled(eventId, enabled, user.id, user.role);

      res.status(200).json({
        success: true,
        data: room,
        message: enabled ? 'Chat enabled successfully' : 'Chat disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async setSubscriberOnly(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { subscriberOnly } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const room = await this.chatService.setSubscriberOnly(
        eventId,
        subscriberOnly,
        user.id,
        user.role
      );

      res.status(200).json({
        success: true,
        data: room,
        message: 'Subscriber-only mode updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async setFollowersOnly(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { followersOnly } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const room = await this.chatService.setFollowersOnly(
        eventId,
        followersOnly,
        user.id,
        user.role
      );

      res.status(200).json({
        success: true,
        data: room,
        message: 'Followers-only mode updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addModerator(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { moderatorId } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const room = await this.chatService.addModerator(eventId, moderatorId, user.id, user.role);

      res.status(200).json({
        success: true,
        data: room,
        message: 'Moderator added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeModerator(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const { moderatorId } = req.body;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const room = await this.chatService.removeModerator(eventId, moderatorId, user.id, user.role);

      res.status(200).json({
        success: true,
        data: room,
        message: 'Moderator removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getPinnedMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;

      const messages = await this.chatService.getPinnedMessages(eventId);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const { q, limit } = req.query;

      const searchTerm = q as string;
      const limitNum = limit ? parseInt(limit as string) : 50;

      const messages = await this.chatService.searchMessages(eventId, searchTerm, limitNum);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTypingUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;

      const typingUsers = await this.typingService.getTypingUsers(eventId);

      res.status(200).json({
        success: true,
        data: typingUsers,
      });
    } catch (error) {
      next(error);
    }
  }

  async setTyping(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await this.typingService.setTyping(
        eventId,
        user.id,
        user.displayName || user.username
      );

      res.status(200).json({
        success: true,
        message: 'Typing indicator set',
      });
    } catch (error) {
      next(error);
    }
  }

  async clearTyping(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { eventId } = req.params;
      const user = req.user as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      await this.typingService.clearTyping(eventId, user.id);

      res.status(200).json({
        success: true,
        message: 'Typing indicator cleared',
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaginatedMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { eventId } = req.params;
      const { page, limit } = req.query;

      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 50;

      const result = await this.chatReplayService.getPaginatedMessages(eventId, pageNum, limitNum);

      res.status(200).json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
