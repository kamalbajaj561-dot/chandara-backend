import { Request, Response, NextFunction } from 'express';
import { deviceTokenRepository } from '../repositories/deviceToken.repository';
import { pushNotificationService } from '../services/pushNotification.service';
import { schedulerService } from '../services/scheduler.service';
import { pushLogRepository } from '../repositories/pushLog.repository';
import { scheduledNotificationRepository } from '../repositories/scheduledNotification.repository';
import { AppError } from '../middleware/errorHandler';

/**
 * Push Controller
 * Handles push notification API endpoints
 */
export class PushController {
  /**
   * Register device token
   * POST /push/register-device
   */
  async registerDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deviceId, token, platform, appVersion, deviceModel, osVersion, timezone, language } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Check if device already exists
      const existingDevice = await deviceTokenRepository.findById(deviceId);
      
      if (existingDevice) {
        // Update existing device
        await deviceTokenRepository.update(deviceId, {
          token,
          platform,
          appVersion,
          deviceModel,
          osVersion,
          timezone,
          language,
          lastSeen: new Date(),
          active: true,
        });
      } else {
        // Create new device
        await deviceTokenRepository.create({
          deviceId,
          userId,
          platform,
          token,
          appVersion,
          deviceModel,
          osVersion,
          timezone,
          language,
          lastSeen: new Date(),
          active: true,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Device registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete device token
   * DELETE /push/device/:id
   */
  async deleteDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const device = await deviceTokenRepository.findById(id);
      
      if (!device) {
        throw new AppError('Device not found', 404);
      }

      if (device.userId !== userId) {
        throw new AppError('Unauthorized to delete this device', 403);
      }

      await deviceTokenRepository.delete(id);

      res.status(200).json({
        success: true,
        message: 'Device deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send push notification
   * POST /push/send
   */
  async sendPush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, title, body, data, priority, ttl, silent } = req.body;

      const result = await pushNotificationService.sendToUser(userId, {
        title,
        body,
        data,
        priority,
        ttl,
        silent,
      });

      res.status(200).json({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send push to topic
   * POST /push/send-topic
   */
  async sendTopicPush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { topic, title, body, data, priority, ttl, silent } = req.body;

      const result = await pushNotificationService.sendToTopic(topic, {
        title,
        body,
        data,
        priority,
        ttl,
        silent,
      });

      res.status(200).json({
        success: result.success,
        error: result.error,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test push notification
   * POST /push/test
   */
  async testPush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const result = await pushNotificationService.sendToUser(userId, {
        title: 'Test Notification',
        body: 'This is a test push notification',
        data: { type: 'test' },
      });

      res.status(200).json({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get push logs
   * GET /push/logs
   */
  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { limit = 50, offset = 0 } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const logs = await pushLogRepository.findByUserId(
        userId,
        Number(limit),
        Number(offset)
      );

      const stats = await pushLogRepository.getStatistics(userId);

      res.status(200).json({
        success: true,
        logs,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule push notification
   * POST /push/schedule
   */
  async schedulePush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, title, body, scheduledFor, data } = req.body;
      const requestUserId = req.user?.userId;

      if (!requestUserId) {
        throw new AppError('User not authenticated', 401);
      }

      // Only allow scheduling for self or admins
      if (userId !== requestUserId && req.user?.role !== 'administrator') {
        throw new AppError('Unauthorized to schedule for this user', 403);
      }

      const scheduledDate = new Date(scheduledFor);
      const jobId = await schedulerService.schedulePushNotification(
        userId,
        title,
        body,
        scheduledDate,
        data
      );

      res.status(201).json({
        success: true,
        jobId,
        message: 'Push notification scheduled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update scheduled notification
   * PUT /push/schedule/:id
   */
  async updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { title, body, scheduledFor, data } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const notification = await scheduledNotificationRepository.findById(id);
      
      if (!notification) {
        throw new AppError('Scheduled notification not found', 404);
      }

      if (notification.userId !== userId && req.user?.role !== 'administrator') {
        throw new AppError('Unauthorized to update this schedule', 403);
      }

      await scheduledNotificationRepository.update(id, {
        title,
        body,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : notification.scheduledFor,
        data,
      });

      res.status(200).json({
        success: true,
        message: 'Schedule updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel scheduled notification
   * DELETE /push/schedule/:id
   */
  async cancelSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const notification = await scheduledNotificationRepository.findById(id);
      
      if (!notification) {
        throw new AppError('Scheduled notification not found', 404);
      }

      if (notification.userId !== userId && req.user?.role !== 'administrator') {
        throw new AppError('Unauthorized to cancel this schedule', 403);
      }

      await scheduledNotificationRepository.cancel(id);

      res.status(200).json({
        success: true,
        message: 'Schedule cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's scheduled notifications
   * GET /push/schedules
   */
  async getSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const schedules = await schedulerService.getUserScheduledNotifications(userId);

      res.status(200).json({
        success: true,
        schedules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's devices
   * GET /push/devices
   */
  async getDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const devices = await deviceTokenRepository.findByUserId(userId);
      const stats = await deviceTokenRepository.getUserDeviceStats(userId);

      res.status(200).json({
        success: true,
        devices,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheduler statistics (admin only)
   * GET /push/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'administrator') {
        throw new AppError('Unauthorized', 403);
      }

      const stats = await schedulerService.getSchedulerStatistics();

      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process queue (admin only - for manual trigger)
   * POST /push/process-queue
   */
  async processQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.role !== 'administrator') {
        throw new AppError('Unauthorized', 403);
      }

      const pendingJobs = await schedulerService.getPendingJobs();
      let processed = 0;

      for (const job of pendingJobs) {
        await schedulerService.execute(job.jobId);
        processed++;
      }

      res.status(200).json({
        success: true,
        processed,
        message: `Processed ${processed} jobs`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const pushController = new PushController();
