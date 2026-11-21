import { Request, Response, NextFunction } from 'express';
import { StreamController } from '../stream.controller';
import { StreamService } from '../../services/stream.service';

jest.mock('../../services/stream.service');

describe('StreamController', () => {
  let streamController: StreamController;
  let mockStreamService: jest.Mocked<StreamService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStreamService = {
      startStream: jest.fn().mockResolvedValue({ stream: {}, token: 'test-token' }),
      stopStream: jest.fn().mockResolvedValue({}),
      generateToken: jest.fn().mockResolvedValue({ token: 'test-token', url: 'test-url' }),
      getStream: jest.fn().mockResolvedValue({}),
      getStreamHealth: jest.fn().mockResolvedValue({}),
      updateViewerCount: jest.fn().mockResolvedValue({}),
      getLiveStreams: jest.fn().mockResolvedValue([]),
      joinStream: jest.fn().mockResolvedValue({}),
      leaveStream: jest.fn().mockResolvedValue({}),
      updateHealth: jest.fn().mockResolvedValue({}),
      recordHeartbeat: jest.fn().mockResolvedValue(undefined),
    } as any;

    streamController = new StreamController(mockStreamService);

    mockRequest = {
      params: {},
      body: {},
      user: { userId: 'user-id', id: 'user-id', email: 'test@example.com', role: 'creator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('startStream', () => {
    it('should start a stream successfully', async () => {
      const mockStream = {
        id: 'stream-id',
        streamId: 'stream-123',
        status: 'live',
      };

      const mockToken = 'jwt-token';

      mockRequest.params = { eventId: 'event-123' };
      mockRequest.body = { recordingEnabled: false };
      mockStreamService.startStream.mockResolvedValue({ stream: mockStream as any, token: mockToken });

      await streamController.startStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.startStream).toHaveBeenCalledWith('event-123', 'user-id', false);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { stream: mockStream, token: mockToken },
        message: 'Stream started successfully',
      });
    });

    it('should return 401 if unauthorized', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { eventId: 'event-123' };

      await streamController.startStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should call next on error', async () => {
      mockRequest.params = { eventId: 'event-123' };
      mockStreamService.startStream.mockRejectedValue(new Error('Failed to start'));

      await streamController.startStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('stopStream', () => {
    it('should stop a stream successfully', async () => {
      const mockStream = {
        id: 'stream-id',
        status: 'ended',
      };

      mockRequest.params = { eventId: 'event-123' };
      mockStreamService.stopStream.mockResolvedValue(mockStream as any);

      await streamController.stopStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.stopStream).toHaveBeenCalledWith('event-123', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStream,
        message: 'Stream stopped successfully',
      });
    });

    it('should return 401 if unauthorized', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { eventId: 'event-123' };

      await streamController.stopStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('getToken', () => {
    it('should generate token successfully', async () => {
      const mockToken = {
        token: 'jwt-token',
        url: 'wss://livekit-url',
      };

      mockRequest.params = { eventId: 'event-123' };
      mockRequest.body = { role: 'subscriber' };
      mockStreamService.generateToken.mockResolvedValue(mockToken as any);

      await streamController.getToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.generateToken).toHaveBeenCalledWith('event-123', 'user-id', 'subscriber');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockToken,
      });
    });

    it('should return 401 if unauthorized', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { eventId: 'event-123' };

      await streamController.getToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('getStream', () => {
    it('should get stream successfully', async () => {
      const mockStream = {
        id: 'stream-id',
        eventId: 'event-123',
      };

      mockRequest.params = { eventId: 'event-123' };
      mockStreamService.getStream.mockResolvedValue(mockStream as any);

      await streamController.getStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.getStream).toHaveBeenCalledWith('event-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStream,
      });
    });

    it('should call next on error', async () => {
      mockRequest.params = { eventId: 'event-123' };
      mockStreamService.getStream.mockRejectedValue(new Error('Not found'));

      await streamController.getStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getStreamHealth', () => {
    it('should get stream health successfully', async () => {
      const mockHealth = {
        id: 'health-id',
        streamId: 'stream-123',
        health: 'healthy',
      };

      mockRequest.params = { eventId: 'event-123' };
      mockStreamService.getStreamHealth.mockResolvedValue(mockHealth as any);

      await streamController.getStreamHealth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.getStreamHealth).toHaveBeenCalledWith('event-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockHealth,
      });
    });
  });

  describe('updateViewers', () => {
    it('should update viewer count successfully', async () => {
      const mockStream = {
        id: 'stream-id',
        viewerCount: 101,
      };

      mockRequest.params = { eventId: 'event-123' };
      mockRequest.body = { delta: 1 };
      mockStreamService.updateViewerCount.mockResolvedValue(mockStream as any);

      await streamController.updateViewers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.updateViewerCount).toHaveBeenCalledWith('event-123', 1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStream,
        message: 'Viewer count updated successfully',
      });
    });
  });

  describe('getLiveStreams', () => {
    it('should get live streams successfully', async () => {
      const mockStreams = [
        { id: 'stream-1', status: 'live' },
        { id: 'stream-2', status: 'live' },
      ];

      mockStreamService.getLiveStreams.mockResolvedValue(mockStreams as any);

      await streamController.getLiveStreams(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.getLiveStreams).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStreams,
      });
    });
  });

  describe('joinStream', () => {
    it('should join stream successfully', async () => {
      const mockSession = {
        id: 'session-id',
        userId: 'user-id',
        streamId: 'stream-123',
      };

      mockRequest.params = { streamId: 'stream-123' };
      mockRequest.body = { role: 'subscriber' };
      mockStreamService.joinStream.mockResolvedValue(mockSession as any);

      await streamController.joinStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.joinStream).toHaveBeenCalledWith('stream-123', 'user-id', 'subscriber');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSession,
        message: 'Joined stream successfully',
      });
    });

    it('should return 401 if unauthorized', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { streamId: 'stream-123' };

      await streamController.joinStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('leaveStream', () => {
    it('should leave stream successfully', async () => {
      const mockSession = {
        id: 'session-id',
        leftAt: new Date(),
      };

      mockRequest.params = { streamId: 'stream-123' };
      mockStreamService.leaveStream.mockResolvedValue(mockSession as any);

      await streamController.leaveStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.leaveStream).toHaveBeenCalledWith('stream-123', 'user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSession,
        message: 'Left stream successfully',
      });
    });

    it('should return 401 if unauthorized', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { streamId: 'stream-123' };

      await streamController.leaveStream(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
      });
    });
  });

  describe('updateHealth', () => {
    it('should update stream health successfully', async () => {
      const mockHealth = {
        id: 'health-id',
        health: 'warning',
      };

      mockRequest.params = { streamId: 'stream-123' };
      mockRequest.body = { health: 'warning' };
      mockStreamService.updateHealth.mockResolvedValue(mockHealth as any);

      await streamController.updateHealth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.updateHealth).toHaveBeenCalledWith('stream-123', { health: 'warning' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockHealth,
        message: 'Stream health updated successfully',
      });
    });
  });

  describe('recordHeartbeat', () => {
    it('should record heartbeat successfully', async () => {
      mockRequest.params = { streamId: 'stream-123' };
      mockStreamService.recordHeartbeat.mockResolvedValue(undefined);

      await streamController.recordHeartbeat(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStreamService.recordHeartbeat).toHaveBeenCalledWith('stream-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Heartbeat recorded successfully',
      });
    });
  });
});
