import { AnalyticsAggregationService } from '../analyticsAggregation.service';
import { analyticsRepository } from '../../repositories/analytics.repository';
import { revenueAnalyticsRepository } from '../../repositories/revenueAnalytics.repository';
import { creatorAnalyticsRepository } from '../../repositories/creatorAnalytics.repository';
import { platformAnalyticsRepository } from '../../repositories/platformAnalytics.repository';
import { analyticsCacheService } from '../analyticsCache.service';

jest.mock('../../repositories/analytics.repository');
jest.mock('../../repositories/revenueAnalytics.repository');
jest.mock('../../repositories/creatorAnalytics.repository');
jest.mock('../../repositories/platformAnalytics.repository');
jest.mock('../analyticsCache.service');

describe('AnalyticsAggregationService', () => {
  let aggregationService: AnalyticsAggregationService;

  beforeEach(() => {
    aggregationService = new AnalyticsAggregationService();
    jest.clearAllMocks();
  });

  describe('Hourly Aggregation', () => {
    it('should aggregate hourly analytics', async () => {
      const mockStats = {
        totalEvents: 100,
        eventsByType: { page_view: 50 },
        uniqueUsers: 10,
        uniqueCreators: 5,
        uniqueEvents: 3,
      };
      (analyticsRepository.getStatistics as jest.Mock).mockResolvedValue(mockStats);
      (analyticsCacheService.setAggregatedHourly as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateHourly('2024-01-01', 12);

      expect(analyticsRepository.getStatistics).toHaveBeenCalled();
      expect(analyticsCacheService.setAggregatedHourly).toHaveBeenCalledWith(
        '2024-01-01',
        12,
        mockStats
      );
    });

    it('should handle errors during hourly aggregation', async () => {
      (analyticsRepository.getStatistics as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(aggregationService.aggregateHourly('2024-01-01', 12)).rejects.toThrow('DB Error');
    });
  });

  describe('Daily Aggregation', () => {
    it('should aggregate daily analytics', async () => {
      const mockStats = {
        totalEvents: 100,
        eventsByType: { ticket_purchase: 20 },
        uniqueUsers: 10,
        uniqueCreators: 5,
        uniqueEvents: 3,
      };
      (analyticsRepository.getStatistics as jest.Mock).mockResolvedValue(mockStats);
      (platformAnalyticsRepository.upsert as jest.Mock).mockResolvedValue(undefined);
      (analyticsCacheService.setPlatformDashboard as jest.Mock).mockResolvedValue(undefined);
      (analyticsCacheService.invalidateAggregatedDaily as jest.Mock).mockResolvedValue(undefined);
      (analyticsRepository.getEventsByType as jest.Mock).mockResolvedValue([]);
      (analyticsCacheService.setRevenueDashboard as jest.Mock).mockResolvedValue(undefined);
      (analyticsRepository.getEventsByCreator as jest.Mock).mockResolvedValue([]);
      (analyticsCacheService.setCreatorAnalytics as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateDaily('2024-01-01');

      expect(platformAnalyticsRepository.upsert).toHaveBeenCalled();
      expect(analyticsCacheService.setPlatformDashboard).toHaveBeenCalled();
      expect(analyticsCacheService.invalidateAggregatedDaily).toHaveBeenCalledWith('2024-01-01');
    });

    it('should aggregate revenue daily analytics', async () => {
      const mockPaymentEvents = [
        { eventId: 'event-1', creatorId: 'creator-1', data: { amount: 100, country: 'US', currency: 'USD' } },
      ];
      const mockRefundEvents = [{ data: { amount: 50 } }];
      (analyticsRepository.getEventsByType as jest.Mock)
        .mockResolvedValueOnce(mockPaymentEvents)
        .mockResolvedValueOnce(mockRefundEvents);
      (revenueAnalyticsRepository.upsert as jest.Mock).mockResolvedValue(undefined);
      (analyticsCacheService.setRevenueDashboard as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateDaily('2024-01-01');

      expect(revenueAnalyticsRepository.upsert).toHaveBeenCalled();
      expect(analyticsCacheService.setRevenueDashboard).toHaveBeenCalled();
    });

    it('should aggregate creator daily analytics', async () => {
      const mockFollowEvents = [{ creatorId: 'creator-1' }];
      const mockCreatorEvents = [
        { eventType: 'follow', eventId: 'event-1', data: {} },
        { eventType: 'payment_success', eventId: 'event-1', data: { amount: 100 } },
      ];
      (analyticsRepository.getEventsByType as jest.Mock).mockResolvedValue(mockFollowEvents);
      (analyticsRepository.getEventsByCreator as jest.Mock).mockResolvedValue(mockCreatorEvents);
      (creatorAnalyticsRepository.upsert as jest.Mock).mockResolvedValue(undefined);
      (analyticsCacheService.setCreatorAnalytics as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateDaily('2024-01-01');

      expect(creatorAnalyticsRepository.upsert).toHaveBeenCalledWith('creator-1', '2024-01-01', expect.any(Object));
      expect(analyticsCacheService.setCreatorAnalytics).toHaveBeenCalled();
    });
  });

  describe('Weekly Aggregation', () => {
    it('should aggregate weekly analytics', async () => {
      const mockDailyData = { totalRevenue: 1000, totalUsers: 50 };
      (analyticsCacheService.getAggregatedDaily as jest.Mock).mockResolvedValue(mockDailyData);
      (analyticsCacheService.setAggregatedWeekly as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateWeekly(2024, 1);

      expect(analyticsCacheService.getAggregatedDaily).toHaveBeenCalled();
      expect(analyticsCacheService.setAggregatedWeekly).toHaveBeenCalledWith(2024, 1, expect.any(Object));
    });

    it('should handle missing daily data in weekly aggregation', async () => {
      (analyticsCacheService.getAggregatedDaily as jest.Mock).mockResolvedValue(null);
      (analyticsCacheService.setAggregatedWeekly as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateWeekly(2024, 1);

      expect(analyticsCacheService.setAggregatedWeekly).toHaveBeenCalledWith(2024, 1, expect.any(Object));
    });
  });

  describe('Monthly Aggregation', () => {
    it('should aggregate monthly analytics', async () => {
      const mockWeeklyData = { totalRevenue: 5000, totalUsers: 200 };
      (analyticsCacheService.getAggregatedWeekly as jest.Mock).mockResolvedValue(mockWeeklyData);
      (analyticsCacheService.setAggregatedMonthly as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateMonthly(2024, 1);

      expect(analyticsCacheService.getAggregatedWeekly).toHaveBeenCalled();
      expect(analyticsCacheService.setAggregatedMonthly).toHaveBeenCalledWith(2024, 1, expect.any(Object));
    });
  });

  describe('Yearly Aggregation', () => {
    it('should aggregate yearly analytics', async () => {
      const mockMonthlyData = { totalRevenue: 50000, totalUsers: 2000 };
      (analyticsCacheService.getAggregatedMonthly as jest.Mock).mockResolvedValue(mockMonthlyData);
      (analyticsCacheService.setAggregatedYearly as jest.Mock).mockResolvedValue(undefined);

      await aggregationService.aggregateYearly(2024);

      expect(analyticsCacheService.getAggregatedMonthly).toHaveBeenCalled();
      expect(analyticsCacheService.setAggregatedYearly).toHaveBeenCalledWith(2024, expect.any(Object));
    });
  });

  describe('Trigger Methods', () => {
    it('should trigger daily aggregation for yesterday', async () => {
      const mockAggregateDaily = jest.spyOn(aggregationService, 'aggregateDaily').mockResolvedValue(undefined);

      await aggregationService.triggerDailyAggregation();

      expect(mockAggregateDaily).toHaveBeenCalled();
      const dateArg = mockAggregateDaily.mock.calls[0][0];
      expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should trigger hourly aggregation for previous hour', async () => {
      const mockAggregateHourly = jest.spyOn(aggregationService, 'aggregateHourly').mockResolvedValue(undefined);

      await aggregationService.triggerHourlyAggregation();

      expect(mockAggregateHourly).toHaveBeenCalled();
      const [dateArg, hourArg] = mockAggregateHourly.mock.calls[0];
      expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof hourArg).toBe('number');
    });

    it('should trigger weekly aggregation for previous week', async () => {
      const mockAggregateWeekly = jest.spyOn(aggregationService, 'aggregateWeekly').mockResolvedValue(undefined);

      await aggregationService.triggerWeeklyAggregation();

      expect(mockAggregateWeekly).toHaveBeenCalled();
    });

    it('should trigger monthly aggregation for previous month', async () => {
      const mockAggregateMonthly = jest.spyOn(aggregationService, 'aggregateMonthly').mockResolvedValue(undefined);

      await aggregationService.triggerMonthlyAggregation();

      expect(mockAggregateMonthly).toHaveBeenCalled();
    });

    it('should trigger yearly aggregation for previous year', async () => {
      const mockAggregateYearly = jest.spyOn(aggregationService, 'aggregateYearly').mockResolvedValue(undefined);

      await aggregationService.triggerYearlyAggregation();

      expect(mockAggregateYearly).toHaveBeenCalled();
    });
  });
});
