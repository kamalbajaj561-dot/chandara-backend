import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { AppError } from '../middleware/errorHandler';

/**
 * Analytics Controller
 * Handles analytics API endpoints
 */
/** The only event types the public /analytics/track endpoint accepts. */
export const CLIENT_REPORTABLE_EVENT_TYPES = ['page_view', 'event_view'];

export class AnalyticsController {
  /**
   * Get platform analytics
   * GET /analytics/platform
   */
  async getPlatformAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getPlatformAnalytics(start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get revenue analytics
   * GET /analytics/revenue
   */
  async getRevenueAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getRevenueAnalytics(start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get creator analytics
   * GET /analytics/creator/:id
   */
  async getCreatorAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getCreatorAnalytics(id, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get event analytics
   * GET /analytics/event/:id
   */
  async getEventAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getEventAnalytics(id, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user analytics
   * GET /analytics/user
   */
  async getUserAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req.user as any)?.id;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getUserAnalytics(userId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat analytics
   * GET /analytics/chat/:eventId
   */
  async getChatAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getChatAnalytics(eventId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get streaming analytics
   * GET /analytics/stream/:eventId
   */
  async getStreamingAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const analytics = await analyticsService.getStreamingAnalytics(eventId, start, end);

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard summary
   * GET /analytics/dashboard
   */
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await analyticsService.getDashboardSummary();

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trends
   * GET /analytics/trends
   */
  async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { period = '7d' } = req.query;

      let days = 7;
      if (period === '30d') days = 30;
      if (period === '90d') days = 90;
      if (period === '1y') days = 365;

      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const end = new Date();

      const platform = await analyticsService.getPlatformAnalytics(start, end);
      const revenue = await analyticsService.getRevenueAnalytics(start, end);

      res.status(200).json({
        success: true,
        data: {
          platform,
          revenue,
          period,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Track an event
   * POST /analytics/track
   */
  async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventType, data } = req.body;

      if (!eventType) {
        throw new AppError('Event type is required', 400);
      }
      // Browsers may only report passive engagement. Purchases, payments, refunds and stream events are recorded
      // by the server itself, so they can never be forged through this public endpoint.
      if (!CLIENT_REPORTABLE_EVENT_TYPES.includes(eventType)) {
        throw new AppError('This event type cannot be reported by clients', 400);
      }
      // Identity comes from the verified token, never from the request body.
      const { userId: _u, creatorId: _c, ...rest } = (data || {}) as Record<string, any>;
      const trusted = { ...rest, userId: (req.user as any)?.id };

      const eventId = await analyticsService.trackEvent(eventType, trusted);

      res.status(201).json({
        success: true,
        data: { eventId },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
