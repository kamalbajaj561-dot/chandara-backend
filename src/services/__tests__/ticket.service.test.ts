import { TicketService } from '../ticket.service';
import { TicketingTicket, TicketType, Currency } from '../../types';

jest.mock('../../repositories/ticket.repository');
jest.mock('../../repositories/order.repository');

describe('TicketService', () => {
  let ticketService: TicketService;

  beforeEach(() => {
    ticketService = new TicketService();
    jest.clearAllMocks();
  });

  describe('createTicket', () => {
    it('should create a ticket with QR code and signature', async () => {
      const mockTicket: TicketingTicket = {
        ticketId: 'ticket1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'general' as TicketType,
        price: 100,
        currency: 'USD' as Currency,
        status: 'active',
        qrCode: 'qr123',
        qrSignature: 'sig123',
        purchaseDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.create = jest.fn().mockResolvedValue(mockTicket);

      const result = await ticketService.createTicket(
        'event1',
        'user1',
        'creator1',
        'order1',
        'general' as TicketType,
        100,
        'USD' as Currency
      );

      expect(ticketRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockTicket);
    });
  });

  describe('createTicketsForOrder', () => {
    it('should create multiple tickets for an order', async () => {
      const mockTicket: TicketingTicket = {
        ticketId: 'ticket1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'general' as TicketType,
        price: 100,
        currency: 'USD' as Currency,
        status: 'active',
        qrCode: 'qr123',
        qrSignature: 'sig123',
        purchaseDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.createWithConcurrencyCheck = jest.fn().mockResolvedValue({
        success: true,
        tickets: [mockTicket, mockTicket]
      });

      const items = [
        { ticketType: 'general' as TicketType, price: 100, quantity: 2 },
      ];

      const result = await ticketService.createTicketsForOrder(
        'event1',
        'user1',
        'creator1',
        'order1',
        items,
        'USD' as Currency
      );

      expect(result.success).toBe(true);
      expect(result.tickets).toHaveLength(2);
      expect(ticketRepository.createWithConcurrencyCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateTicket', () => {
    it('should validate a valid ticket', async () => {
      const mockTicket: TicketingTicket = {
        ticketId: 'ticket1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'general' as TicketType,
        price: 100,
        currency: 'USD' as Currency,
        status: 'active',
        qrCode: 'qr123',
        qrSignature: 'sig123',
        purchaseDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.findByQRCode = jest.fn().mockResolvedValue(mockTicket);

      const result = await ticketService.validateTicket('ticket1');

      expect(result.valid).toBe(true);
      expect(result.ticket).toEqual(mockTicket);
    });

    it('should return false for non-existent ticket', async () => {
      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.findByQRCode = jest.fn().mockResolvedValue(null);

      const result = await ticketService.validateTicket('ticket1');

      expect(result.valid).toBe(false);
    });
  });
});
