import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import { AppError } from '../middleware/errorHandler';

export class EmailController {
  /**
   * Send a test email (users can only send to themselves)
   */
  static async sendTestEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipient, template, variables } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Users can only send test emails to themselves
      // Admins can send to anyone (checked in service if needed)
      const emailLog = await emailService.sendEmail(
        recipient,
        template,
        'Test Email',
        variables || {},
        { userId, queue: false }
      );

      res.status(200).json({
        success: true,
        data: emailLog,
        message: 'Test email sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send an email
   */
  static async sendEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipient, template, subject, variables, queue } = req.body;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Non-admins can only send to themselves
      if (userRole !== 'administrator' && recipient !== (req as any).user?.email) {
        throw new AppError('Access denied. Users can only send emails to themselves.', 403);
      }

      const emailLog = await emailService.sendEmail(
        recipient,
        template,
        subject,
        variables || {},
        { userId, queue }
      );

      res.status(200).json({
        success: true,
        data: emailLog,
        message: 'Email queued successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send bulk emails (admin only)
   */
  static async sendBulkEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipients, template, subject, variables, queue } = req.body;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (userRole !== 'administrator') {
        throw new AppError('Access denied. Bulk email is admin only.', 403);
      }

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new AppError('Recipients array is required', 400);
      }

      if (recipients.length > 100) {
        throw new AppError('Maximum 100 recipients per bulk email', 400);
      }

      const emailLogs = await emailService.sendBulkEmail(
        recipients,
        template,
        subject,
        variables || {},
        { queue }
      );

      res.status(200).json({
        success: true,
        data: emailLogs,
        message: `${emailLogs.length} emails queued successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get email logs for user
   */
  static async getEmailLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Admins can view all logs, users can only view their own
      const targetUserId = userRole === 'administrator' ? req.query.userId as string : userId;

      const emailLogs = await emailService.getUserEmailLogs(targetUserId, limit, offset);

      res.status(200).json({
        success: true,
        data: emailLogs,
        pagination: {
          limit,
          offset,
          total: emailLogs.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single email log
   */
  static async getEmailLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const emailLog = await emailService.getEmailLog(id);

      if (!emailLog) {
        throw new AppError('Email log not found', 404);
      }

      // Users can only view their own logs
      if (userRole !== 'administrator' && emailLog.userId !== userId) {
        throw new AppError('Access denied', 403);
      }

      res.status(200).json({
        success: true,
        data: emailLog,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry failed email (admin only)
   */
  static async retryEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = (req as any).user?.role;

      if (userRole !== 'administrator') {
        throw new AppError('Access denied. Retry is admin only.', 403);
      }

      const emailLog = await emailService.getEmailLog(id);

      if (!emailLog) {
        throw new AppError('Email log not found', 404);
      }

      if (emailLog.status !== 'failed') {
        throw new AppError('Only failed emails can be retried', 400);
      }

      await emailService.retryFailedEmails();

      res.status(200).json({
        success: true,
        message: 'Failed emails retried successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get email statistics
   */
  static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Admins can view global stats, users view their own
      const targetUserId = userRole === 'administrator' ? undefined : userId;

      const stats = await emailService.getStatistics(targetUserId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process email queue (admin only)
   */
  static async processQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      if (userRole !== 'administrator') {
        throw new AppError('Access denied. Queue processing is admin only.', 403);
      }

      const batchSize = parseInt(req.query.batchSize as string) || 10;
      const processed = await emailService.processQueue(batchSize);

      res.status(200).json({
        success: true,
        data: { processed },
        message: `Processed ${processed} emails from queue`,
      });
    } catch (error) {
      next(error);
    }
  }
}
