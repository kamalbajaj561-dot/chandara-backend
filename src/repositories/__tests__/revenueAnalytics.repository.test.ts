import { RevenueAnalyticsRepository } from '../revenueAnalytics.repository';
import { RevenueAnalytics } from '../../types';
import { getFirestore } from '../../services/firebase';

jest.mock('../../services/firebase');

describe('RevenueAnalyticsRepository', () => {
  let repository: RevenueAnalyticsRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;

  beforeEach(() => {
    mockDb = {
      collection: jest.fn(),
    };
    mockCollection = {
      doc: jest.fn(),
      where: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      orderBy: jest.fn(),
    };
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockDb.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.where.mockReturnValue(mockCollection);
    mockCollection.orderBy.mockReturnValue(mockCollection);

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new RevenueAnalyticsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('should create new revenue analytics', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsert('2024-01-01', { grossRevenue: 1000 });

      expect(mockDb.collection).toHaveBeenCalledWith('analytics_revenue');
      expect(mockCollection.doc).toHaveBeenCalledWith('revenue-2024-01-01');
      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should update existing revenue analytics', async () => {
      const existing: RevenueAnalytics = {
        id: 'revenue-2024-01-01',
        date: '2024-01-01',
        grossRevenue: 500,
        netRevenue: 400,
        platformFees: 50,
        taxes: 50,
        refunds: 0,
        coupons: 0,
        averageOrderValue: 50,
        revenueByEvent: {},
        revenueByCreator: {},
        revenueByCountry: {},
        revenueByCurrency: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'revenue-2024-01-01',
        data: () => existing,
      });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsert('2024-01-01', { grossRevenue: 1000 });

      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find by ID', async () => {
      const mockAnalytics: RevenueAnalytics = {
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
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'revenue-2024-01-01',
        data: () => mockAnalytics,
      });

      const result = await repository.findById('revenue-2024-01-01');

      expect(result).toHaveProperty('id', 'revenue-2024-01-01');
    });

    it('should return null if not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await repository.findById('revenue-2024-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getByDateRange', () => {
    it('should get analytics by date range', async () => {
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

      const mockSnapshot = {
        docs: mockAnalytics.map(a => ({
          data: () => a,
        })),
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await repository.getByDateRange(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toHaveLength(1);
      expect(result[0].grossRevenue).toBe(1000);
    });
  });

  describe('getStatistics', () => {
    it('should get statistics', async () => {
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
          revenueByEvent: { 'event-1': 500, 'event-2': 500 },
          revenueByCreator: { 'creator-1': 1000 },
          revenueByCountry: { 'US': 1000 },
          revenueByCurrency: { 'USD': 1000 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockSnapshot = {
        docs: mockAnalytics.map(a => ({
          data: () => a,
        })),
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const stats = await repository.getStatistics(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(stats.totalGrossRevenue).toBe(1000);
      expect(stats.totalNetRevenue).toBe(800);
      expect(stats.totalPlatformFees).toBe(100);
      expect(stats.totalRefunds).toBe(0);
      expect(stats.refundRate).toBe(0);
    });
  });
});
