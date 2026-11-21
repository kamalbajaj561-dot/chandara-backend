import { StreamRepository } from '../stream.repository';
import { getFirestore } from '../../services/firebase';

jest.mock('../../services/firebase');

describe('StreamRepository', () => {
  let streamRepository: StreamRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: true,
      id: 'stream-id',
      data: jest.fn(),
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn(),
      where: jest.fn().mockReturnValue(mockQuery),
      orderBy: jest.fn().mockReturnValue(mockQuery),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);

    streamRepository = new StreamRepository();
  });

  describe('create', () => {
    it('should create a new stream', async () => {
      const streamData = {
        streamId: 'stream-123',
        eventId: 'event-123',
        creatorId: 'creator-123',
        roomName: 'room-name',
        liveKitRoom: 'livekit-room',
        status: 'idle' as const,
        publisherConnected: false,
        viewerCount: 0,
        peakViewers: 0,
        recordingEnabled: false,
        health: 'healthy' as const,
      };

      const mockDocRef = { id: 'stream-id' };
      mockCollection.add.mockResolvedValue(mockDocRef);
      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.data.mockReturnValue(streamData);

      const result = await streamRepository.create(streamData);

      expect(mockCollection.add).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('stream-id');
    });
  });

  describe('findById', () => {
    it('should return stream by id', async () => {
      const mockStreamData = {
        streamId: 'stream-123',
        eventId: 'event-123',
      };

      mockDoc.data.mockReturnValue(mockStreamData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await streamRepository.findById('stream-id');

      expect(mockDb.collection).toHaveBeenCalledWith('streams');
      expect(mockCollection.doc).toHaveBeenCalledWith('stream-id');
      expect(result).toBeDefined();
      expect(result?.streamId).toBe('stream-123');
    });

    it('should return null if stream not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await streamRepository.findById('stream-id');

      expect(result).toBeNull();
    });
  });

  describe('findByStreamId', () => {
    it('should return stream by streamId', async () => {
      const mockStreamData = {
        streamId: 'stream-123',
        eventId: 'event-123',
      };

      mockDoc.data.mockReturnValue(mockStreamData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await streamRepository.findByStreamId('stream-123');

      expect(result).toBeDefined();
      expect(result?.streamId).toBe('stream-123');
    });

    it('should return null if streamId not found', async () => {
      mockQuery.get.mockResolvedValue({
        empty: true,
        docs: [],
      });

      const result = await streamRepository.findByStreamId('stream-123');

      expect(result).toBeNull();
    });
  });

  describe('getByEvent', () => {
    it('should return stream by eventId', async () => {
      const mockStreamData = {
        streamId: 'stream-123',
        eventId: 'event-123',
      };

      mockDoc.data.mockReturnValue(mockStreamData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await streamRepository.getByEvent('event-123');

      expect(result).toBeDefined();
      expect(result?.eventId).toBe('event-123');
    });
  });

  describe('update', () => {
    it('should update a stream', async () => {
      const existingData = {
        streamId: 'stream-123',
        status: 'idle' as const,
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const updateData = { status: 'live' as const };
      const result = await streamRepository.update('stream-id', updateData);

      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if stream not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await streamRepository.update('stream-id', { status: 'live' as const });

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update stream status', async () => {
      const existingData = {
        streamId: 'stream-123',
        status: 'idle' as const,
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await streamRepository.updateStatus('stream-id', 'live');

      expect(mockDoc.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a stream', async () => {
      mockDoc.exists = true;
      mockDoc.get.mockResolvedValue(mockDoc);
      mockDoc.delete.mockResolvedValue(undefined);

      const result = await streamRepository.delete('stream-id');

      expect(mockDoc.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if stream not found', async () => {
      mockDoc.exists = false;
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await streamRepository.delete('stream-id');

      expect(result).toBe(false);
    });
  });

  describe('getLiveStreams', () => {
    it('should get live streams', async () => {
      const mockStreamData = {
        streamId: 'stream-123',
        status: 'live' as const,
      };

      mockDoc.data.mockReturnValue(mockStreamData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await streamRepository.getLiveStreams();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('live');
    });
  });

  describe('getStreamsByCreator', () => {
    it('should get streams by creator', async () => {
      const mockStreamData = {
        streamId: 'stream-123',
        creatorId: 'creator-123',
      };

      mockDoc.data.mockReturnValue(mockStreamData);
      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [mockDoc],
      });

      const result = await streamRepository.getStreamsByCreator('creator-123');

      expect(result).toHaveLength(1);
      expect(result[0].creatorId).toBe('creator-123');
    });
  });
});
