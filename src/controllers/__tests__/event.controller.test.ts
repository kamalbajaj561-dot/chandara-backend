import { Request, Response, NextFunction } from 'express';
import { EventController } from '../event.controller';
import { EventService } from '../../services/event.service';

jest.mock('../../services/event.service');
jest.mock('../../repositories/event.repository');

describe('EventController', () => {
  let eventController: EventController;
  let mockEventService: jest.Mocked<EventService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventService = {
      getEvent: jest.fn().mockResolvedValue({}),
      getEventBySlug: jest.fn().mockResolvedValue({}),
      createEvent: jest.fn().mockResolvedValue({}),
      updateEvent: jest.fn().mockResolvedValue({}),
      deleteEvent: jest.fn().mockResolvedValue(undefined),
      scheduleEvent: jest.fn().mockResolvedValue({}),
      startEvent: jest.fn().mockResolvedValue({}),
      endEvent: jest.fn().mockResolvedValue({}),
      cancelEvent: jest.fn().mockResolvedValue({}),
      publishEvent: jest.fn().mockResolvedValue({}),
      archiveEvent: jest.fn().mockResolvedValue({}),
      updateEventStatus: jest.fn().mockResolvedValue({}),
      getEventAnalytics: jest.fn().mockResolvedValue({}),
      getEventAttendees: jest.fn().mockResolvedValue([]),
      searchEvents: jest.fn().mockResolvedValue([]),
      listEvents: jest.fn().mockResolvedValue({ events: [], total: 0 }),
      getEventsByTags: jest.fn().mockResolvedValue([]),
      getFeaturedEvents: jest.fn().mockResolvedValue([]),
      getLiveEvents: jest.fn().mockResolvedValue([]),
      getUpcomingEvents: jest.fn().mockResolvedValue([]),
      getEventsByCreator: jest.fn().mockResolvedValue({ events: [], total: 0 }),
      setFeatured: jest.fn().mockResolvedValue({}),
    } as any;

    eventController = new EventController(mockEventService);

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-id', id: 'user-id', email: 'test@example.com', role: 'creator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000, displayName: 'Test Creator' } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getEvent', () => {
    it('should return event by id', async () => {
      const mockEvent = {
        id: 'event-id',
        slug: 'test-event',
        title: 'Test Event',
      };

      mockRequest.params = { id: 'event-id' };
      mockEventService.getEvent.mockResolvedValue(mockEvent as any);

      await eventController.getEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getEvent).toHaveBeenCalledWith('event-id', { id: 'user-id', isAdmin: false });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
      });
    });

    it('should call next on error', async () => {
      mockRequest.params = { id: 'event-id' };
      mockEventService.getEvent.mockRejectedValue(new Error('Not found'));

      await eventController.getEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getEventBySlug', () => {
    it('should return event by slug', async () => {
      const mockEvent = {
        id: 'event-id',
        slug: 'test-event',
        title: 'Test Event',
      };

      mockRequest.params = { slug: 'test-event' };
      mockEventService.getEventBySlug.mockResolvedValue(mockEvent as any);

      await eventController.getEventBySlug(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getEventBySlug).toHaveBeenCalledWith('test-event', { id: 'user-id', isAdmin: false });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
      });
    });
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const mockEvent = {
        id: 'event-id',
        slug: 'test-event',
        title: 'Test Event',
      };

      mockRequest.body = {
        title: 'Test Event',
        description: 'Test Description',
        category: 'music',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: new Date(Date.now() + 86400000).toISOString(),
        eventTime: '20:00',
        capacity: 1000,
      };

      mockEventService.createEvent.mockResolvedValue(mockEvent as any);

      await eventController.createEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.createEvent).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event created successfully',
      });
    });

    it('should return 401 if unauthorized', async () => {
      mockRequest.user = undefined;

      await eventController.createEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('updateEvent', () => {
    it('should update an event', async () => {
      const mockEvent = {
        id: 'event-id',
        title: 'Updated Event',
      };

      mockRequest.params = { id: 'event-id' };
      mockRequest.body = { title: 'Updated Event' };
      mockEventService.updateEvent.mockResolvedValue(mockEvent as any);

      await eventController.updateEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.updateEvent).toHaveBeenCalledWith('event-id', 'user-id', expect.any(Object));
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event updated successfully',
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      mockRequest.params = { id: 'event-id' };
      mockEventService.deleteEvent.mockResolvedValue(undefined);

      await eventController.deleteEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.deleteEvent).toHaveBeenCalledWith('event-id', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Event deleted successfully',
      });
    });
  });

  describe('scheduleEvent', () => {
    it('should schedule an event', async () => {
      const mockEvent = {
        id: 'event-id',
        status: 'scheduled',
      };

      mockRequest.params = { id: 'event-id' };
      mockEventService.scheduleEvent.mockResolvedValue(mockEvent as any);

      await eventController.scheduleEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.scheduleEvent).toHaveBeenCalledWith('event-id', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event scheduled successfully',
      });
    });
  });

  describe('startEvent', () => {
    it('should start an event', async () => {
      const mockEvent = {
        id: 'event-id',
        status: 'live',
      };

      mockRequest.params = { id: 'event-id' };
      mockEventService.startEvent.mockResolvedValue(mockEvent as any);

      await eventController.startEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.startEvent).toHaveBeenCalledWith('event-id', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event started successfully',
      });
    });
  });

  describe('endEvent', () => {
    it('should end an event', async () => {
      const mockEvent = {
        id: 'event-id',
        status: 'ended',
      };

      mockRequest.params = { id: 'event-id' };
      mockEventService.endEvent.mockResolvedValue(mockEvent as any);

      await eventController.endEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.endEvent).toHaveBeenCalledWith('event-id', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event ended successfully',
      });
    });
  });

  describe('cancelEvent', () => {
    it('should cancel an event', async () => {
      const mockEvent = {
        id: 'event-id',
        status: 'cancelled',
      };

      mockRequest.params = { id: 'event-id' };
      mockEventService.cancelEvent.mockResolvedValue(mockEvent as any);

      await eventController.cancelEvent(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.cancelEvent).toHaveBeenCalledWith('event-id', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event cancelled successfully',
      });
    });
  });

  describe('searchEvents', () => {
    it('should search events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1' },
      ];

      mockRequest.query = { query: 'test', limit: '10' };
      mockEventService.searchEvents.mockResolvedValue(mockEvents as any);

      await eventController.searchEvents(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.searchEvents).toHaveBeenCalledWith('test', 10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
      });
    });
  });

  describe('listEvents', () => {
    it('should list events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1' },
      ];

      mockRequest.query = { limit: '10', offset: '0' };
      mockEventService.listEvents.mockResolvedValue({ events: mockEvents as any, total: 1 });

      await eventController.listEvents(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.listEvents).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockEvents,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        }),
      });
    });
  });

  describe('getEventsByTags', () => {
    it('should get events by tags', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1' },
      ];

      mockRequest.body = { tags: ['music'], limit: 10 };
      mockEventService.getEventsByTags.mockResolvedValue(mockEvents as any);

      await eventController.getEventsByTags(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getEventsByTags).toHaveBeenCalledWith(['music'], 10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
      });
    });
  });

  describe('getFeaturedEvents', () => {
    it('should get featured events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', featured: true },
      ];

      mockRequest.query = { limit: '10' };
      mockEventService.getFeaturedEvents.mockResolvedValue(mockEvents as any);

      await eventController.getFeaturedEvents(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getFeaturedEvents).toHaveBeenCalledWith(10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
      });
    });
  });

  describe('getLiveEvents', () => {
    it('should get live events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', status: 'live' },
      ];

      mockRequest.query = { limit: '10' };
      mockEventService.getLiveEvents.mockResolvedValue(mockEvents as any);

      await eventController.getLiveEvents(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getLiveEvents).toHaveBeenCalledWith(10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
      });
    });
  });

  describe('getUpcomingEvents', () => {
    it('should get upcoming events', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1', status: 'scheduled' },
      ];

      mockRequest.query = { limit: '10' };
      mockEventService.getUpcomingEvents.mockResolvedValue(mockEvents as any);

      await eventController.getUpcomingEvents(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getUpcomingEvents).toHaveBeenCalledWith(10);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvents,
      });
    });
  });

  describe('getEventsByCreator', () => {
    it('should get events by creator', async () => {
      const mockEvents = [
        { id: 'event-1', title: 'Test Event 1' },
      ];

      mockRequest.params = { creatorUid: 'creator-id' };
      mockRequest.query = { limit: '10', offset: '0' };
      mockEventService.getEventsByCreator.mockResolvedValue({ events: mockEvents as any, total: 1 });

      await eventController.getEventsByCreator(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.getEventsByCreator).toHaveBeenCalledWith('creator-id', { limit: 10, offset: 0 }, { id: 'user-id', isAdmin: false });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockEvents,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('setFeatured', () => {
    it('should set featured status', async () => {
      const mockEvent = {
        id: 'event-id',
        featured: true,
      };

      mockRequest.params = { id: 'event-id' };
      mockRequest.body = { featured: true };
      mockEventService.setFeatured.mockResolvedValue(mockEvent as any);

      await eventController.setFeatured(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockEventService.setFeatured).toHaveBeenCalledWith('event-id', true);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Featured status updated successfully',
      });
    });
  });
});
