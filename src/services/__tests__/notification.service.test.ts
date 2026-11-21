import { NotificationService } from '../notification.service';
import { notificationRepository } from '../../repositories/notification.repository';
import { notificationPreferenceRepository } from '../../repositories/notificationPreference.repository';
import { Notification, NotificationType, NotificationPriority, NotificationPreference } from '../../types';
import { getCache, setCache, deleteCache } from '../redis';

jest.mock('../../repositories/notification.repository');
jest.mock('../../repositories/notificationPreference.repository');
jest.mock('../redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
}));

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
    (getCache as jest.Mock).mockResolvedValue({ data: null });
    (setCache as jest.Mock).mockResolvedValue(undefined);
    (deleteCache as jest.Mock).mockResolvedValue(undefined);
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const mockNotification: Notification = {
        notificationId: 'notification123',
        userId: 'user123',
        type: 'EVENT' as NotificationType,
        title: 'Test Notification',
        message: 'Test message',
        priority: 'normal' as NotificationPriority,
        status: 'sent',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (notificationRepository.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: 'user123',
        type: 'EVENT',
        title: 'Test Notification',
        message: 'Test message',
      });

      expect(result).toBeDefined();
      expect(result.notificationId).toBe('notification123');
    });

    it('should throw error if in-app notifications disabled', async () => {
      const mockPreferences: NotificationPreference = {
        userId: 'user123',
        inAppEnabled: false,
        eventNotifications: true,
        streamNotifications: true,
        chatNotifications: true,
        ticketNotifications: true,
        paymentNotifications: true,
        creatorNotifications: true,
        adminNotifications: true,
        language: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(mockPreferences);

      await expect(
        service.createNotification({
          userId: 'user123',
          type: 'EVENT',
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('In-app notifications are disabled for this user');
    });

    it('should throw error if notification type disabled', async () => {
      const mockPreferences: NotificationPreference = {
        userId: 'user123',
        inAppEnabled: true,
        eventNotifications: false,
        streamNotifications: true,
        chatNotifications: true,
        ticketNotifications: true,
        paymentNotifications: true,
        creatorNotifications: true,
        adminNotifications: true,
        language: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(mockPreferences);

      await expect(
        service.createNotification({
          userId: 'user123',
          type: 'EVENT',
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('This notification type is disabled for this user');
    });
  });

  describe('getNotification', () => {
    it('should get notification successfully', async () => {
      const mockNotification: Notification = {
        notificationId: 'notification123',
        userId: 'user123',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        priority: 'normal',
        status: 'sent',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationRepository.findById as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.getNotification('notification123', 'user123');

      expect(result).toBeDefined();
      expect(result.notificationId).toBe('notification123');
    });

    it('should throw error if notification not found', async () => {
      (notificationRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getNotification('nonexistent', 'user123')).rejects.toThrow('Notification not found');
    });

    it('should throw error if access denied', async () => {
      const mockNotification: Notification = {
        notificationId: 'notification123',
        userId: 'user456',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        priority: 'normal',
        status: 'sent',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationRepository.findById as jest.Mock).mockResolvedValue(mockNotification);

      await expect(service.getNotification('notification123', 'user123')).rejects.toThrow('Access denied');
    });
  });

  describe('listNotifications', () => {
    it('should list notifications successfully', async () => {
      const mockNotifications: Notification[] = [
        {
          notificationId: 'notification1',
          userId: 'user123',
          type: 'EVENT',
          title: 'Test 1',
          message: 'Message 1',
          priority: 'normal',
          status: 'sent',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (notificationRepository.findByUserId as jest.Mock).mockResolvedValue(mockNotifications);
      (notificationRepository.getUnreadCount as jest.Mock).mockResolvedValue(5);

      const result = await service.listNotifications('user123');

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockNotification: Notification = {
        notificationId: 'notification123',
        userId: 'user123',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        priority: 'normal',
        status: 'sent',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationRepository.findById as jest.Mock).mockResolvedValue(mockNotification);
      (notificationRepository.markAsRead as jest.Mock).mockResolvedValue({ ...mockNotification, read: true });

      const result = await service.markAsRead('notification123', 'user123');

      expect(result.read).toBe(true);
    });

    it('should throw error if notification not found', async () => {
      (notificationRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', 'user123')).rejects.toThrow('Notification not found');
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread successfully', async () => {
      const mockNotification: Notification = {
        notificationId: 'notification123',
        userId: 'user123',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        priority: 'normal',
        status: 'sent',
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationRepository.findById as jest.Mock).mockResolvedValue(mockNotification);
      (notificationRepository.markAsUnread as jest.Mock).mockResolvedValue({ ...mockNotification, read: false });

      const result = await service.markAsUnread('notification123', 'user123');

      expect(result.read).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      (notificationRepository.markAllAsRead as jest.Mock).mockResolvedValue(undefined);

      await service.markAllAsRead('user123');

      expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith('user123');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count', async () => {
      (notificationRepository.getUnreadCount as jest.Mock).mockResolvedValue(5);

      const result = await service.getUnreadCount('user123');

      expect(result).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const mockNotification: Notification = {
        notificationId: 'notification123',
        userId: 'user123',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        priority: 'normal',
        status: 'sent',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationRepository.findById as jest.Mock).mockResolvedValue(mockNotification);
      (notificationRepository.softDelete as jest.Mock).mockResolvedValue(true);

      await service.deleteNotification('notification123', 'user123');

      expect(notificationRepository.softDelete).toHaveBeenCalledWith('notification123');
    });

    it('should throw error if notification not found', async () => {
      (notificationRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteNotification('nonexistent', 'user123')).rejects.toThrow('Notification not found');
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications', async () => {
      (notificationRepository.deleteAllForUser as jest.Mock).mockResolvedValue(undefined);

      await service.deleteAllNotifications('user123');

      expect(notificationRepository.deleteAllForUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('getPreferences', () => {
    it('should get preferences successfully', async () => {
      const mockPreferences: NotificationPreference = {
        userId: 'user123',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(mockPreferences);

      const result = await service.getPreferences('user123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
    });

    it('should create default preferences if not exist', async () => {
      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (notificationPreferenceRepository.create as jest.Mock).mockImplementation((data) => Promise.resolve({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.getPreferences('user123');

      expect(result).toBeDefined();
      expect(result.inAppEnabled).toBe(true);
      expect(notificationPreferenceRepository.create).toHaveBeenCalled();
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const mockPreferences: NotificationPreference = {
        userId: 'user123',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(mockPreferences);
      (notificationPreferenceRepository.update as jest.Mock).mockResolvedValue({ ...mockPreferences, inAppEnabled: false });

      const result = await service.updatePreferences('user123', { inAppEnabled: false });

      expect(result.inAppEnabled).toBe(false);
    });

    it('should create preferences if not exist', async () => {
      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (notificationPreferenceRepository.create as jest.Mock).mockImplementation((data) => Promise.resolve({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.updatePreferences('user123', { inAppEnabled: false });

      expect(result).toBeDefined();
      expect(notificationPreferenceRepository.create).toHaveBeenCalled();
    });
  });

  describe('bulkSend', () => {
    it('should bulk send notifications successfully', async () => {
      const mockNotifications: Notification[] = [
        {
          notificationId: 'notification1',
          userId: 'user123',
          type: 'EVENT',
          title: 'Test 1',
          message: 'Message 1',
          priority: 'normal',
          status: 'sent',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (notificationPreferenceRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (notificationRepository.bulkInsert as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await service.bulkSend([
        {
          userId: 'user123',
          type: 'EVENT',
          title: 'Test 1',
          message: 'Message 1',
        },
      ]);

      expect(result).toHaveLength(1);
    });
  });
});
