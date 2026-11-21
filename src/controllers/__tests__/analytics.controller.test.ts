import { AnalyticsController } from '../analytics.controller';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../services/analytics.service');

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new AnalyticsController();

    mockReq = {
      query: {},
      params: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatformAnalytics', () => {
    it('should get platform analytics', async () => {
      const mockAnalytics = [
        {
          id: 'platform-2024-01-01',
          date: '2024-01-01',
          totalUsers: 100,
          activeUsers: 50,
          newUsers: 20,
          totalCreators: 10,
          activeCreators: 5,
          totalEvents: 20,
          activeEvents: 10,
          totalTicketsSold: 200,
          totalRevenue: 2000,
          totalStreamMinutes: 1200,
          totalMessages: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getPlatformAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getPlatformAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getPlatformAnalytics).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    it('should use default date range when not provided', async () => {
      mockReq.query = {};

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getPlatformAnalytics = jest.fn().mockResolvedValue([]);

      await controller.getPlatformAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getPlatformAnalytics).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getPlatformAnalytics = jest.fn().mockRejectedValue(new AppError('Error', 500));

      await controller.getPlatformAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should get revenue analytics', async () => {
      const mockAnalytics = [
        {
          id: 'revenue-2024-01-01',
          date: '2024-01-01',
          grossRevenue: 1000,
          netRevenue: 800,
          platformFees: 100,
          taxes: 100,
          refunds: 0,
          coupons: 0,
          averageOrderValue: 100,
          revenueByEvent: {},
          revenueByCreator: {},
          revenueByCountry: {},
          revenueByCurrency: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getRevenueAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getRevenueAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getRevenueAnalytics).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('getCreatorAnalytics', () => {
    it('should get creator analytics', async () => {
      const mockAnalytics = [
        {
          id: 'creator-123-2024-01-01',
          creatorId: 'creator-123',
          date: '2024-01-01',
          followers: 100,
          newFollowers: 10,
          revenue: 500,
          ticketsSold: 5,
          eventsHosted: 2,
          liveStreams: 2,
          averageAttendance: 50,
          totalViews: 100,
          rating: 4.5,
          reviewCount: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockReq.params = { id: 'creator-123' };
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getCreatorAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getCreatorAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getCreatorAnalytics).toHaveBeenCalledWith('creator-123', expect.any(Date), expect.any(Date));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('getEventAnalytics', () => {
    it('should get event analytics', async () => {
      const mockAnalytics = {
        totalViews: 100,
        uniqueVisitors: 50,
        registrations: 20,
        attendance: 15,
        peakConcurrentViewers: 10,
        averageWatchTime: 30,
        retention: 0.8,
        chatMessages: 50,
        revenue: 500,
        conversionRate: 0.25,
      };

      mockReq.params = { id: 'event-123' };
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getEventAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getEventAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getEventAnalytics).toHaveBeenCalledWith('event-123', expect.any(Date), expect.any(Date));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('getUserAnalytics', () => {
    it('should get user analytics', async () => {
      const mockAnalytics = {
        totalEvents: 10,
        totalTickets: 5,
        totalSpent: 500,
        favoriteCategories: ['music', 'sports'],
      };

      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getUserAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getUserAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getUserAnalytics).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('getChatAnalytics', () => {
    it('should get chat analytics', async () => {
      const mockAnalytics = {
        totalMessages: 100,
        uniqueSenders: 20,
        averageMessagesPerUser: 5,
        peakActivity: 50,
      };

      mockReq.params = { eventId: 'event-123' };
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getChatAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getChatAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getChatAnalytics).toHaveBeenCalledWith('event-123', expect.any(Date), expect.any(Date));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('getStreamingAnalytics', () => {
    it('should get streaming analytics', async () => {
      const mockAnalytics = {
        totalStreams: 5,
        totalViewers: 100,
        totalWatchTime: 3000,
        averageWatchTime: 30,
      };

      mockReq.params = { eventId: 'event-123' };
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getStreamingAnalytics = jest.fn().mockResolvedValue(mockAnalytics);

      await controller.getStreamingAnalytics(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getStreamingAnalytics).toHaveBeenCalledWith('event-123', expect.any(Date), expect.any(Date));
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });
  });

  describe('getDashboard', () => {
    it('should get dashboard summary', async () => {
      const mockSummary = {
        totalUsers: 100,
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getDashboardSummary = jest.fn().mockResolvedValue(mockSummary);

      await controller.getDashboard(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getDashboardSummary).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary,
      });
    });
  });

  describe('getTrends', () => {
    it('should get trends', async () => {
      mockReq.query = {
        period: '30d',
      };

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getPlatformAnalytics = jest.fn().mockResolvedValue({});
      analyticsService.getRevenueAnalytics = jest.fn().mockResolvedValue({});

      await controller.getTrends(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getPlatformAnalytics).toHaveBeenCalled();
      expect(analyticsService.getRevenueAnalytics).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          platform: {},
          revenue: {},
          period: '30d',
        },
      });
    });

    it('should use default period when not provided', async () => {
      mockReq.query = {};

      const analyticsService = require('../../services/analytics.service').analyticsService;
      analyticsService.getPlatformAnalytics = jest.fn().mockResolvedValue({});
      analyticsService.getRevenueAnalytics = jest.fn().mockResolvedValue({});

      await controller.getTrends(mockReq as Request, mockRes as Response, mockNext);

      expect(analyticsService.getPlatformAnalytics).toHaveBeenCalled();
      expect(analyticsService.getRevenueAnalytics).toHaveBeenCalled();
    });
  });

  describe('trackEvent', () => {
    it('should track an event', async () => {
      const eventData = {
        eventType: 'test_event',
        data: { test: 'data' },
      };

      mockReq.body = eventData;

      const analyticsService = require('../../services/analytics.service').analyticsService;
      (analyticsService as any).trackEvent = jest.fn().mockResolvedValue('event-123');

      await controller.trackEvent(mockReq as Request, mockRes as Response, mockNext);

      expect((analyticsService as any).trackEvent).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { eventId: 'event-123' },
      });
    });

    it('should handle tracking errors', async () => {
      const eventData = {
        eventType: 'test_event',
        data: { test: 'data' },
      };

      mockReq.body = eventData;

      const analyticsService = require('../../services/analytics.service').analyticsService;
      (analyticsService as any).trackEvent = jest.fn().mockRejectedValue(new AppError('Error', 500));

      await controller.trackEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
