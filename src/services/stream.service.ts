import { StreamRepository } from '../repositories/stream.repository';
import { StreamSessionRepository } from '../repositories/streamSession.repository';
import { StreamHealthRepository } from '../repositories/streamHealth.repository';
import { EventService } from './event.service';
import { createRoom, deleteRoom, generateLiveKitToken } from './livekit';
import { getCache, setCache, incrementCache, decrementCache, deleteCache } from './redis';
import { AppError } from '../middleware/errorHandler';
import { Stream, StreamSession, StreamHealth } from '../types';
import { randomBytes } from 'crypto';

export class StreamService {
  private streamRepository: StreamRepository;
  private streamSessionRepository: StreamSessionRepository;
  private streamHealthRepository: StreamHealthRepository;
  private eventService: EventService;

  constructor(
    streamRepository?: StreamRepository,
    streamSessionRepository?: StreamSessionRepository,
    streamHealthRepository?: StreamHealthRepository,
    eventService?: EventService
  ) {
    this.streamRepository = streamRepository || new StreamRepository();
    this.streamSessionRepository = streamSessionRepository || new StreamSessionRepository();
    this.streamHealthRepository = streamHealthRepository || new StreamHealthRepository();
    this.eventService = eventService || new EventService();
  }

  async startStream(eventId: string, creatorUid: string, recordingEnabled = false): Promise<{ stream: Stream; token: string }> {
    const event = await this.eventService.getEvent(eventId);

    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to start this stream', 403);
    }

    if (event.status !== 'scheduled') {
      throw new AppError('Event must be scheduled to start streaming', 400);
    }

    const existingStream = await this.streamRepository.getByEvent(eventId);
    if (existingStream && existingStream.status === 'live') {
      throw new AppError('Stream is already live', 400);
    }

    const streamId = randomBytes(16).toString('hex');
    const roomName = `event-${eventId}-${streamId}`;
    const liveKitRoom = `chandara-${roomName}`;

    // Retry logic for room creation with exponential backoff
    let roomCreated = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!roomCreated && retryCount < maxRetries) {
      try {
        await createRoom(liveKitRoom);
        roomCreated = true;
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new AppError('Failed to create streaming room after retries', 500);
        }
      }
    }

    const streamData: Omit<Stream, 'id' | 'createdAt' | 'updatedAt'> = {
      streamId,
      eventId,
      creatorId: creatorUid,
      roomName,
      liveKitRoom,
      status: 'starting',
      publisherConnected: false,
      viewerCount: 0,
      peakViewers: 0,
      recordingEnabled,
      health: 'healthy',
    };

    const stream = await this.streamRepository.create(streamData);

    const healthData: Omit<StreamHealth, 'id' | 'lastChecked'> = {
      streamId,
      publisherConnected: false,
      roomExists: true,
      viewerCount: 0,
      reconnectAttempts: 0,
      heartbeatTimestamp: new Date(),
      liveKitAvailable: true,
      health: 'healthy',
    };

    await this.streamHealthRepository.create(healthData);

    await this.streamRepository.updateStatus(stream.id, 'live');
    await this.eventService.startEvent(eventId, creatorUid);

    const token = await this.generatePublisherToken(streamId, creatorUid, liveKitRoom);

    await setCache(`stream:${streamId}:viewers`, 0, 3600);
    await setCache(`stream:${streamId}:peak`, 0, 3600);
    await setCache(`stream:${streamId}:active`, 'true', 3600);

    return { stream, token };
  }

  async stopStream(eventId: string, creatorUid: string): Promise<Stream> {
    const event = await this.eventService.getEvent(eventId);

    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to stop this stream', 403);
    }

    const stream = await this.streamRepository.getByEvent(eventId);
    if (!stream) {
      throw new AppError('Stream not found', 404);
    }

    if (stream.status !== 'live' && stream.status !== 'reconnecting') {
      throw new AppError('Stream is not currently live', 400);
    }

    await this.streamRepository.updateStatus(stream.id, 'ending');

    // Retry logic for room deletion with exponential backoff
    let roomDeleted = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!roomDeleted && retryCount < maxRetries) {
      try {
        await deleteRoom(stream.liveKitRoom);
        roomDeleted = true;
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('Failed to delete LiveKit room after retries:', error);
          // Continue with cleanup even if room deletion fails
        }
      }
    }

    const viewerCount = await this.getCurrentViewerCount(stream.streamId);
    await this.streamRepository.updateViewerCount(stream.id, viewerCount);
    await this.streamRepository.updatePeakViewers(stream.id, stream.peakViewers);

    await this.streamRepository.updateStatus(stream.id, 'ended');
    await this.eventService.endEvent(eventId, creatorUid);

    await this.streamHealthRepository.deleteByStreamId(stream.streamId);
    await deleteCache(`stream:${stream.streamId}:viewers`);
    await deleteCache(`stream:${stream.streamId}:peak`);
    await deleteCache(`stream:${stream.streamId}:active`);

    const updatedStream = await this.streamRepository.findById(stream.id);
    if (!updatedStream) {
      throw new AppError('Stream not found after update', 500);
    }

    return updatedStream;
  }

  async generateToken(eventId: string, userId: string, role: 'publisher' | 'subscriber' | 'moderator'): Promise<{ token: string; url: string }> {
    const event = await this.eventService.getEvent(eventId);
    const stream = await this.streamRepository.getByEvent(eventId);

    if (!stream) {
      throw new AppError('Stream not found', 404);
    }

    if (stream.status !== 'live' && stream.status !== 'starting') {
      throw new AppError('Stream is not currently live', 400);
    }

    if (role === 'publisher') {
      if (event.creatorUid !== userId) {
        throw new AppError('Only the event creator can generate publisher tokens', 403);
      }
    }

    const token = await generateLiveKitToken({
      roomName: stream.liveKitRoom,
      participantName: userId,
      role,
    });

    return token;
  }

  async getStream(eventId: string): Promise<Stream> {
    const stream = await this.streamRepository.getByEvent(eventId);
    if (!stream) {
      throw new AppError('Stream not found', 404);
    }
    return stream;
  }

  async getStreamHealth(eventId: string): Promise<StreamHealth> {
    const stream = await this.streamRepository.getByEvent(eventId);
    if (!stream) {
      throw new AppError('Stream not found', 404);
    }

    const health = await this.streamHealthRepository.findByStreamId(stream.streamId);
    if (!health) {
      throw new AppError('Stream health data not found', 404);
    }

    return health;
  }

  async updateViewerCount(eventId: string, delta: number): Promise<Stream> {
    const stream = await this.streamRepository.getByEvent(eventId);
    if (!stream) {
      throw new AppError('Stream not found', 404);
    }

    const currentCount = await this.getCurrentViewerCount(stream.streamId);
    const newCount = Math.max(0, currentCount + delta);

    await setCache(`stream:${stream.streamId}:viewers`, newCount, 3600);

    if (newCount > stream.peakViewers) {
      await setCache(`stream:${stream.streamId}:peak`, newCount, 3600);
      await this.streamRepository.updatePeakViewers(stream.id, newCount);
    }

    await this.streamRepository.updateViewerCount(stream.id, newCount);

    const health = await this.streamHealthRepository.findByStreamId(stream.streamId);
    if (health) {
      await this.streamHealthRepository.updateViewerCount(health.id, newCount);
    }

    const updatedStream = await this.streamRepository.findById(stream.id);
    if (!updatedStream) {
      throw new AppError('Stream not found after update', 500);
    }

    return updatedStream;
  }

  async getLiveStreams(): Promise<Stream[]> {
    return await this.streamRepository.getLiveStreams();
  }

  async joinStream(streamId: string, userId: string, role: 'subscriber' | 'moderator'): Promise<StreamSession> {
    const stream = await this.streamRepository.findByStreamId(streamId);
    if (!stream) {
      throw new AppError('Stream not found', 404);
    }

    if (stream.status !== 'live') {
      throw new AppError('Stream is not currently live', 400);
    }

    const existingSession = await this.streamSessionRepository.findByUserAndStream(userId, streamId);
    if (existingSession) {
      return existingSession;
    }

    const sessionData: Omit<StreamSession, 'id' | 'joinedAt'> = {
      streamId,
      userId,
      role,
    };

    const session = await this.streamSessionRepository.create(sessionData);

    await incrementCache(`stream:${streamId}:viewers`);
    await this.updateViewerCount(stream.eventId, 1);

    return session;
  }

  async leaveStream(streamId: string, userId: string): Promise<StreamSession | null> {
    const session = await this.streamSessionRepository.findByUserAndStream(userId, streamId);
    if (!session) {
      return null;
    }

    const endedSession = await this.streamSessionRepository.endSession(session.id, new Date());

    await decrementCache(`stream:${streamId}:viewers`);

    const stream = await this.streamRepository.findByStreamId(streamId);
    if (stream) {
      await this.updateViewerCount(stream.eventId, -1);
    }

    return endedSession;
  }

  async updateHealth(streamId: string, healthData: Partial<StreamHealth>): Promise<StreamHealth> {
    const stream = await this.streamRepository.findByStreamId(streamId);
    if (!stream) {
      throw new AppError('Stream not found', 404);
    }

    const health = await this.streamHealthRepository.findByStreamId(streamId);
    if (!health) {
      throw new AppError('Stream health data not found', 404);
    }

    const updatedHealth = await this.streamHealthRepository.update(health.id, healthData);
    if (!updatedHealth) {
      throw new AppError('Failed to update stream health', 500);
    }

    await this.streamRepository.updateHealth(stream.id, healthData.health || health.health);

    return updatedHealth;
  }

  async recordHeartbeat(streamId: string): Promise<void> {
    const health = await this.streamHealthRepository.findByStreamId(streamId);
    if (health) {
      await this.streamHealthRepository.updateHeartbeat(health.id);
    }
  }

  private async generatePublisherToken(_streamId: string, userId: string, roomName: string): Promise<string> {
    const token = await generateLiveKitToken({
      roomName,
      participantName: userId,
      role: 'publisher',
    });

    return token.token;
  }

  private async getCurrentViewerCount(streamId: string): Promise<number> {
    const result = await getCache<number>(`stream:${streamId}:viewers`);
    const count = result?.data || 0;
    return count;
  }
}

export const streamService = new StreamService();
