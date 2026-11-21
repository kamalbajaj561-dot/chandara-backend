import { NotificationController } from '../notification.controller';
import { notificationService } from '../../services/notification.service';
import { Notification, NotificationPreference } from '../../types';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../services/notification.service');

describe('NotificationController', () => {
  let mockRequest: Partial<Request & { user?: { userId: string; role: string; email: string; type: string; iat: number; exp: number } }>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: { userId: 'user-123', email: 'test@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should get notifications successfully', async () => {
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

      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.listNotifications as jest.Mock).mockResolvedValue({
        notifications: mockNotifications,
        total: 5,
      });

      await NotificationController.getNotifications(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotifications,
        total: 5,
        pagination: {
          page: 1,
          limit: 50,
          total: 5,
          totalPages: 1,
        },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await NotificationController.getNotifications(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        message: 'User not authenticated',
      }));
    });
  });

  describe('getNotification', () => {
    it('should get single notification successfully', async () => {
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

      mockRequest.params = { id: 'notification123' };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.getNotification as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationController.getNotification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotification,
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await NotificationController.getNotification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        message: 'User not authenticated',
      }));
    });
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
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

      mockRequest.body = {
        targetUserId: 'user123',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
      };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };

      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotification,
      });
    });

    it('should allow admin to send to other users', async () => {
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

      mockRequest.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockRequest.body = {
        targetUserId: 'user456',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
      };

      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should deny non-admin from sending to other users', async () => {
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockRequest.body = {
        targetUserId: 'user456',
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
      };

      await NotificationController.createNotification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: 'Access denied. Only admins can send notifications to other users.',
      }));
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
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: 'notification123' };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.markAsRead as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationController.markAsRead(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotification,
      });
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
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { id: 'notification123' };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.markAsUnread as jest.Mock).mockResolvedValue(mockNotification);

      await NotificationController.markAsUnread(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotification,
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.markAllAsRead as jest.Mock).mockResolvedValue(undefined);

      await NotificationController.markAllAsRead(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All notifications marked as read',
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockRequest.params = { id: 'notification123' };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.deleteNotification as jest.Mock).mockResolvedValue(undefined);

      await NotificationController.deleteNotification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification deleted successfully',
      });
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications successfully', async () => {
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.deleteAllNotifications as jest.Mock).mockResolvedValue(undefined);

      await NotificationController.deleteAllNotifications(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'All notifications deleted successfully',
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.getUnreadCount as jest.Mock).mockResolvedValue(5);

      await NotificationController.getUnreadCount(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { count: 5 },
      });
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

      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.getPreferences as jest.Mock).mockResolvedValue(mockPreferences);

      await NotificationController.getPreferences(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences,
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
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

      mockRequest.body = { inAppEnabled: false };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.updatePreferences as jest.Mock).mockResolvedValue(mockPreferences);

      await NotificationController.updatePreferences(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPreferences,
      });
    });
  });

  describe('searchNotifications', () => {
    it('should search notifications successfully', async () => {
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

      mockRequest.query = { q: 'test' };
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      (notificationService.searchNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      await NotificationController.searchNotifications(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotifications,
      });
    });

    it('should return 400 if search query missing', async () => {
      mockRequest.query = {};
      mockRequest.user = { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };

      await NotificationController.searchNotifications(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Search query is required',
      }));
    });
  });
});
