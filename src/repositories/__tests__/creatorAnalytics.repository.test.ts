import { CreatorAnalyticsRepository } from '../creatorAnalytics.repository';
import { CreatorAnalytics } from '../../types';
import { getFirestore } from '../../services/firebase';

jest.mock('../../services/firebase');

describe('CreatorAnalyticsRepository', () => {
  let repository: CreatorAnalyticsRepository;
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
      limit: jest.fn(),
    };
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockDb.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.where.mockReturnValue(mockCollection);
    mockCollection.orderBy.mockReturnValue(mockCollection);
    mockCollection.limit.mockReturnValue(mockCollection);

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new CreatorAnalyticsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsert', () => {
    it('should create new creator analytics', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsert('creator-123', '2024-01-01', { newFollowers: 10 });

      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should update existing creator analytics', async () => {
      const existing: CreatorAnalytics = {
        id: 'creator-123-2024-01-01',
        creatorId: 'creator-123',
        date: '2024-01-01',
        followers: 100,
        newFollowers: 5,
        revenue: 100,
        ticketsSold: 2,
        eventsHosted: 1,
        liveStreams: 1,
        averageAttendance: 50,
        totalViews: 50,
        rating: 4.5,
        reviewCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => existing,
      });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsert('creator-123', '2024-01-01', { newFollowers: 10 });

      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find by ID', async () => {
      const mockAnalytics: CreatorAnalytics = {
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
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockAnalytics,
      });

      const result = await repository.findById('creator-123-2024-01-01');

      expect(result).toEqual(mockAnalytics);
    });

    it('should return null if not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await repository.findById('creator-123-2024-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getByCreator', () => {
    it('should get analytics by creator', async () => {
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

      const mockSnapshot = {
        docs: mockAnalytics.map(a => ({
          data: () => a,
        })),
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await repository.getByCreator('creator-123', new Date('2024-01-01'), new Date('2024-01-31'));

      expect(result).toHaveLength(1);
      expect(result[0].creatorId).toBe('creator-123');
    });
  });

  describe('getTopCreatorsByRevenue', () => {
    it('should get top creators by revenue', async () => {
      const mockAnalytics = [
        {
          creatorId: 'creator-1',
          revenue: 1000,
          ticketsSold: 10,
        },
        {
          creatorId: 'creator-2',
          revenue: 500,
          ticketsSold: 5,
        },
      ];

      const mockSnapshot = {
        docs: mockAnalytics.map(a => ({
          data: () => a,
        })),
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const result = await repository.getTopCreatorsByRevenue(new Date('2024-01-01'), new Date('2024-01-31'), 10);

      expect(result).toHaveLength(2);
      expect(result[0].creatorId).toBe('creator-1');
      expect(result[0].revenue).toBe(1000);
    });
  });

  describe('getStatistics', () => {
    it('should get statistics', async () => {
      const mockAnalytics = [
        {
          creatorId: 'creator-1',
          revenue: 1000,
          ticketsSold: 10,
          eventsHosted: 3,
          totalViews: 200,
        },
      ];

      const mockSnapshot = {
        docs: mockAnalytics.map(a => ({
          data: () => a,
        })),
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const stats = await repository.getStatistics(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(stats.totalRevenue).toBe(1000);
      expect(stats.totalTicketsSold).toBe(10);
      expect(stats.totalEvents).toBe(3);
    });
  });
});
