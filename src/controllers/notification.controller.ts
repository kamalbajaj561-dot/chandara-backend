import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AppError } from '../middleware/errorHandler';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;
      const priority = req.query.priority as string;

      const result = await notificationService.listNotifications(
        userId,
        limit,
        offset,
        type as any,
        priority as any
      );

      res.status(200).json({
        success: true,
        data: result.notifications,
        total: result.total,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      const notification = await notificationService.getNotification(id, userId);

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const isAdmin = req.user?.role === 'administrator';

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { targetUserId, type, title, message, data, priority, expiresAt } = req.body;

      if (!isAdmin && targetUserId !== userId) {
        throw new AppError('Access denied. Only admins can send notifications to other users.', 403);
      }

      const notification = await notificationService.createNotification({
        userId: targetUserId || userId,
        type,
        title,
        message,
        data,
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsUnread(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      const notification = await notificationService.markAsUnread(id, userId);

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await notificationService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      await notificationService.deleteNotification(id, userId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAllNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await notificationService.deleteAllNotifications(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const count = await notificationService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const preferences = await notificationService.getPreferences(userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const preferences = await notificationService.updatePreferences(userId, req.body);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await notificationService.searchNotifications(userId, q, limit);

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }
}
