import { getFirestore } from '../firebase';
import { adminDashboardService } from '../adminDashboard.service';
import { getCache, deleteCache } from '../redis';

// Mock dependencies
jest.mock('../../repositories/audit.repository');
jest.mock('../redis');
jest.mock('../firebase', () => ({ getFirestore: jest.fn() }));

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
    const makeDb = (counts: Record<string, number>, opts: { failCollection?: string; revenue?: number } = {}) => ({
      collection: (name: string) => {
        const filters: any[] = [];
        const q: any = {
          where: (...f: any[]) => { filters.push(f); return q; },
          count: () => ({
            get: async () => {
              if (opts.failCollection === name) throw new Error('index required');
              const key = filters.map((f) => `${f[0]}${f[1]}${JSON.stringify(f[2])}`).join('&');
              return { data: () => ({ count: counts[`${name}|${key}`] ?? counts[name] ?? 0 }) };
            },
          }),
          aggregate: () => ({
            get: async () => {
              if (opts.failCollection === name) throw new Error('index required');
              return { data: () => ({ total: opts.revenue ?? 0 }) };
            },
          }),
        };
        return q;
      },
    });

    it('returns real counts from Firestore aggregation queries', async () => {
      (getFirestore as jest.Mock).mockReturnValue(makeDb({
        users: 1000,
        'users|status=="active"': 500,
        events: 200,
        'events|status=="live"': 10,
        'events|status=="pending"': 4,
        tickets: 321,
        chat_messages: 77,
      }, { revenue: 12345 }));

      const summary = await adminDashboardService.getDashboardSummary();

      expect(summary.totalUsers).toBe(1000);
      expect(summary.activeUsers).toBe(500);
      expect(summary.totalEvents).toBe(200);
      expect(summary.liveEvents).toBe(10);
      expect(summary.pendingEvents).toBe(4);
      expect(summary.totalTickets).toBe(321);
      expect(summary.totalMessages).toBe(77);
      expect(summary.totalRevenue).toBe(12345);
    });

    it('reports an unavailable metric as null instead of a fabricated 0', async () => {
      (getFirestore as jest.Mock).mockReturnValue(makeDb({ users: 5 }, { failCollection: 'orders' }));

      const summary = await adminDashboardService.getDashboardSummary();

      expect(summary.totalUsers).toBe(5);
      expect(summary.totalRevenue).toBeNull();
      expect(summary.monthlyRevenue).toBeNull();
      expect(summary.pendingVerifications).toBeNull(); // no data source exists
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
