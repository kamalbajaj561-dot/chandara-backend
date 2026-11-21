import { PlatformAnalyticsRepository } from '../platformAnalytics.repository';
import { PlatformAnalytics } from '../../types';
import { getFirestore } from '../../services/firebase';

jest.mock('../../services/firebase');

describe('PlatformAnalyticsRepository', () => {
  let repository: PlatformAnalyticsRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockTimestamp: any;

  beforeEach(() => {
    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      data: jest.fn(),
    };

    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      get: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      get: jest.fn(),
      set: jest.fn(),
      orderBy: jest.fn(() => mockQuery),
    };

    mockDb = {
      collection: jest.fn(() => mockCollection),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new PlatformAnalyticsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('should create new platform analytics', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsert('2024-01-01', { totalUsers: 100 });

      expect(mockDb.collection).toHaveBeenCalledWith('analytics_platform');
      expect(mockCollection.doc).toHaveBeenCalledWith('platform-2024-01-01');
      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should update existing platform analytics', async () => {
      const existing: PlatformAnalytics = {
        id: 'platform-2024-01-01',
        date: '2024-01-01',
        totalUsers: 50,
        activeUsers: 25,
        newUsers: 10,
        totalCreators: 5,
        activeCreators: 3,
        totalEvents: 10,
        activeEvents: 5,
        totalTicketsSold: 100,
        totalRevenue: 1000,
        totalStreamMinutes: 600,
        totalMessages: 50,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'platform-2024-01-01',
        data: () => existing,
      });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsert('2024-01-01', { totalUsers: 100 });

      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find by ID', async () => {
      const mockAnalytics: PlatformAnalytics = {
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
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'platform-2024-01-01',
        data: () => mockAnalytics,
      });

      const result = await repository.findById('platform-2024-01-01');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('platform-2024-01-01');
      expect(result?.totalUsers).toBe(100);
    });

    it('should return null if not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await repository.findById('platform-2024-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getByDateRange', () => {
    it('should get analytics by date range', async () => {
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
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockAnalytics.map(a => ({
          id: a.id,
          data: () => a,
        })),
      });

      const result = await repository.getByDateRange(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toHaveLength(1);
      expect(result[0].totalUsers).toBe(100);
    });
  });

  describe('getLatest', () => {
    it('should get latest analytics', async () => {
      const mockAnalytics: PlatformAnalytics = {
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
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: 'platform-2024-01-01',
            data: () => mockAnalytics,
          },
        ],
      });

      const result = await repository.getLatest();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('platform-2024-01-01');
      expect(result?.totalUsers).toBe(100);
    });

    it('should return null if no analytics exist', async () => {
      mockQuery.get.mockResolvedValue({ docs: [], empty: true });

      const result = await repository.getLatest();

      expect(result).toBeNull();
    });
  });

  describe('getGrowthMetrics', () => {
    it('should get growth metrics', async () => {
      const mockAnalytics = [
        {
          date: '2024-01-01',
          totalUsers: 100,
          newUsers: 10,
          totalRevenue: 1000,
        },
        {
          date: '2024-01-02',
          totalUsers: 110,
          newUsers: 10,
          totalRevenue: 1100,
        },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockAnalytics.map(a => ({
          data: () => a,
        })),
      });

      const growth = await repository.getGrowthMetrics(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(growth.userGrowth).toBeGreaterThan(0);
      expect(growth.revenueGrowth).toBeGreaterThan(0);
    });
  });
});
