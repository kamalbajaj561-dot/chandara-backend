import { TicketRepository } from '../ticket.repository';
import { getFirestore } from '../../services/firebase';
import { TicketingTicket, TicketType, TicketStatus } from '../../types';

jest.mock('../../services/firebase');

describe('TicketRepository', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;

  beforeEach(() => {
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
    it('should return ticket if found', async () => {
      const mockTicket: TicketingTicket = {
        ticketId: 'ticket1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'general' as TicketType,
        price: 100,
        currency: 'USD',
        status: 'active' as TicketStatus,
        qrCode: 'qr123',
        qrSignature: 'sig123',
        purchaseDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'ticket1',
        data: () => ({ ...mockTicket, purchaseDate: { toDate: () => mockTicket.purchaseDate }, createdAt: { toDate: () => mockTicket.createdAt }, updatedAt: { toDate: () => mockTicket.updatedAt } }),
      });

      const repository = new TicketRepository();
      const result = await repository.findById('ticket1');

      expect(result).toHaveProperty('ticketId', 'ticket1');
      expect(result?.eventId).toBe('event1');
      expect(mockDb.collection).toHaveBeenCalledWith('tickets');
      expect(mockCollection.doc).toHaveBeenCalledWith('ticket1');
    });

    it('should return null if ticket not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new TicketRepository();
      const result = await repository.findById('ticket1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new ticket', async () => {
      const newTicket: Omit<TicketingTicket, 'ticketId' | 'createdAt' | 'updatedAt'> = {
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'general' as TicketType,
        price: 100,
        currency: 'USD',
        status: 'active' as TicketStatus,
        qrCode: 'qr123',
        qrSignature: 'sig123',
        purchaseDate: new Date(),
      };

      const createdTicket = { ticketId: 'ticket1', ...newTicket, createdAt: new Date(), updatedAt: new Date() };
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.set.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({ 
        exists: true, 
        id: 'ticket1',
        data: () => ({ ...createdTicket, purchaseDate: { toDate: () => createdTicket.purchaseDate }, createdAt: { toDate: () => createdTicket.createdAt }, updatedAt: { toDate: () => createdTicket.updatedAt } }),
      });

      const repository = new TicketRepository();
      const result = await repository.create(newTicket);

      expect(mockDb.collection).toHaveBeenCalledWith('tickets');
      expect(mockCollection.doc).toHaveBeenCalled();
      expect(result).toHaveProperty('ticketId');
    });
  });

  describe('update', () => {
    it('should update a ticket', async () => {
      const updates = { status: 'used' as TicketStatus };
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ id: 'ticket1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new TicketRepository();
      const result = await repository.update('ticket1', updates);

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining(updates));
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a ticket', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      mockDoc.delete.mockResolvedValue(undefined);

      const repository = new TicketRepository();
      const result = await repository.delete('ticket1');

      expect(mockDoc.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if ticket not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new TicketRepository();
      const result = await repository.delete('ticket1');

      expect(result).toBe(false);
    });
  });

  describe('getTicketsByUserId', () => {
    it('should return tickets for a user', async () => {
      const mockTickets = [
        { id: 'ticket1', userId: 'user1' },
        { id: 'ticket2', userId: 'user1' },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockTickets.map((t) => ({ data: () => t })),
      });

      const repository = new TicketRepository();
      const result = await repository.findByUserId('user1', 10);

      expect(result).toHaveLength(2);
      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'user1');
    });
  });

  describe('getTicketsByOrderId', () => {
    it('should return tickets for an order', async () => {
      const mockTickets = [{ id: 'ticket1', orderId: 'order1' }];

      mockQuery.get.mockResolvedValue({
        docs: mockTickets.map((t) => ({ data: () => t })),
      });

      const repository = new TicketRepository();
      const result = await repository.findByOrderId('order1');

      expect(result).toHaveLength(1);
      expect(mockCollection.where).toHaveBeenCalledWith('orderId', '==', 'order1');
    });
  });

  describe('getTicketsByEventId', () => {
    it('should return tickets for an event', async () => {
      const mockTickets = [{ id: 'ticket1', eventId: 'event1' }];

      mockQuery.get.mockResolvedValue({
        docs: mockTickets.map((t) => ({ data: () => t })),
      });

      const repository = new TicketRepository();
      const result = await repository.findByEventId('event1', 10);

      expect(result).toHaveLength(1);
      expect(mockCollection.where).toHaveBeenCalledWith('eventId', '==', 'event1');
    });
  });

  describe('markAsUsed', () => {
    it('should mark ticket as used', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ id: 'ticket1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new TicketRepository();
      const result = await repository.markAsUsed('ticket1');

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'used' }));
      expect(result).toBeDefined();
    });
  });

  describe('cancelTicket', () => {
    it('should cancel a ticket', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ id: 'ticket1' }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new TicketRepository();
      const result = await repository.cancelTicket('ticket1');

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
      expect(result).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return ticket statistics for an event', async () => {
      const mockTickets = [
        { ticketType: 'general', status: 'active' },
        { ticketType: 'vip', status: 'active' },
        { ticketType: 'general', status: 'used' },
      ];

      mockQuery.get.mockResolvedValue({
        docs: mockTickets.map((t) => ({ data: () => t })),
      });

      const repository = new TicketRepository();
      const result = await repository.getStatistics('event1');

      expect(result).toBeDefined();
      expect(result.total).toBe(3);
    });
  });
});
