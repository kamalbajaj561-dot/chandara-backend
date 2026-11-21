import { RefundRepository } from '../refund.repository';
import { getFirestore } from '../../services/firebase';
import { Refund, RefundStatus, Currency } from '../../types';

jest.mock('../../services/firebase');

describe('RefundRepository', () => {
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
    mockCollection = {
      doc: jest.fn(() => mockDoc),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockDb = {
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn(),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return refund if found', async () => {
      const mockRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'pending' as RefundStatus,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'refund1',
        data: () => mockRefund,
      });

      const repository = new RefundRepository();
      const result = await repository.findById('refund1');

      expect(result).not.toBeNull();
      expect(result?.refundId).toBe('refund1');
    });

    it('should return null if refund not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new RefundRepository();
      const result = await repository.findById('refund1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new refund', async () => {
      const newRefund: Omit<Refund, 'refundId' | 'createdAt' | 'updatedAt'> = {
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'pending' as RefundStatus,
      };

      const createdRefund = { refundId: 'refund1', ...newRefund, createdAt: mockTimestamp, updatedAt: mockTimestamp };
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.set.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({ exists: true, id: 'refund1', data: () => createdRefund });

      const repository = new RefundRepository();
      const result = await repository.create(newRefund);

      expect(mockDb.collection).toHaveBeenCalledWith('refunds');
      expect(result?.refundId).toBe('refund1');
    });
  });

  describe('updateStatus', () => {
    it('should update refund status', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ refundId: 'refund1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new RefundRepository();
      const result = await repository.updateStatus('refund1', 'approved' as RefundStatus);

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
      expect(result).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return refund statistics', async () => {
      const mockRefunds = [
        { status: 'approved', amount: 100 },
        { status: 'approved', amount: 50 },
        { status: 'pending', amount: 75 },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockRefunds.map((r) => ({ data: () => r })),
      });

      const repository = new RefundRepository();
      const result = await repository.getStatistics('event1');

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.totalRefunded).toBe(150);
    });
  });
});
