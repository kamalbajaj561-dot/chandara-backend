import { AnalyticsCacheService, CACHE_TTL } from '../analyticsCache.service';
import { getCache, setCache, deleteCache, deleteCachePattern } from '../redis';

jest.mock('../redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  deleteCachePattern: jest.fn(),
}));

describe('AnalyticsCacheService', () => {
  let cacheService: AnalyticsCacheService;

  beforeEach(() => {
    cacheService = new AnalyticsCacheService();
    jest.clearAllMocks();
    // Mock deleteCachePattern
    (deleteCachePattern as jest.Mock).mockResolvedValue(0);
  });

  describe('Platform Dashboard Cache', () => {
    it('should get platform dashboard from cache', async () => {
      const mockData = { totalUsers: 100, activeUsers: 50 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getPlatformDashboard('2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:platform:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should return null when cache miss', async () => {
      (getCache as jest.Mock).mockResolvedValue(null);

      const result = await cacheService.getPlatformDashboard('2024-01-01');

      expect(result).toBeNull();
    });

    it('should set platform dashboard in cache', async () => {
      const mockData = { totalUsers: 100 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setPlatformDashboard('2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:platform:2024-01-01',
        mockData,
        CACHE_TTL.PLATFORM_DASHBOARD
      );
    });

    it('should invalidate platform dashboard cache', async () => {
      (deleteCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidatePlatformDashboard('2024-01-01');

      expect(deleteCache).toHaveBeenCalledWith('analytics:platform:2024-01-01');
    });
  });

  describe('Revenue Dashboard Cache', () => {
    it('should get revenue dashboard from cache', async () => {
      const mockData = { grossRevenue: 1000, netRevenue: 900 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getRevenueDashboard('2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:revenue:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set revenue dashboard in cache', async () => {
      const mockData = { grossRevenue: 1000 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setRevenueDashboard('2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:revenue:2024-01-01',
        mockData,
        CACHE_TTL.REVENUE_DASHBOARD
      );
    });
  });

  describe('Creator Analytics Cache', () => {
    it('should get creator analytics from cache', async () => {
      const mockData = { followers: 100, revenue: 500 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getCreatorAnalytics('creator-123', '2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:creator:creator-123:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set creator analytics in cache', async () => {
      const mockData = { followers: 100 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setCreatorAnalytics('creator-123', '2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:creator:creator-123:2024-01-01',
        mockData,
        CACHE_TTL.CREATOR_ANALYTICS
      );
    });

    it('should invalidate creator analytics cache with pattern', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateCreatorAnalytics('creator-123');

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:creator:creator-123:*');
    });
  });

  describe('Event Analytics Cache', () => {
    it('should get event analytics from cache', async () => {
      const mockData = { totalEvents: 50 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getEventAnalytics('event-123', '2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:event:event-123:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set event analytics in cache', async () => {
      const mockData = { totalEvents: 50 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setEventAnalytics('event-123', '2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:event:event-123:2024-01-01',
        mockData,
        CACHE_TTL.EVENT_ANALYTICS
      );
    });

    it('should invalidate event analytics cache with pattern', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateEventAnalytics('event-123');

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:event:event-123:*');
    });
  });

  describe('Streaming Analytics Cache', () => {
    it('should get streaming analytics from cache', async () => {
      const mockData = { totalViewers: 100 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getStreamingAnalytics('event-123', '2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:stream:event-123:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set streaming analytics in cache', async () => {
      const mockData = { totalViewers: 100 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setStreamingAnalytics('event-123', '2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:stream:event-123:2024-01-01',
        mockData,
        CACHE_TTL.STREAMING_ANALYTICS
      );
    });
  });

  describe('Chat Analytics Cache', () => {
    it('should get chat analytics from cache', async () => {
      const mockData = { totalMessages: 500 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getChatAnalytics('event-123', '2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:chat:event-123:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set chat analytics in cache', async () => {
      const mockData = { totalMessages: 500 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setChatAnalytics('event-123', '2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:chat:event-123:2024-01-01',
        mockData,
        CACHE_TTL.CHAT_ANALYTICS
      );
    });
  });

  describe('User Analytics Cache', () => {
    it('should get user analytics from cache', async () => {
      const mockData = { newUsers: 10 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getUserAnalytics('user-123', '2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:user:user-123:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set user analytics in cache', async () => {
      const mockData = { newUsers: 10 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setUserAnalytics('user-123', '2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:user:user-123:2024-01-01',
        mockData,
        CACHE_TTL.USER_ANALYTICS
      );
    });

    it('should invalidate user analytics cache with pattern', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateUserAnalytics('user-123');

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:user:user-123:*');
    });
  });

  describe('Trends Cache', () => {
    it('should get trends from cache', async () => {
      const mockData = { userGrowth: 20 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getTrends('7d');

      expect(getCache).toHaveBeenCalledWith('analytics:trends:7d');
      expect(result).toEqual(mockData);
    });

    it('should set trends in cache', async () => {
      const mockData = { userGrowth: 20 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setTrends('7d', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:trends:7d',
        mockData,
        CACHE_TTL.TRENDS
      );
    });

    it('should invalidate trends cache with pattern', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateTrends();

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:trends:*');
    });
  });

  describe('Export Metadata Cache', () => {
    it('should get export metadata from cache', async () => {
      const mockData = { status: 'completed' };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getExportMetadata('export-123');

      expect(getCache).toHaveBeenCalledWith('analytics:export:export-123');
      expect(result).toEqual(mockData);
    });

    it('should set export metadata in cache', async () => {
      const mockData = { status: 'completed' };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setExportMetadata('export-123', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:export:export-123',
        mockData,
        CACHE_TTL.EXPORT_METADATA
      );
    });
  });

  describe('Aggregated Data Cache', () => {
    it('should get aggregated hourly data from cache', async () => {
      const mockData = { totalEvents: 100 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getAggregatedHourly('2024-01-01', 12);

      expect(getCache).toHaveBeenCalledWith('analytics:agg:hourly:2024-01-01:12');
      expect(result).toEqual(mockData);
    });

    it('should set aggregated hourly data in cache', async () => {
      const mockData = { totalEvents: 100 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setAggregatedHourly('2024-01-01', 12, mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:agg:hourly:2024-01-01:12',
        mockData,
        CACHE_TTL.AGGREGATED_HOURLY
      );
    });

    it('should get aggregated daily data from cache', async () => {
      const mockData = { totalRevenue: 1000 };
      (getCache as jest.Mock).mockResolvedValue(mockData);

      const result = await cacheService.getAggregatedDaily('2024-01-01');

      expect(getCache).toHaveBeenCalledWith('analytics:agg:daily:2024-01-01');
      expect(result).toEqual(mockData);
    });

    it('should set aggregated daily data in cache', async () => {
      const mockData = { totalRevenue: 1000 };
      (setCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.setAggregatedDaily('2024-01-01', mockData);

      expect(setCache).toHaveBeenCalledWith(
        'analytics:agg:daily:2024-01-01',
        mockData,
        CACHE_TTL.AGGREGATED_DAILY
      );
    });

    it('should invalidate aggregated daily cache', async () => {
      (deleteCache as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateAggregatedDaily('2024-01-01');

      expect(deleteCache).toHaveBeenCalledWith('analytics:agg:daily:2024-01-01');
    });
  });

  describe('Entity-wide Cache Invalidation', () => {
    it('should invalidate all cache for a creator', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateAllForEntity('creator', 'creator-123');

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:creator:creator-123:*');
    });

    it('should invalidate all cache for an event (streaming and chat)', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateAllForEntity('event', 'event-123');

      expect(deleteCachePattern).toHaveBeenCalledTimes(3);
      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:event:event-123:*');
      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:stream:event-123:*');
      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:chat:event-123:*');
    });

    it('should invalidate all cache for a user', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateAllForEntity('user', 'user-123');

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:user:user-123:*');
    });
  });

  describe('Global Cache Invalidation', () => {
    it('should invalidate all analytics cache', async () => {
      (deleteCachePattern as jest.Mock).mockResolvedValue(undefined);

      await cacheService.invalidateAll();

      expect(deleteCachePattern).toHaveBeenCalledWith('analytics:*');
    });
  });
});
