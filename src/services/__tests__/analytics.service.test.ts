import { AnalyticsService } from '../analytics.service';
import { analyticsRepository } from '../../repositories/analytics.repository';

jest.mock('../../repositories/analytics.repository');

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const eventType = 'test_event';
      const data = {
        userId: 'user-123',
        creatorId: 'creator-123',
        eventId: 'event-123',
        test: 'data',
      };

      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');

      const result = await service.trackEvent(eventType, data);

      expect(analyticsRepository.trackEvent).toHaveBeenCalledWith({
        eventType,
        userId: data.userId,
        creatorId: data.creatorId,
        eventId: data.eventId,
        data,
        timestamp: expect.any(Date),
      });
      expect(result).toBe('event-123');
    });
  });

  describe('trackPageView', () => {
    it('should track page view', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackPageView({ userId: 'user-123', page: '/test-page' });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackTicketPurchase', () => {
    it('should track ticket purchase', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackTicketPurchase({
        userId: 'user-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        ticketId: 'ticket-123',
        amount: 100,
        currency: 'USD',
        ticketType: 'general',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackPayment', () => {
    it('should track payment', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackPayment({
        userId: 'user-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'stripe',
        platformFee: 10,
        tax: 5,
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackStreamStarted', () => {
    it('should track stream started', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackStreamStarted({
        streamId: 'stream-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackStreamEnded', () => {
    it('should track stream ended', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackStreamEnded({
        streamId: 'stream-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        duration: 3600,
        peakViewers: 100,
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackViewerJoined', () => {
    it('should track viewer joined', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackViewerJoined({
        userId: 'user-123',
        streamId: 'stream-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackViewerLeft', () => {
    it('should track viewer left', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackViewerLeft({
        userId: 'user-123',
        streamId: 'stream-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        watchTime: 300,
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackChatMessage', () => {
    it('should track chat message', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackChatMessage({
        userId: 'user-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        messageId: 'message-123',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackCreatorFollow', () => {
    it('should track creator follow', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackCreatorFollow({
        userId: 'user-123',
        creatorId: 'creator-123',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackLogin', () => {
    it('should track login', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackLogin({
        userId: 'user-123',
        method: 'email',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackSignup', () => {
    it('should track signup', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackSignup({
        userId: 'user-123',
        method: 'email',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackEventCreation', () => {
    it('should track event creation', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackEventCreation({
        creatorId: 'creator-123',
        eventId: 'event-123',
        eventType: 'live',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });

  describe('trackEventPublish', () => {
    it('should track event publish', async () => {
      (analyticsRepository.trackEvent as jest.Mock).mockResolvedValue('event-123');
      await service.trackEventPublish({
        creatorId: 'creator-123',
        eventId: 'event-123',
      });
      expect(analyticsRepository.trackEvent).toHaveBeenCalled();
    });
  });
});
