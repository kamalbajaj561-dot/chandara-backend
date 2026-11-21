import { PaymentRepository } from '../payment.repository';
import { getFirestore } from '../../services/firebase';
import { Payment, PaymentProvider, OrderStatus } from '../../types';

jest.mock('../../services/firebase');

describe('PaymentRepository', () => {
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
    it('should return payment if found', async () => {
      const mockPayment: Payment = {
        paymentId: 'payment1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD',
        provider: 'razorpay' as PaymentProvider,
        providerPaymentId: 'razorpay123',
        status: 'paid' as OrderStatus,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'payment1',
        data: () => mockPayment,
      });

      const repository = new PaymentRepository();
      const result = await repository.findById('payment1');

      expect(result).not.toBeNull();
      expect(result?.paymentId).toBe('payment1');
    });

    it('should return null if payment not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new PaymentRepository();
      const result = await repository.findById('payment1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new payment', async () => {
      const newPayment: Omit<Payment, 'paymentId' | 'createdAt' | 'updatedAt'> = {
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD',
        provider: 'razorpay' as PaymentProvider,
        providerPaymentId: 'razorpay123',
        status: 'pending' as OrderStatus,
      };

      const createdPayment = { paymentId: 'payment1', ...newPayment, createdAt: mockTimestamp, updatedAt: mockTimestamp };
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.set.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({ exists: true, id: 'payment1', data: () => createdPayment });

      const repository = new PaymentRepository();
      const result = await repository.create(newPayment);

      expect(mockDb.collection).toHaveBeenCalledWith('payments');
      expect(result?.paymentId).toBe('payment1');
    });
  });

  describe('updateStatus', () => {
    it('should update payment status', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ paymentId: 'payment1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new PaymentRepository();
      const result = await repository.updateStatus('payment1', 'paid' as OrderStatus);

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid' }));
      expect(result).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return payment statistics', async () => {
      const mockPayments = [
        { status: 'paid', amount: 100 },
        { status: 'paid', amount: 200 },
        { status: 'pending', amount: 50 },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockPayments.map((p) => ({ data: () => p })),
      });

      const repository = new PaymentRepository();
      const result = await repository.getStatistics('event1');

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(result.totalAmount).toBe(350);
    });
  });
});
