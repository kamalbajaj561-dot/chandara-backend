import { AnalyticsRepository } from '../analytics.repository';
import { AnalyticsDaily } from '../../types';
import { getFirestore } from '../../services/firebase';

jest.mock('../../services/firebase');

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
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
    };
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockDb.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.where.mockReturnValue(mockCollection);

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new AnalyticsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const eventData = {
        eventType: 'test_event',
        userId: 'user-123',
        data: { test: 'data' },
        timestamp: new Date(),
      };

      mockDoc.set.mockResolvedValue(undefined);

      const eventId = await repository.trackEvent(eventData);

      expect(mockDb.collection).toHaveBeenCalledWith('analytics_events');
      expect(mockDoc.set).toHaveBeenCalled();
      expect(eventId).toBeDefined();
    });
  });

  describe('getEventsByType', () => {
    it('should get events by type', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'test_event',
          userId: 'user-123',
          timestamp: new Date(),
          createdAt: new Date(),
        },
      ];

      const mockSnapshot = {
        docs: [
          {
            data: () => mockEvents[0],
          },
        ],
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const events = await repository.getEventsByType('test_event', new Date(), new Date());

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('test_event');
    });
  });

  describe('getDailyAnalytics', () => {
    it('should get daily analytics', async () => {
      const mockDaily: AnalyticsDaily = {
        id: '2024-01-01',
        date: '2024-01-01',
        metrics: { test: 100 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => mockDaily,
      });

      const daily = await repository.getDailyAnalytics('2024-01-01');

      expect(daily).toEqual(mockDaily);
    });

    it('should return null if daily analytics not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const daily = await repository.getDailyAnalytics('2024-01-01');

      expect(daily).toBeNull();
    });
  });

  describe('upsertDailyAnalytics', () => {
    it('should create new daily analytics', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsertDailyAnalytics('2024-01-01', { test: 100 });

      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should update existing daily analytics', async () => {
      const existing: AnalyticsDaily = {
        id: '2024-01-01',
        date: '2024-01-01',
        metrics: { test: 50 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => existing,
      });
      mockDoc.set.mockResolvedValue(undefined);

      await repository.upsertDailyAnalytics('2024-01-01', { test: 100 });

      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should get statistics', async () => {
      const mockEvents = [
        {
          eventType: 'test_event',
          userId: 'user-123',
          creatorId: 'creator-123',
          eventId: 'event-123',
        },
      ];

      const mockSnapshot = {
        docs: mockEvents.map(e => ({
          data: () => e,
        })),
        size: 1,
      };

      mockCollection.get.mockResolvedValue(mockSnapshot);

      const stats = await repository.getStatistics(new Date(), new Date());

      expect(stats.totalEvents).toBe(1);
      expect(stats.uniqueUsers).toBe(1);
      expect(stats.uniqueCreators).toBe(1);
      expect(stats.uniqueEvents).toBe(1);
    });
  });
});
