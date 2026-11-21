import { ReceiptService } from '../receipt.service';
import { Receipt, Currency, TicketType } from '../../types';
import { pdfService } from '../pdf.service';

jest.mock('../../repositories/receipt.repository');
jest.mock('../pdf.service');
jest.mock('../redis');

describe('ReceiptService', () => {
  let receiptService: ReceiptService;

  beforeEach(() => {
    receiptService = new ReceiptService();
    jest.clearAllMocks();
  });

  describe('generateReceiptPDF', () => {
    it('should generate a receipt PDF', async () => {
      const mockPDF = Buffer.from('mock-pdf-content');
      (pdfService.generateReceiptPDF as jest.Mock).mockResolvedValue(mockPDF);

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
        eventId: 'event1',
        subtotal: 100,
        tax: 10,
        platformFee: 5,
        discount: 0,
        couponId: 'SAVE10',
        total: 115,
        currency: 'USD',
        paymentProvider: 'stripe',
        paymentId: 'pay_123',
        createdAt: new Date(),
      });

      const { eventRepository } = require('../../repositories/event.repository');
      eventRepository.findById = jest.fn().mockResolvedValue({
        title: 'Test Event',
        eventDate: '2024-12-25',
        eventTime: '19:00',
        venue: 'Test Venue',
        creatorUid: 'creator1',
      });

      const { UserRepository } = require('../../repositories/user.repository');
      UserRepository.findById = jest.fn()
        .mockResolvedValueOnce({ displayName: 'John Doe', email: 'john@example.com' })
        .mockResolvedValueOnce({ displayName: 'Jane Smith', email: 'jane@example.com' });

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.findByOrderId = jest.fn().mockResolvedValue([
        {
          ticketId: 'ticket1',
          ticketType: 'regular',
          price: 50,
        },
      ]);

      const result = await receiptService.generateReceiptPDF('order1');

      expect(result.success).toBe(true);
      expect(result.pdf).toEqual(mockPDF);
      expect(pdfService.generateReceiptPDF).toHaveBeenCalled();
    });

    it('should return error if order not found', async () => {
      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue(null);

      const result = await receiptService.generateReceiptPDF('order1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to generate receipt data');
    });

    it('should return error if PDF generation fails', async () => {
      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
        eventId: 'event1',
        subtotal: 100,
        tax: 10,
        platformFee: 5,
        discount: 0,
        total: 115,
        currency: 'USD',
        paymentProvider: 'stripe',
        paymentId: 'pay_123',
        createdAt: new Date(),
      });

      const { eventRepository } = require('../../repositories/event.repository');
      eventRepository.findById = jest.fn().mockResolvedValue({
        title: 'Test Event',
        eventDate: '2024-12-25',
        eventTime: '19:00',
        venue: 'Test Venue',
        creatorUid: 'creator1',
      });

      const { UserRepository } = require('../../repositories/user.repository');
      UserRepository.findById = jest.fn()
        .mockResolvedValueOnce({ displayName: 'John Doe', email: 'john@example.com' })
        .mockResolvedValueOnce({ displayName: 'Jane Smith', email: 'jane@example.com' });

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.findByOrderId = jest.fn().mockResolvedValue([]);

      (pdfService.generateReceiptPDF as jest.Mock).mockRejectedValue(new Error('PDF generation failed'));

      const result = await receiptService.generateReceiptPDF('order1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF generation failed');
    });
  });

  describe('generateReceipt', () => {
    it('should generate a new receipt', async () => {
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
        generatedAt: new Date(),
      };

      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.create = jest.fn().mockResolvedValue(mockReceipt);
      receiptRepository.findByOrderId = jest.fn().mockResolvedValue(null);

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
        eventId: 'event1',
        status: 'paid',
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD',
      });

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.findByOrderId = jest.fn().mockResolvedValue([
        {
          ticketId: 'ticket1',
          ticketType: 'general',
          price: 100,
        },
      ]);

      const result = await receiptService.generateReceipt('order1');

      expect(receiptRepository.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true, receipt: mockReceipt });
    });

    it('should return existing receipt if already generated', async () => {
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
        generatedAt: new Date(),
      };

      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByOrderId = jest.fn().mockResolvedValue(mockReceipt);

      const result = await receiptService.generateReceipt('order1');

      expect(receiptRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, receipt: mockReceipt });
    });

    it('should return error if order not found', async () => {
      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByOrderId = jest.fn().mockResolvedValue(null);

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue(null);

      const result = await receiptService.generateReceipt('order1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order not found');
    });

    it('should return error if order not paid', async () => {
      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByOrderId = jest.fn().mockResolvedValue(null);

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
        eventId: 'event1',
        status: 'pending',
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD',
      });

      const result = await receiptService.generateReceipt('order1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order must be paid');
    });
  });

  describe('getReceiptById', () => {
    it('should return receipt by ID', async () => {
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
        generatedAt: new Date(),
      };

      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findById = jest.fn().mockResolvedValue(mockReceipt);

      const result = await receiptService.getReceiptById('receipt1');

      expect(result).toEqual(mockReceipt);
      expect(receiptRepository.findById).toHaveBeenCalledWith('receipt1');
    });
  });

  describe('getReceiptByOrderId', () => {
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
        generatedAt: new Date(),
      };

      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByOrderId = jest.fn().mockResolvedValue(mockReceipt);

      const result = await receiptService.getReceiptByOrderId('order1');

      expect(result).toEqual(mockReceipt);
      expect(receiptRepository.findByOrderId).toHaveBeenCalledWith('order1');
    });
  });

  describe('getReceiptsByUserId', () => {
    it('should return receipts by user ID', async () => {
      const mockReceipts = [
        {
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
          generatedAt: new Date(),
        },
      ];

      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByUserId = jest.fn().mockResolvedValue(mockReceipts);

      const result = await receiptService.getReceiptsByUserId('user1');

      expect(result).toEqual(mockReceipts);
      expect(receiptRepository.findByUserId).toHaveBeenCalledWith('user1', 50);
    });

    it('should use custom limit', async () => {
      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByUserId = jest.fn().mockResolvedValue([]);

      await receiptService.getReceiptsByUserId('user1', 25);

      expect(receiptRepository.findByUserId).toHaveBeenCalledWith('user1', 25);
    });
  });

  describe('deleteReceipt', () => {
    it('should delete receipt', async () => {
      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.delete = jest.fn().mockResolvedValue(true);

      const result = await receiptService.deleteReceipt('receipt1');

      expect(result).toBe(true);
      expect(receiptRepository.delete).toHaveBeenCalledWith('receipt1');
    });
  });

  describe('regenerateReceipt', () => {
    it('should delete existing receipt and generate new one', async () => {
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
        generatedAt: new Date(),
      };

      const { receiptRepository } = require('../../repositories/receipt.repository');
      receiptRepository.findByOrderId = jest.fn().mockResolvedValueOnce(mockReceipt).mockResolvedValueOnce(null);
      receiptRepository.delete = jest.fn().mockResolvedValue(true);
      receiptRepository.create = jest.fn().mockResolvedValue(mockReceipt);

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
        eventId: 'event1',
        status: 'paid',
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD',
      });

      const { ticketRepository } = require('../../repositories/ticket.repository');
      ticketRepository.findByOrderId = jest.fn().mockResolvedValue([
        {
          ticketId: 'ticket1',
          ticketType: 'general',
          price: 100,
        },
      ]);

      const result = await receiptService.regenerateReceipt('order1');

      expect(receiptRepository.delete).toHaveBeenCalledWith('receipt1');
      expect(receiptRepository.create).toHaveBeenCalled();
      expect(result).toEqual({ success: true, receipt: mockReceipt });
    });
  });
});
