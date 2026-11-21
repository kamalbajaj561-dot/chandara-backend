import { Notification, NotificationType, NotificationPriority, NotificationPreference } from '../types';
import { notificationRepository } from '../repositories/notification.repository';
import { notificationPreferenceRepository } from '../repositories/notificationPreference.repository';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { getCache, setCache, deleteCache } from './redis';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

export class NotificationService {
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const preferences = await notificationPreferenceRepository.findByUserId(data.userId);
      
      if (preferences && !preferences.inAppEnabled) {
        logger.info(`In-app notifications disabled for user ${data.userId}`);
        throw new AppError('In-app notifications are disabled for this user', 403);
      }

      if (preferences && !this.shouldSendNotification(data.type, preferences)) {
        logger.info(`Notification type ${data.type} disabled for user ${data.userId}`);
        throw new AppError('This notification type is disabled for this user', 403);
      }

      const notification = await notificationRepository.create({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority || 'normal',
        status: 'sent',
        read: false,
        expiresAt: data.expiresAt,
      });

      // Invalidate unread count cache
      await deleteCache(`unread_count:${data.userId}`);

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to create notification', 500);
    }
  }

  async getNotification(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await notificationRepository.findById(notificationId);
      
      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (notification.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      return notification;
    } catch (error) {
      logger.error('Error getting notification:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get notification', 500);
    }
  }

  async listNotifications(
    userId: string,
    limit = 50,
    offset = 0,
    type?: NotificationType,
    priority?: NotificationPriority
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      let notifications: Notification[];
      const cacheKey = `notifications:${userId}:${limit}:${offset}:${type || 'all'}:${priority || 'all'}`;

      // Try cache first for recent notifications (no offset, default limit)
      if (offset === 0 && limit === 50 && !type && !priority) {
        const cachedResult = await getCache<{ notifications: Notification[]; total: number }>(cacheKey);
        if (cachedResult.data !== null) {
          return cachedResult.data;
        }
      }

      if (type) {
        notifications = await notificationRepository.findByType(userId, type, limit);
      } else if (priority) {
        notifications = await notificationRepository.findByPriority(userId, priority, limit);
      } else {
        notifications = await notificationRepository.findByUserId(userId, limit, offset);
      }

      const total = await notificationRepository.getUnreadCount(userId);

      const result = { notifications, total };

      // Cache recent notifications for 2 minutes
      if (offset === 0 && limit === 50 && !type && !priority) {
        await setCache(cacheKey, result, 120);
      }

      return result;
    } catch (error) {
      logger.error('Error listing notifications:', error);
      throw new AppError('Failed to list notifications', 500);
    }
  }

  async searchNotifications(userId: string, query: string, limit = 50): Promise<Notification[]> {
    try {
      return await notificationRepository.search(userId, query, limit);
    } catch (error) {
      logger.error('Error searching notifications:', error);
      throw new AppError('Failed to search notifications', 500);
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await notificationRepository.findById(notificationId);
      
      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (notification.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      await notificationRepository.softDelete(notificationId);
      
      // Invalidate unread count cache
      await deleteCache(`unread_count:${userId}`);
      
      // Invalidate recent notifications cache
      await deleteCache(`notifications:${userId}:50:0:all:all`);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to delete notification', 500);
    }
  }

  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      await notificationRepository.deleteAllForUser(userId);
      
      // Invalidate unread count cache
      await deleteCache(`unread_count:${userId}`);
      
      // Invalidate recent notifications cache
      await deleteCache(`notifications:${userId}:50:0:all:all`);
    } catch (error) {
      logger.error('Error deleting all notifications:', error);
      throw new AppError('Failed to delete all notifications', 500);
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await notificationRepository.findById(notificationId);
      
      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (notification.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      const updated = await notificationRepository.markAsRead(notificationId);
      if (!updated) {
        throw new AppError('Failed to mark notification as read', 500);
      }

      // Invalidate unread count cache
      await deleteCache(`unread_count:${userId}`);

      return updated;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to mark notification as read', 500);
    }
  }

  async markAsUnread(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await notificationRepository.findById(notificationId);
      
      if (!notification) {
        throw new AppError('Notification not found', 404);
      }

      if (notification.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      const updated = await notificationRepository.markAsUnread(notificationId);
      if (!updated) {
        throw new AppError('Failed to mark notification as unread', 500);
      }

      // Invalidate unread count cache
      await deleteCache(`unread_count:${userId}`);

      return updated;
    } catch (error) {
      logger.error('Error marking notification as unread:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to mark notification as unread', 500);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await notificationRepository.markAllAsRead(userId);
      
      // Invalidate unread count cache
      await deleteCache(`unread_count:${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw new AppError('Failed to mark all notifications as read', 500);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      // Try cache first
      const cacheKey = `unread_count:${userId}`;
      const cachedResult = await getCache<number>(cacheKey);
      if (cachedResult.data !== null) {
        return cachedResult.data;
      }

      const count = await notificationRepository.getUnreadCount(userId);
      
      // Cache for 5 minutes
      await setCache(cacheKey, count, 300);
      
      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw new AppError('Failed to get unread count', 500);
    }
  }

  async bulkSend(notifications: CreateNotificationData[]): Promise<Notification[]> {
    try {
      const validNotifications: Omit<Notification, 'notificationId' | 'createdAt' | 'updatedAt'>[] = [];

      for (const data of notifications) {
        const preferences = await notificationPreferenceRepository.findByUserId(data.userId);
        
        if (preferences && (!preferences.inAppEnabled || !this.shouldSendNotification(data.type, preferences))) {
          logger.info(`Skipping notification for user ${data.userId} - preferences disabled`);
          continue;
        }

        validNotifications.push({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          priority: data.priority || 'normal',
          status: 'sent',
          read: false,
          expiresAt: data.expiresAt,
        });
      }

      return await notificationRepository.bulkInsert(validNotifications);
    } catch (error) {
      logger.error('Error bulk sending notifications:', error);
      throw new AppError('Failed to bulk send notifications', 500);
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreference> {
    try {
      // Try cache first
      const cacheKey = `notification_preferences:${userId}`;
      const cachedResult = await getCache<NotificationPreference>(cacheKey);
      if (cachedResult.data !== null) {
        return cachedResult.data;
      }

      let preferences = await notificationPreferenceRepository.findByUserId(userId);
      
      if (!preferences) {
        preferences = await notificationPreferenceRepository.create({
          userId,
          inAppEnabled: true,
          eventNotifications: true,
          streamNotifications: true,
          chatNotifications: true,
          ticketNotifications: true,
          paymentNotifications: true,
          creatorNotifications: true,
          adminNotifications: true,
          language: 'en',
          timezone: 'UTC',
        });
      }

      // Cache for 1 hour
      await setCache(cacheKey, preferences, 3600);

      return preferences;
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw new AppError('Failed to get notification preferences', 500);
    }
  }

  async updatePreferences(userId: string, updateData: Partial<Omit<NotificationPreference, 'userId' | 'createdAt' | 'updatedAt'>>): Promise<NotificationPreference> {
    try {
      const existing = await notificationPreferenceRepository.findByUserId(userId);
      
      if (existing) {
        const updated = await notificationPreferenceRepository.update(userId, updateData);
        if (!updated) {
          throw new AppError('Failed to update notification preferences', 500);
        }
        
        // Invalidate preferences cache
        await deleteCache(`notification_preferences:${userId}`);
        
        return updated;
      }

      const preferences = await notificationPreferenceRepository.create({
        userId,
        inAppEnabled: updateData.inAppEnabled ?? true,
        eventNotifications: updateData.eventNotifications ?? true,
        streamNotifications: updateData.streamNotifications ?? true,
        chatNotifications: updateData.chatNotifications ?? true,
        ticketNotifications: updateData.ticketNotifications ?? true,
        paymentNotifications: updateData.paymentNotifications ?? true,
        creatorNotifications: updateData.creatorNotifications ?? true,
        adminNotifications: updateData.adminNotifications ?? true,
        language: updateData.language ?? 'en',
        timezone: updateData.timezone ?? 'UTC',
      });

      // Cache for 1 hour
      await setCache(`notification_preferences:${userId}`, preferences, 3600);

      return preferences;
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw new AppError('Failed to update notification preferences', 500);
    }
  }

  private shouldSendNotification(type: NotificationType, preferences: NotificationPreference): boolean {
    switch (type) {
      case 'EVENT':
        return preferences.eventNotifications;
      case 'STREAM':
        return preferences.streamNotifications;
      case 'CHAT':
        return preferences.chatNotifications;
      case 'TICKET':
        return preferences.ticketNotifications;
      case 'PAYMENT':
      case 'REFUND':
        return preferences.paymentNotifications;
      case 'CREATOR':
        return preferences.creatorNotifications;
      case 'ADMIN':
      case 'SYSTEM':
      case 'SECURITY':
        return preferences.adminNotifications;
      case 'IN_APP':
      default:
        return preferences.inAppEnabled;
    }
  }
}

export const notificationService = new NotificationService();
