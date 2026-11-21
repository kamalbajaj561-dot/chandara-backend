import { OrderRepository } from '../order.repository';
import { getFirestore } from '../../services/firebase';
import { TicketingOrder, OrderStatus } from '../../types';

jest.mock('../../services/firebase');

describe('OrderRepository', () => {
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
    it('should return order if found', async () => {
      const mockOrder: TicketingOrder = {
        orderId: 'order1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        ticketIds: ['ticket1', 'ticket2'],
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD',
        status: 'pending' as OrderStatus,
        paymentProvider: 'razorpay',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'order1',
        data: () => mockOrder,
      });

      const repository = new OrderRepository();
      const result = await repository.findById('order1');

      expect(result).not.toBeNull();
      expect(result?.orderId).toBe('order1');
    });

    it('should return null if order not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new OrderRepository();
      const result = await repository.findById('order1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const newOrder: Omit<TicketingOrder, 'orderId' | 'createdAt' | 'updatedAt'> = {
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        ticketIds: ['ticket1', 'ticket2'],
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD',
        status: 'pending' as OrderStatus,
        paymentProvider: 'razorpay',
      };

      const createdOrder = { orderId: 'order1', ...newOrder, createdAt: mockTimestamp, updatedAt: mockTimestamp };
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.set.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({ exists: true, id: 'order1', data: () => createdOrder });

      const repository = new OrderRepository();
      const result = await repository.create(newOrder);

      expect(mockDb.collection).toHaveBeenCalledWith('orders');
      expect(result?.orderId).toBe('order1');
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ orderId: 'order1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new OrderRepository();
      const result = await repository.updateStatus('order1', 'paid' as OrderStatus);

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }));
      expect(result).toBeDefined();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ orderId: 'order1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new OrderRepository();
      const result = await repository.cancelOrder('order1');

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
      expect(result).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return order statistics for an event', async () => {
      const mockOrders = [
        { status: 'paid', total: 100 },
        { status: 'paid', total: 200 },
        { status: 'pending', total: 50 },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockOrders.map((o) => ({ data: () => o })),
      });

      const repository = new OrderRepository();
      const result = await repository.getStatistics('event1');

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.revenue).toBe(300);
    });
  });
});
