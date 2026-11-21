import { StreamService } from '../stream.service';
import { StreamRepository } from '../../repositories/stream.repository';
import { StreamSessionRepository } from '../../repositories/streamSession.repository';
import { StreamHealthRepository } from '../../repositories/streamHealth.repository';
import { EventService } from '../event.service';
import { createRoom, deleteRoom, generateLiveKitToken } from '../livekit';
import { getCache, setCache, incrementCache, decrementCache, deleteCache } from '../redis';
import { AppError } from '../../middleware/errorHandler';
import { Stream, Event } from '../../types';

jest.mock('../../repositories/stream.repository');
jest.mock('../../repositories/streamSession.repository');
jest.mock('../../repositories/streamHealth.repository');
jest.mock('../event.service');
jest.mock('../livekit');
jest.mock('../redis');

describe('StreamService', () => {
  let streamService: StreamService;
  let mockStreamRepository: jest.Mocked<StreamRepository>;
  let mockStreamSessionRepository: jest.Mocked<StreamSessionRepository>;
  let mockStreamHealthRepository: jest.Mocked<StreamHealthRepository>;
  let mockEventService: jest.Mocked<EventService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStreamRepository = new StreamRepository() as jest.Mocked<StreamRepository>;
    mockStreamSessionRepository = new StreamSessionRepository() as jest.Mocked<StreamSessionRepository>;
    mockStreamHealthRepository = new StreamHealthRepository() as jest.Mocked<StreamHealthRepository>;
    mockEventService = new EventService() as jest.Mocked<EventService>;

    streamService = new StreamService(
      mockStreamRepository,
      mockStreamSessionRepository,
      mockStreamHealthRepository,
      mockEventService
    );
  });

  describe('startStream', () => {
    it('should start a stream successfully', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
        status: 'scheduled',
      } as any;

      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        roomName: 'room-name',
        liveKitRoom: 'livekit-room',
        status: 'live',
        publisherConnected: false,
        viewerCount: 0,
        peakViewers: 0,
        recordingEnabled: false,
        health: 'healthy',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(null);
      (createRoom as jest.Mock).mockResolvedValue(undefined);
      mockStreamRepository.create.mockResolvedValue(mockStream);
      mockStreamHealthRepository.create.mockResolvedValue({} as any);
      mockStreamRepository.updateStatus.mockResolvedValue(mockStream);
      mockEventService.startEvent.mockResolvedValue(mockEvent);
      (generateLiveKitToken as jest.Mock).mockResolvedValue({ token: 'jwt-token', url: 'wss://livekit-url' });
      (setCache as jest.Mock).mockResolvedValue(undefined);

      const result = await streamService.startStream('event-123', 'creator-123', false);

      expect(result.stream).toBeDefined();
      expect(result.token).toBe('jwt-token');
      expect(createRoom).toHaveBeenCalled();
      expect(mockEventService.startEvent).toHaveBeenCalledWith('event-123', 'creator-123');
    });

    it('should throw error if user is not the creator', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'different-creator',
        status: 'scheduled',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);

      await expect(streamService.startStream('event-123', 'creator-123', false)).rejects.toThrow(AppError);
    });

    it('should throw error if event is not scheduled', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
        status: 'draft',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);

      await expect(streamService.startStream('event-123', 'creator-123', false)).rejects.toThrow(AppError);
    });

    it('should throw error if stream is already live', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
        status: 'scheduled',
      } as any;

      const mockExistingStream: Stream = {
        id: 'stream-123',
        status: 'live',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(mockExistingStream);

      await expect(streamService.startStream('event-123', 'creator-123', false)).rejects.toThrow(AppError);
    });
  });

  describe('stopStream', () => {
    it('should stop a stream successfully', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
      } as any;

      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        liveKitRoom: 'livekit-room',
        status: 'live',
        viewerCount: 100,
        peakViewers: 150,
      } as any;

      const mockEndedStream: Stream = {
        ...mockStream,
        status: 'ended',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);
      (deleteRoom as jest.Mock).mockResolvedValue(undefined);
      (getCache as jest.Mock).mockResolvedValue(100);
      (setCache as jest.Mock).mockResolvedValue(undefined);
      (deleteCache as jest.Mock).mockResolvedValue(undefined);
      mockStreamRepository.updateViewerCount.mockResolvedValue(mockStream);
      mockStreamRepository.updatePeakViewers.mockResolvedValue(mockStream);
      mockStreamRepository.updateStatus.mockResolvedValue(mockEndedStream);
      mockEventService.endEvent.mockResolvedValue(mockEvent);
      mockStreamHealthRepository.deleteByStreamId.mockResolvedValue(true);
      mockStreamRepository.findById.mockResolvedValue(mockEndedStream);

      const result = await streamService.stopStream('event-123', 'creator-123');

      expect(result.status).toBe('ended');
      expect(deleteRoom).toHaveBeenCalledWith('livekit-room');
      expect(mockEventService.endEvent).toHaveBeenCalledWith('event-123', 'creator-123');
    });

    it('should throw error if user is not the creator', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'different-creator',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);

      await expect(streamService.stopStream('event-123', 'creator-123')).rejects.toThrow(AppError);
    });

    it('should throw error if stream not found', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(null);

      await expect(streamService.stopStream('event-123', 'creator-123')).rejects.toThrow(AppError);
    });
  });

  describe('generateToken', () => {
    it('should generate publisher token for creator', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
      } as any;

      const mockStream: Stream = {
        id: 'stream-123',
        liveKitRoom: 'livekit-room',
        status: 'live',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);
      (generateLiveKitToken as jest.Mock).mockResolvedValue({ token: 'jwt-token', url: 'wss://livekit-url' });

      const result = await streamService.generateToken('event-123', 'creator-123', 'publisher');

      expect(result.token).toBe('jwt-token');
      expect(generateLiveKitToken).toHaveBeenCalledWith({
        roomName: 'livekit-room',
        participantName: 'creator-123',
        role: 'publisher',
      });
    });

    it('should throw error if non-creator requests publisher token', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'different-creator',
      } as any;

      const mockStream: Stream = {
        id: 'stream-123',
        status: 'live',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);

      await expect(streamService.generateToken('event-123', 'creator-123', 'publisher')).rejects.toThrow(AppError);
    });

    it('should throw error if stream is not live', async () => {
      const mockEvent: Event = {
        id: 'event-123',
        creatorUid: 'creator-123',
      } as any;

      const mockStream: Stream = {
        id: 'stream-123',
        status: 'ended',
      } as any;

      mockEventService.getEvent.mockResolvedValue(mockEvent);
      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);

      await expect(streamService.generateToken('event-123', 'creator-123', 'subscriber')).rejects.toThrow(AppError);
    });
  });

  describe('getStream', () => {
    it('should get stream by event', async () => {
      const mockStream: Stream = {
        id: 'stream-123',
        eventId: 'event-123',
      } as any;

      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);

      const result = await streamService.getStream('event-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('stream-123');
    });

    it('should throw error if stream not found', async () => {
      mockStreamRepository.getByEvent.mockResolvedValue(null);

      await expect(streamService.getStream('event-123')).rejects.toThrow(AppError);
    });
  });

  describe('getStreamHealth', () => {
    it('should get stream health', async () => {
      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
      } as any;

      const mockHealth = {
        id: 'health-123',
        streamId: 'stream-id-123',
        health: 'healthy',
      };

      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);
      mockStreamHealthRepository.findByStreamId.mockResolvedValue(mockHealth as any);

      const result = await streamService.getStreamHealth('event-123');

      expect(result).toBeDefined();
      expect(result.health).toBe('healthy');
    });

    it('should throw error if stream not found', async () => {
      mockStreamRepository.getByEvent.mockResolvedValue(null);

      await expect(streamService.getStreamHealth('event-123')).rejects.toThrow(AppError);
    });
  });

  describe('updateViewerCount', () => {
    it('should update viewer count', async () => {
      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
        viewerCount: 100,
        peakViewers: 150,
      } as any;

      const mockHealth = {
        id: 'health-123',
        streamId: 'stream-id-123',
      };

      const mockUpdatedStream: Stream = {
        ...mockStream,
        viewerCount: 101,
      } as any;

      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);
      (getCache as jest.Mock).mockResolvedValue(100);
      (setCache as jest.Mock).mockResolvedValue(undefined);
      mockStreamRepository.updateViewerCount.mockResolvedValue(mockUpdatedStream);
      mockStreamRepository.updatePeakViewers.mockResolvedValue(mockUpdatedStream);
      mockStreamHealthRepository.findByStreamId.mockResolvedValue(mockHealth as any);
      mockStreamHealthRepository.updateViewerCount.mockResolvedValue(mockHealth as any);
      mockStreamRepository.findById.mockResolvedValue(mockUpdatedStream);

      const result = await streamService.updateViewerCount('event-123', 1);

      expect(result.viewerCount).toBe(101);
    });
  });

  describe('getLiveStreams', () => {
    it('should get all live streams', async () => {
      const mockStreams: Stream[] = [
        { id: 'stream-1', status: 'live' } as any,
        { id: 'stream-2', status: 'live' } as any,
      ];

      mockStreamRepository.getLiveStreams.mockResolvedValue(mockStreams);

      const result = await streamService.getLiveStreams();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('live');
    });
  });

  describe('joinStream', () => {
    it('should join a stream', async () => {
      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
        eventId: 'event-123',
        status: 'live',
      } as any;

      const mockSession = {
        id: 'session-123',
        streamId: 'stream-id-123',
        userId: 'user-123',
      };

      mockStreamRepository.findByStreamId.mockResolvedValue(mockStream);
      mockStreamSessionRepository.findByUserAndStream.mockResolvedValue(null);
      mockStreamSessionRepository.create.mockResolvedValue(mockSession as any);
      (incrementCache as jest.Mock).mockResolvedValue(1);
      mockStreamRepository.getByEvent.mockResolvedValue(mockStream);
      mockStreamRepository.updateViewerCount.mockResolvedValue(mockStream);

      const result = await streamService.joinStream('stream-id-123', 'user-123', 'subscriber');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
    });

    it('should return existing session if already joined', async () => {
      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
        status: 'live',
      } as any;

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
      };

      mockStreamRepository.findByStreamId.mockResolvedValue(mockStream);
      mockStreamSessionRepository.findByUserAndStream.mockResolvedValue(mockSession as any);

      const result = await streamService.joinStream('stream-id-123', 'user-123', 'subscriber');

      expect(result).toBeDefined();
      expect(result.id).toBe('session-123');
    });
  });

  describe('leaveStream', () => {
    it('should leave a stream', async () => {
      const mockSession = {
        id: 'session-123',
        streamId: 'stream-id-123',
        userId: 'user-123',
        leftAt: new Date(),
        duration: 300000,
      };

      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
        eventId: 'event-123',
      } as any;

      mockStreamSessionRepository.findByUserAndStream.mockResolvedValue(mockSession as any);
      mockStreamSessionRepository.endSession.mockResolvedValue(mockSession as any);
      (decrementCache as jest.Mock).mockResolvedValue(0);
      mockStreamRepository.findByStreamId.mockResolvedValue(mockStream);
      mockStreamRepository.updateViewerCount.mockResolvedValue(mockStream);

      const result = await streamService.leaveStream('stream-id-123', 'user-123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.leftAt).toBeDefined();
      }
    });

    it('should return null if session not found', async () => {
      mockStreamSessionRepository.findByUserAndStream.mockResolvedValue(null);

      const result = await streamService.leaveStream('stream-id-123', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('updateHealth', () => {
    it('should update stream health', async () => {
      const mockStream: Stream = {
        id: 'stream-123',
        streamId: 'stream-id-123',
      } as any;

      const mockHealth = {
        id: 'health-123',
        streamId: 'stream-id-123',
        health: 'healthy',
      };

      const mockUpdatedHealth = {
        ...mockHealth,
        health: 'warning',
      };

      mockStreamRepository.findByStreamId.mockResolvedValue(mockStream);
      mockStreamHealthRepository.findByStreamId.mockResolvedValue(mockHealth as any);
      mockStreamHealthRepository.update.mockResolvedValue(mockUpdatedHealth as any);
      mockStreamRepository.updateHealth.mockResolvedValue(mockStream);

      const result = await streamService.updateHealth('stream-id-123', { health: 'warning' });

      expect(result.health).toBe('warning');
    });
  });

  describe('recordHeartbeat', () => {
    it('should record heartbeat', async () => {
      const mockHealth = {
        id: 'health-123',
        streamId: 'stream-id-123',
      };

      mockStreamHealthRepository.findByStreamId.mockResolvedValue(mockHealth as any);
      mockStreamHealthRepository.updateHeartbeat.mockResolvedValue(mockHealth as any);

      await streamService.recordHeartbeat('stream-id-123');

      expect(mockStreamHealthRepository.updateHeartbeat).toHaveBeenCalled();
    });
  });
});
