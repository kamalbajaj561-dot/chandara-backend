import { ReceiptRepository } from '../receipt.repository';
import { getFirestore } from '../../services/firebase';
import { Receipt, Currency, TicketType } from '../../types';

jest.mock('../../services/firebase');

describe('ReceiptRepository', () => {
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
    it('should return receipt if found', async () => {
      const mockReceipt: Receipt = {
        receiptId: 'receipt1',
        orderId: 'order1',
        userId: 'user1',
        items: {
          ticketId: 'ticket1',
          ticketType: 'general' as TicketType,
          eventName: 'Test Event',
          price: 100,
          quantity: 1,
        },
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD' as Currency,
        generatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'receipt1',
        data: () => mockReceipt,
      });

      const repository = new ReceiptRepository();
      const result = await repository.findById('receipt1');

      expect(result).not.toBeNull();
      expect(result?.receiptId).toBe('receipt1');
    });

    it('should return null if receipt not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new ReceiptRepository();
      const result = await repository.findById('receipt1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new receipt', async () => {
      const newReceipt: Omit<Receipt, 'receiptId'> = {
        orderId: 'order1',
        userId: 'user1',
        items: {
          ticketId: 'ticket1',
          ticketType: 'general' as TicketType,
          eventName: 'Test Event',
          price: 100,
          quantity: 1,
        },
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD' as Currency,
        generatedAt: mockTimestamp,
      };

      const createdReceipt = { receiptId: 'receipt1', ...newReceipt };
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.set.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({ exists: true, id: 'receipt1', data: () => createdReceipt });

      const repository = new ReceiptRepository();
      const result = await repository.create(newReceipt);

      expect(mockDb.collection).toHaveBeenCalledWith('receipts');
      expect(result?.receiptId).toBe('receipt1');
    });
  });

  describe('findByOrderId', () => {
    it('should return receipt by order ID', async () => {
      const mockReceipt: Receipt = {
        receiptId: 'receipt1',
        orderId: 'order1',
        userId: 'user1',
        items: {
          ticketId: 'ticket1',
          ticketType: 'general' as TicketType,
          eventName: 'Test Event',
          price: 100,
          quantity: 1,
        },
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD' as Currency,
        generatedAt: mockTimestamp,
      };

      mockQuery.get.mockResolvedValue({
        docs: [{ id: 'receipt1', data: () => mockReceipt }],
      });

      const repository = new ReceiptRepository();
      const result = await repository.findByOrderId('order1');

      expect(result).not.toBeNull();
      expect(result?.receiptId).toBe('receipt1');
      expect(mockCollection.where).toHaveBeenCalledWith('orderId', '==', 'order1');
    });
  });
});
