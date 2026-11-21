import { TicketDeliveryRepository } from '../ticketDelivery.repository';

// Mock Firestore
jest.mock('../../services/firebase');

describe('TicketDeliveryRepository', () => {
  let mockTimestamp: any;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let repository: TicketDeliveryRepository;

  beforeEach(() => {
    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    const mockDocSnapshot = {
      exists: true,
      id: 'DLV-123',
      data: jest.fn(),
      ref: {
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockDoc = {
      get: jest.fn(() => mockDocSnapshot),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      batch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn(),
      })),
    };

    const { getFirestore } = require('../../services/firebase');
    getFirestore.mockReturnValue(mockDb);

    repository = new TicketDeliveryRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new ticket delivery log', async () => {
      mockDoc.set.mockResolvedValue(undefined);

      const result = await repository.create({
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        recipient: 'test@example.com',
        provider: 'Email',
      });

      expect(result).toHaveProperty('deliveryId');
      expect(result.ticketId).toBe('TKT-123');
      expect(result.status).toBe('queued');
      expect(result.retryCount).toBe(0);
    });
  });

  describe('findById', () => {
    it('should find delivery log by ID', async () => {
      const mockDocSnapshot = {
        exists: true,
        id: 'DLV-123',
        data: jest.fn(() => ({
          ticketId: 'TKT-123',
          orderId: 'ORD-123',
          userId: 'user-123',
          recipient: 'test@example.com',
          status: 'sent',
          retryCount: 0,
          provider: 'Email',
          sentAt: mockTimestamp,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
        ref: {
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.findById('DLV-123');

      expect(result).not.toBeNull();
      expect(result?.deliveryId).toBe('DLV-123');
    });

    it('should return null if not found', async () => {
      const mockDocSnapshot = {
        exists: false,
        id: 'DLV-999',
        data: jest.fn(),
        ref: {
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.findById('DLV-999');

      expect(result).toBeNull();
    });
  });

  describe('findByTicketId', () => {
    it('should find delivery logs by ticket ID', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: 'DLV-123',
            data: () => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'sent',
              retryCount: 0,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      const result = await repository.findByTicketId('TKT-123');

      expect(result).toHaveLength(1);
      expect(result[0].ticketId).toBe('TKT-123');
    });
  });

  describe('findByOrderId', () => {
    it('should find delivery logs by order ID', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: 'DLV-123',
            data: () => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'sent',
              retryCount: 0,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      const result = await repository.findByOrderId('ORD-123');

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe('ORD-123');
    });
  });

  describe('findByUserId', () => {
    it('should find delivery logs by user ID with pagination', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: 'DLV-123',
            data: () => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'sent',
              retryCount: 0,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      const result = await repository.findByUserId('user-123', 25, 0);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-123');
    });
  });

  describe('updateStatus', () => {
    it('should update delivery status', async () => {
      const mockDocSnapshot = {
        exists: true,
        id: 'DLV-123',
        data: jest.fn(() => ({
          ticketId: 'TKT-123',
          orderId: 'ORD-123',
          userId: 'user-123',
          recipient: 'test@example.com',
          status: 'queued',
          retryCount: 0,
          provider: 'Email',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
        ref: {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'DLV-123',
            data: jest.fn(() => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'sent',
              retryCount: 0,
              provider: 'Email',
              sentAt: mockTimestamp,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            })),
            ref: {
              get: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          }),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.updateStatus('DLV-123', 'sent');

      expect(result?.status).toBe('sent');
      expect(result?.sentAt).toBeDefined();
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const mockDocSnapshot = {
        exists: true,
        id: 'DLV-123',
        data: jest.fn(() => ({
          ticketId: 'TKT-123',
          orderId: 'ORD-123',
          userId: 'user-123',
          recipient: 'test@example.com',
          status: 'failed',
          retryCount: 0,
          provider: 'Email',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
        ref: {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'DLV-123',
            data: jest.fn(() => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'failed',
              retryCount: 1,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            })),
            ref: {
              get: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          }),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.incrementRetryCount('DLV-123');

      expect(result?.retryCount).toBe(1);
    });
  });

  describe('updateWithError', () => {
    it('should update delivery with error', async () => {
      const mockDocSnapshot = {
        exists: true,
        id: 'DLV-123',
        data: jest.fn(() => ({
          ticketId: 'TKT-123',
          orderId: 'ORD-123',
          userId: 'user-123',
          recipient: 'test@example.com',
          status: 'queued',
          retryCount: 0,
          provider: 'Email',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
        ref: {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'DLV-123',
            data: jest.fn(() => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'failed',
              retryCount: 0,
              provider: 'Email',
              error: 'SMTP error',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            })),
            ref: {
              get: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          }),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.updateWithError('DLV-123', 'SMTP error');

      expect(result?.status).toBe('failed');
      expect(result?.error).toBe('SMTP error');
    });
  });

  describe('findFailedForRetry', () => {
    it('should find failed deliveries for retry', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: 'DLV-123',
            data: () => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'failed',
              retryCount: 1,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      const result = await repository.findFailedForRetry(3);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('failed');
      expect(result[0].retryCount).toBeLessThan(3);
    });
  });

  describe('getStatistics', () => {
    it('should get delivery statistics', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [
          {
            id: 'DLV-123',
            data: () => ({
              ticketId: 'TKT-123',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'sent',
              retryCount: 0,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
          {
            id: 'DLV-124',
            data: () => ({
              ticketId: 'TKT-124',
              orderId: 'ORD-123',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'delivered',
              retryCount: 0,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
          {
            id: 'DLV-125',
            data: () => ({
              ticketId: 'TKT-125',
              orderId: 'ORD-124',
              userId: 'user-123',
              recipient: 'test@example.com',
              status: 'failed',
              retryCount: 1,
              provider: 'Email',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      const result = await repository.getStatistics('user-123');

      expect(result.total).toBe(3);
      expect(result.sent).toBe(1);
      expect(result.delivered).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete delivery log', async () => {
      const mockDocSnapshot = {
        exists: true,
        id: 'DLV-123',
        data: jest.fn(),
        ref: {
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn().mockResolvedValue(undefined),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.delete('DLV-123');

      expect(result).toBe(true);
    });

    it('should return false if not found', async () => {
      const mockDocSnapshot = {
        exists: false,
        id: 'DLV-999',
        data: jest.fn(),
        ref: {
          get: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
      mockDoc.get.mockResolvedValue(mockDocSnapshot);

      const result = await repository.delete('DLV-999');

      expect(result).toBe(false);
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete old logs', async () => {
      const mockSnapshot = {
        docs: [
          { ref: { delete: jest.fn().mockResolvedValue(true) } },
          { ref: { delete: jest.fn().mockResolvedValue(true) } },
        ],
      };
      const mockBatch = {
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.batch.mockReturnValue(mockBatch);
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await repository.deleteOldLogs(90);

      expect(result).toBe(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
