import { EventRepository } from '../event.repository';
import { getFirestore } from '../../services/firebase';

jest.mock('../../services/firebase');

describe('EventRepository', () => {
  let eventRepository: EventRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockTimestamp: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: true,
      id: 'event-id',
      data: jest.fn(),
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn(),
      count: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ count: 1 }) }) }),
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn(),
      where: jest.fn().mockReturnValue(mockQuery),
      orderBy: jest.fn().mockReturnValue(mockQuery),
      get: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);

    eventRepository = new EventRepository();
  });

  describe('findById', () => {
    it('should return event by id', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
        description: 'Test Description',
        category: 'music',
        country: 'US',
        city: 'New York',
        creatorUid: 'creator-id',
        creatorName: 'Test Creator',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: '2024-12-31',
        eventTime: '20:00',
        status: 'scheduled',
        capacity: 1000,
        featured: false,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.findById('event-id');

      expect(mockDb.collection).toHaveBeenCalledWith('events');
      expect(mockCollection.doc).toHaveBeenCalledWith('event-id');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.slug).toBe('test-event');
    });

    it('should return null if event not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.findById('event-id');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return event by slug', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockCollection.where.mockReturnValue(mockQuery);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.findBySlug('test-event');

      expect(mockDb.collection).toHaveBeenCalledWith('events');
      expect(mockCollection.where).toHaveBeenCalledWith('slug', '==', 'test-event');
      expect(result).toBeDefined();
      expect(result?.slug).toBe('test-event');
    });

    it('should return null if slug not found', async () => {
      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await eventRepository.findBySlug('test-event');

      expect(result).toBeNull();
    });
  });

  describe('checkSlugExists', () => {
    it('should return true if slug exists', async () => {
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.checkSlugExists('test-event');

      expect(result).toBe(true);
    });

    it('should return false if slug does not exist', async () => {
      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await eventRepository.checkSlugExists('test-event');

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const eventData = {
        slug: 'test-event',
        title: 'Test Event',
        description: 'Test Description',
        category: 'music',
        country: 'US',
        city: 'New York',
        creatorUid: 'creator-id',
        creatorName: 'Test Creator',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live' as 'live' | 'vr' | '360',
        eventDate: '2024-12-31',
        eventTime: '20:00',
        status: 'draft' as 'live' | 'scheduled' | 'draft' | 'ended' | 'cancelled',
        capacity: 1000,
        featured: false,
      };

      const mockDocRef = { id: 'new-event-id', get: jest.fn().mockResolvedValue(mockDoc) };
      mockCollection.add.mockResolvedValue(mockDocRef);
      mockDoc.id = 'new-event-id';
      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.data.mockReturnValue(eventData);

      const result = await eventRepository.create(eventData);

      expect(mockCollection.add).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('new-event-id');
    });
  });

  describe('update', () => {
    it('should update an existing event', async () => {
      const existingData = {
        slug: 'test-event',
        title: 'Test Event',
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const updateData = { title: 'Updated Event' };
      const result = await eventRepository.update('event-id', updateData);

      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if event not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.update('event-id', { title: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.delete.mockResolvedValue(undefined);

      const result = await eventRepository.delete('event-id');

      expect(mockDoc.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if event not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.delete('event-id');

      expect(result).toBe(false);
    });
  });

  describe('listEvents', () => {
    it('should list events with filters', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
        size: 1,
      });

      const result = await eventRepository.listEvents({
        limit: 10,
        offset: 0,
        status: 'scheduled',
        category: 'music',
      });

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('searchEvents', () => {
    it('should search events by query', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.searchEvents('test', { limit: 10 });

      expect(result).toHaveLength(1);
    });
  });

  describe('getEventsByTags', () => {
    it('should get events by tags', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
        tags: ['music', 'live'],
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.getEventsByTags(['music'], { limit: 10 });

      expect(result).toHaveLength(1);
    });
  });

  describe('getFeaturedEvents', () => {
    it('should get featured events', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
        featured: true,
        status: 'scheduled',
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.getFeaturedEvents({ limit: 10 });

      expect(result).toHaveLength(1);
    });
  });

  describe('getLiveEvents', () => {
    it('should get live events', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
        status: 'live',
        startedAt: mockTimestamp,
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.getLiveEvents({ limit: 10 });

      expect(result).toHaveLength(1);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should get upcoming events', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
        status: 'scheduled',
        scheduledAt: { toDate: () => new Date(Date.now() + 86400000) },
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.getUpcomingEvents({ limit: 10 });

      expect(result).toHaveLength(1);
    });

    it('excludes upcoming events whose planned start has passed, keeps legacy ones without a date', async () => {
      const past = { ...mockDoc, id: 'past', data: () => ({ slug: 'p', title: 'Past', status: 'approved', scheduledAt: { toDate: () => new Date(Date.now() - 86400000) } }) };
      const legacy = { ...mockDoc, id: 'legacy', data: () => ({ slug: 'l', title: 'Legacy', status: 'approved' }) };
      mockQuery.get.mockResolvedValue({ empty: false, docs: [past, legacy] });

      const result = await eventRepository.getUpcomingEvents({ limit: 10 });

      expect(result.map((e) => e.title)).toEqual(['Legacy']);
    });
  });

  describe('getEventsByCreator', () => {
    it('should get events by creator', async () => {
      const mockEventData = {
        slug: 'test-event',
        title: 'Test Event',
        creatorUid: 'creator-id',
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
        size: 1,
      });

      const result = await eventRepository.getEventsByCreator('creator-id', { limit: 10, offset: 0 });

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('checkOverlappingEvents', () => {
    it('should detect overlapping events', async () => {
      const mockEventData = {
        slug: 'existing-event',
        title: 'Existing Event',
        eventDate: '2024-12-31',
        eventTime: '20:00',
        duration: 7200,
      };

      mockDoc.data.mockReturnValue(mockEventData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await eventRepository.checkOverlappingEvents(
        'creator-id',
        '2024-12-31',
        '19:00',
        7200
      );

      expect(result).toBe(true);
    });

    it('should return false when no overlap', async () => {
      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await eventRepository.checkOverlappingEvents(
        'creator-id',
        '2024-12-31',
        '20:00',
        7200
      );

      expect(result).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should update event status', async () => {
      const existingData = {
        slug: 'test-event',
        title: 'Test Event',
        status: 'draft',
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.updateStatus('event-id', 'scheduled');

      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if event not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.updateStatus('event-id', 'scheduled');

      expect(result).toBeNull();
    });
  });

  describe('setFeatured', () => {
    it('should set featured status', async () => {
      const existingData = {
        slug: 'test-event',
        title: 'Test Event',
        featured: false,
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.setFeatured('event-id', true);

      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if event not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await eventRepository.setFeatured('event-id', true);

      expect(result).toBeNull();
    });
  });
});
