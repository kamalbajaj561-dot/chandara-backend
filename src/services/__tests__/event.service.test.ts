import { EventService } from '../event.service';
import { EventRepository } from '../../repositories/event.repository';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../repositories/event.repository');

describe('EventService', () => {
  let eventService: EventService;
  let mockEventRepository: jest.Mocked<EventRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventRepository = new EventRepository() as jest.Mocked<EventRepository>;
    eventService = new EventService(mockEventRepository);
  });

  describe('getEvent', () => {
    it('should return event by id', async () => {
      const mockEvent = {
        id: 'event-id',
        slug: 'test-event',
        title: 'Test Event',
      };

      mockEventRepository.findById.mockResolvedValue(mockEvent as any);

      const result = await eventService.getEvent('event-id');

      expect(mockEventRepository.findById).toHaveBeenCalledWith('event-id');
      expect(result).toEqual(mockEvent);
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(eventService.getEvent('event-id')).rejects.toThrow(AppError);
      await expect(eventService.getEvent('event-id')).rejects.toThrow('Event not found');
    });
  });

  describe('getEventBySlug', () => {
    it('should return event by slug', async () => {
      const mockEvent = {
        id: 'event-id',
        slug: 'test-event',
        title: 'Test Event',
      };

      mockEventRepository.findBySlug.mockResolvedValue(mockEvent as any);

      const result = await eventService.getEventBySlug('test-event');

      expect(mockEventRepository.findBySlug).toHaveBeenCalledWith('test-event');
      expect(result).toEqual(mockEvent);
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.findBySlug.mockResolvedValue(null);

      await expect(eventService.getEventBySlug('test-event')).rejects.toThrow(AppError);
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const eventData = {
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
        streamType: 'live' as const,
        eventDate: '2027-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      const mockEvent = {
        id: 'event-id',
        slug: 'test-event',
        ...eventData,
      };

      mockEventRepository.checkOverlappingEvents.mockResolvedValue(false);
      mockEventRepository.checkSlugExists.mockResolvedValue(false);
      mockEventRepository.create.mockResolvedValue(mockEvent as any);

      const result = await eventService.createEvent('creator-id', 'Test Creator', eventData);

      expect(mockEventRepository.checkOverlappingEvents).toHaveBeenCalled();
      expect(mockEventRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockEvent);
    });

    it('should throw error for overlapping events', async () => {
      const eventData = {
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
        streamType: 'live' as const,
        eventDate: '2027-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      mockEventRepository.checkOverlappingEvents.mockResolvedValue(true);

      await expect(eventService.createEvent('creator-id', 'Test Creator', eventData)).rejects.toThrow('overlapping');
    });

    it('should throw error for past event date', async () => {
      const eventData = {
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
        streamType: 'live' as const,
        eventDate: '2020-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      await expect(eventService.createEvent('creator-id', 'Test Creator', eventData)).rejects.toThrow('must be in the future');
    });
  });

  describe('updateEvent', () => {
    it('should update an event', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'draft',
        eventDate: '2027-12-31',
        eventTime: '20:00',
      };

      const updateData = {
        title: 'Updated Event',
      };

      const updatedEvent = {
        ...existingEvent,
        title: 'Updated Event',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.checkOverlappingEvents.mockResolvedValue(false);
      mockEventRepository.update.mockResolvedValue(updatedEvent as any);

      const result = await eventService.updateEvent('event-id', 'creator-id', updateData);

      expect(mockEventRepository.update).toHaveBeenCalled();
      expect(result).toEqual(updatedEvent);
    });

    it('should throw error if not owner', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'other-creator-id',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.updateEvent('event-id', 'creator-id', {})).rejects.toThrow('permission');
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(eventService.updateEvent('event-id', 'creator-id', {})).rejects.toThrow('Event not found');
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'draft',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.delete.mockResolvedValue(true);

      await eventService.deleteEvent('event-id', 'creator-id');

      expect(mockEventRepository.delete).toHaveBeenCalledWith('event-id');
    });

    it('should throw error if not owner', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'other-creator-id',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.deleteEvent('event-id', 'creator-id')).rejects.toThrow('permission');
    });

    it('should throw error if event is live', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'live',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.deleteEvent('event-id', 'creator-id')).rejects.toThrow('Cannot delete a live event');
    });
  });

  describe('scheduleEvent', () => {
    it('should schedule an event', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'draft',
        eventDate: '2027-12-31',
        eventTime: '20:00',
      };

      const updatedEvent = {
        ...existingEvent,
        status: 'scheduled',
        scheduledAt: new Date(),
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.updateStatus.mockResolvedValue(updatedEvent as any);

      const result = await eventService.scheduleEvent('event-id', 'creator-id');

      expect(mockEventRepository.updateStatus).toHaveBeenCalledWith('event-id', 'scheduled');
      expect(result).toEqual(updatedEvent);
    });

    it('should throw error if not owner', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'other-creator-id',
        status: 'draft',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.scheduleEvent('event-id', 'creator-id')).rejects.toThrow('permission');
    });

    it('should throw error if not draft', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'scheduled',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.scheduleEvent('event-id', 'creator-id')).rejects.toThrow('Only draft events can be scheduled');
    });
  });

  describe('startEvent', () => {
    it('should start an event', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'scheduled',
      };

      const updatedEvent = {
        ...existingEvent,
        status: 'live',
        startedAt: new Date(),
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.updateStatus.mockResolvedValue(updatedEvent as any);

      const result = await eventService.startEvent('event-id', 'creator-id');

      expect(mockEventRepository.updateStatus).toHaveBeenCalledWith('event-id', 'live');
      expect(result).toEqual(updatedEvent);
    });

    it('should throw error if not scheduled', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'draft',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.startEvent('event-id', 'creator-id')).rejects.toThrow('Only scheduled events can be started');
    });
  });

  describe('endEvent', () => {
    it('should end an event', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'live',
      };

      const updatedEvent = {
        ...existingEvent,
        status: 'ended',
        endedAt: new Date(),
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.updateStatus.mockResolvedValue(updatedEvent as any);

      const result = await eventService.endEvent('event-id', 'creator-id');

      expect(mockEventRepository.updateStatus).toHaveBeenCalledWith('event-id', 'ended');
      expect(result).toEqual(updatedEvent);
    });

    it('should throw error if not live', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'scheduled',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.endEvent('event-id', 'creator-id')).rejects.toThrow('Only live events can be ended');
    });
  });

  describe('cancelEvent', () => {
    it('should cancel an event', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'scheduled',
      };

      const updatedEvent = {
        ...existingEvent,
        status: 'cancelled',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.updateStatus.mockResolvedValue(updatedEvent as any);

      const result = await eventService.cancelEvent('event-id', 'creator-id');

      expect(mockEventRepository.updateStatus).toHaveBeenCalledWith('event-id', 'cancelled');
      expect(result).toEqual(updatedEvent);
    });

    it('should throw error if event is live', async () => {
      const existingEvent = {
        id: 'event-id',
        creatorUid: 'creator-id',
        status: 'live',
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);

      await expect(eventService.cancelEvent('event-id', 'creator-id')).rejects.toThrow('Cannot cancel a live event');
    });
  });

  describe('searchEvents', () => {
    it('should search events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1' },
        { id: 'event-2', title: 'Test Event 2' },
      ];

      mockEventRepository.searchEvents.mockResolvedValue(mockEvents as any);

      const result = await eventService.searchEvents('test', 10);

      expect(mockEventRepository.searchEvents).toHaveBeenCalledWith('test', { limit: 10 });
      expect(result).toEqual(mockEvents);
    });

    it('should throw error for short query', async () => {
      await expect(eventService.searchEvents('t')).rejects.toThrow('at least 2 characters');
    });
  });

  describe('listEvents', () => {
    it('should list events with filters', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1' },
      ];

      mockEventRepository.listEvents.mockResolvedValue({ events: mockEvents as any, total: 1 });

      const result = await eventService.listEvents({
        limit: 10,
        offset: 0,
        status: 'scheduled',
      });

      expect(mockEventRepository.listEvents).toHaveBeenCalled();
      expect(result.events).toEqual(mockEvents);
      expect(result.total).toBe(1);
    });
  });

  describe('getEventsByTags', () => {
    it('should get events by tags', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', tags: ['music'] },
      ];

      mockEventRepository.getEventsByTags.mockResolvedValue(mockEvents as any);

      const result = await eventService.getEventsByTags(['music'], 10);

      expect(mockEventRepository.getEventsByTags).toHaveBeenCalledWith(['music'], { limit: 10 });
      expect(result).toEqual(mockEvents);
    });

    it('should throw error for empty tags', async () => {
      await expect(eventService.getEventsByTags([])).rejects.toThrow('At least one tag is required');
    });
  });

  describe('getFeaturedEvents', () => {
    it('should get featured events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', featured: true },
      ];

      mockEventRepository.getFeaturedEvents.mockResolvedValue(mockEvents as any);

      const result = await eventService.getFeaturedEvents(10);

      expect(mockEventRepository.getFeaturedEvents).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getLiveEvents', () => {
    it('should get live events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', status: 'live' },
      ];

      mockEventRepository.getLiveEvents.mockResolvedValue(mockEvents as any);

      const result = await eventService.getLiveEvents(10);

      expect(mockEventRepository.getLiveEvents).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should get upcoming events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', status: 'scheduled' },
      ];

      mockEventRepository.getUpcomingEvents.mockResolvedValue(mockEvents as any);

      const result = await eventService.getUpcomingEvents(10);

      expect(mockEventRepository.getUpcomingEvents).toHaveBeenCalledWith({ limit: 10 });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByCreator', () => {
    it('should get events by creator', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', creatorUid: 'creator-id' },
      ];

      mockEventRepository.getEventsByCreator.mockResolvedValue({ events: mockEvents as any, total: 1 });

      const result = await eventService.getEventsByCreator('creator-id', { limit: 10, offset: 0 });

      expect(mockEventRepository.getEventsByCreator).toHaveBeenCalledWith('creator-id', { limit: 10, offset: 0 });
      expect(result.events).toEqual(mockEvents);
      expect(result.total).toBe(1);
    });
  });

  describe('setFeatured', () => {
    it('should set featured status', async () => {
      const existingEvent = {
        id: 'event-id',
        featured: false,
      };

      const updatedEvent = {
        ...existingEvent,
        featured: true,
      };

      mockEventRepository.findById.mockResolvedValue(existingEvent as any);
      mockEventRepository.setFeatured.mockResolvedValue(updatedEvent as any);

      const result = await eventService.setFeatured('event-id', true);

      expect(mockEventRepository.setFeatured).toHaveBeenCalledWith('event-id', true);
      expect(result).toEqual(updatedEvent);
    });

    it('should throw error if event not found', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(eventService.setFeatured('event-id', true)).rejects.toThrow('Event not found');
    });
  });
});
