import { adminDashboardService } from '../adminDashboard.service';
import { platformAnalyticsRepository } from '../../repositories/platformAnalytics.repository';
import { revenueAnalyticsRepository } from '../../repositories/revenueAnalytics.repository';
import { getCache, deleteCache } from '../redis';

// Mock dependencies
jest.mock('../../repositories/platformAnalytics.repository');
jest.mock('../../repositories/revenueAnalytics.repository');
jest.mock('../../repositories/audit.repository');
jest.mock('../redis');

describe('AdminDashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { auditRepository } = require('../../repositories/audit.repository');
    auditRepository.getPaginated = jest.fn().mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      limit: 10
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data with summary, health, activity, and alerts', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });

      const dashboard = await adminDashboardService.getDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.platformHealth).toBeDefined();
      expect(dashboard.recentActivity).toBeDefined();
      expect(dashboard.alerts).toBeDefined();
    });

    it('should return cached dashboard data if available', async () => {
      const cachedDashboard = {
        summary: { totalUsers: 1000, activeUsers: 500, totalCreators: 100, activeCreators: 50, totalEvents: 200, liveEvents: 10, totalRevenue: 50000, monthlyRevenue: 10000, totalTickets: 1000, monthlyTickets: 200, totalStreams: 300, activeStreams: 15, totalMessages: 5000, pendingReports: 5, pendingVerifications: 3, systemStatus: 'healthy' as const },
        platformHealth: { firestore: { status: 'healthy' as const, lastCheck: new Date() }, redis: { status: 'healthy' as const, lastCheck: new Date() }, livekit: { status: 'healthy' as const, lastCheck: new Date() }, queue: { status: 'healthy' as const, lastCheck: new Date() }, scheduler: { status: 'healthy' as const, lastCheck: new Date() }, email: { status: 'healthy' as const, lastCheck: new Date() }, push: { status: 'healthy' as const, lastCheck: new Date() }, workers: [], system: { cpu: 50, memory: 60, disk: 40, uptime: 3600, loadAverage: [0.5, 0.6, 0.7] } },
        recentActivity: [],
        alerts: [],
      };

      (getCache as jest.Mock).mockResolvedValue({ data: cachedDashboard });

      const dashboard = await adminDashboardService.getDashboard();

      expect(dashboard).toEqual(cachedDashboard);
      expect(getCache).toHaveBeenCalledWith('admin:dashboard:summary');
    });
  });

  describe('getDashboardSummary', () => {
    it('should return dashboard summary with platform stats', async () => {
      const mockPlatformStats = {
        totalUsers: 1000,
        activeUsers: 500,
        totalCreators: 100,
        activeCreators: 50,
        totalEvents: 200,
        activeEvents: 10,
        totalTicketsSold: 1000,
        monthlyTickets: 200,
        totalRevenue: 50000,
      };

      const mockRevenueStats = {
        totalGrossRevenue: 10000,
      };

      (platformAnalyticsRepository.getLatest as jest.Mock).mockResolvedValue(mockPlatformStats);
      (revenueAnalyticsRepository.getStatistics as jest.Mock).mockResolvedValue(mockRevenueStats);

      const summary = await adminDashboardService.getDashboardSummary();

      expect(summary).toBeDefined();
      expect(summary.totalUsers).toBe(1000);
      expect(summary.activeUsers).toBe(500);
      expect(summary.totalRevenue).toBe(50000);
      expect(summary.monthlyRevenue).toBe(10000);
    });
  });

  describe('getPlatformHealth', () => {
    it('should return platform health status', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });

      const health = await adminDashboardService.getPlatformHealth();

      expect(health).toBeDefined();
      expect(health.firestore).toBeDefined();
      expect(health.redis).toBeDefined();
      expect(health.system).toBeDefined();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate all dashboard cache keys', async () => {
      await adminDashboardService.invalidateCache();

      expect(deleteCache).toHaveBeenCalledWith('admin:dashboard:summary');
      expect(deleteCache).toHaveBeenCalledWith('admin:dashboard:health');
      expect(deleteCache).toHaveBeenCalledWith('admin:dashboard:activity');
      expect(deleteCache).toHaveBeenCalledWith('admin:dashboard:alerts');
    });
  });
});
