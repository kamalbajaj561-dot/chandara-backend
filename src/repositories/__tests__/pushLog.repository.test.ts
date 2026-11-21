import { PushLogRepository } from '../pushLog.repository';
import { getFirestore } from '../../services/firebase';
import { PushLog } from '../../types';

jest.mock('../../services/firebase');

describe('PushLogRepository', () => {
  let repository: PushLogRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockTimestamp: any;

  beforeEach(() => {
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
      data: jest.fn(),
    };

    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      get: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      get: jest.fn(),
    };

    mockDb = {
      collection: jest.fn(() => mockCollection),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new PushLogRepository();
  });

  describe('create', () => {
    it('should create a push log', async () => {
      const pushLog: Omit<PushLog, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        status: 'sent',
        provider: 'fcm',
        sentAt: mockTimestamp,
        retryCount: 0,
      };

      mockDoc.set.mockResolvedValue(undefined);

      const result = await repository.create(pushLog);

      expect(mockDb.collection).toHaveBeenCalledWith('push_logs');
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.title).toBe('Test');
    });
  });

  describe('findById', () => {
    it('should find push log by id', async () => {
      const pushLog: PushLog = {
        id: 'push-123',
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        status: 'sent',
        provider: 'fcm',
        sentAt: mockTimestamp,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
        retryCount: 0,
      };

      mockDoc.get.mockResolvedValue({ exists: true, id: 'push-123', data: () => pushLog });

      const result = await repository.findById('push-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('push-123');
    });

    it('should return null if not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await repository.findById('push-123');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find push logs by user id', async () => {
      const pushLogs: PushLog[] = [
        {
          id: 'push-1',
          userId: 'user-123',
          title: 'Test',
          body: 'Test body',
          status: 'sent',
          provider: 'fcm',
          sentAt: mockTimestamp,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          retryCount: 0,
        },
      ];

      mockQuery.get.mockResolvedValue({
        docs: [{ id: 'push-1', data: () => pushLogs[0] }],
      });

      const result = await repository.findByUserId('user-123', 10, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('push-1');
    });
  });

  describe('update', () => {
    it('should update push log', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ id: 'push-123' }) });
      mockDoc.update.mockResolvedValue(undefined);

      await repository.update('push-123', { status: 'delivered' });

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'delivered' }));
    });
  });

  describe('delete', () => {
    it('should delete push log', async () => {
      mockDoc.delete.mockResolvedValue(undefined);

      await repository.delete('push-123');

      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [
          { data: () => ({ status: 'sent' }) },
          { data: () => ({ status: 'delivered' }) },
          { data: () => ({ status: 'failed' }) },
        ],
      });

      const stats = await repository.getStatistics('user-123');

      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(1);
      expect(stats.delivered).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });
});
