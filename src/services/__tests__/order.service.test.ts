import { OrderService } from '../order.service';
import { TicketingOrder, OrderStatus, Currency } from '../../types';

jest.mock('../../repositories/order.repository');
jest.mock('../../repositories/ticket.repository');

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    orderService = new OrderService();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      const mockOrder: TicketingOrder = {
        orderId: 'order1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        ticketIds: ['ticket1', 'ticket2'],
        subtotal: 200,
        discount: 0,
        tax: 20,
        platformFee: 10,
        total: 230,
        currency: 'USD' as Currency,
        status: 'pending' as OrderStatus,
        paymentProvider: 'razorpay',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.create = jest.fn().mockResolvedValue(mockOrder);
      orderService.eventLookup = jest.fn().mockResolvedValue({ id: 'event1', ownerId: 'creator1', status: 'live', ticketPrice: 100, currency: 'USD' });

      const items = [
        { ticketType: 'general', price: 0.01, quantity: 2 }, // client-sent price must be ignored
      ];

      const result = await orderService.createOrder(
        'user1',
        'creator1',
        'event1',
        items,
        'USD' as Currency,
        'razorpay'
      );

      expect(orderRepository.create).toHaveBeenCalled();
      const saved = (orderRepository.create as jest.Mock).mock.calls[0][0];
      expect(saved.subtotal).toBe(200); // 2 x server price 100, not 2 x client 0.01
      expect(saved.items).toEqual([{ ticketType: 'regular', price: 100, quantity: 2 }]);
      expect(saved.creatorId).toBe('creator1');
      expect(result).toEqual({ success: true, order: mockOrder });
    });

    const create = (overrides: any = {}, items: any[] = [{ ticketType: 'general', price: 1, quantity: 1 }], provider: any = 'razorpay') => {
      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.create = jest.fn();
      orderService.eventLookup = jest.fn().mockResolvedValue({ id: 'event1', ownerId: 'c', status: 'live', ticketPrice: 50, ...overrides });
      return orderService.createOrder('user1', '', 'event1', items, 'USD' as Currency, provider);
    };

    it('rejects unknown events', async () => {
      const { orderRepository } = require('../../repositories/order.repository');
      orderService.eventLookup = jest.fn().mockRejectedValue(new Error('nope'));
      const r = await orderService.createOrder('u', '', 'x', [{ ticketType: 'general', price: 1, quantity: 1 }], 'USD' as Currency, 'razorpay');
      expect(r.success).toBe(false);
      expect(orderRepository.create).not.toHaveBeenCalled();
    });

    it('rejects ended, cancelled, pending and free events', async () => {
      for (const status of ['ended', 'cancelled', 'pending', 'draft', 'rejected']) {
        expect((await create({ status })).success).toBe(false);
      }
      expect((await create({ ticketPrice: 0 })).success).toBe(false);
    });

    it('rejects bad quantities and unsupported ticket types', async () => {
      expect((await create({}, [{ ticketType: 'general', price: 1, quantity: 11 }])).success).toBe(false);
      expect((await create({}, [{ ticketType: 'general', price: 1, quantity: 0 }])).success).toBe(false);
      expect((await create({}, [{ ticketType: 'vip', price: 1, quantity: 1 }])).success).toBe(false);
    });

    it('rejects the mock provider in production', async () => {
      const config = require('../../config').default;
      const prev = config.nodeEnv;
      config.nodeEnv = 'production';
      try {
        expect((await create({}, undefined, 'mock')).success).toBe(false);
      } finally {
        config.nodeEnv = prev;
      }
    });
  });

  describe('getOrderById', () => {
    it('should return order by ID', async () => {
      const mockOrder: TicketingOrder = {
        orderId: 'order1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        ticketIds: ['ticket1'],
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD' as Currency,
        status: 'paid' as OrderStatus,
        paymentProvider: 'razorpay',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById('order1');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findById).toHaveBeenCalledWith('order1');
    });
  });

  describe('getOrdersByUserId', () => {
    it('should return orders for a user', async () => {
      const mockOrders = [
        {
          orderId: 'order1',
          userId: 'user1',
          status: 'paid' as OrderStatus,
          total: 100,
        },
      ];

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findByUserId = jest.fn().mockResolvedValue(mockOrders);

      const result = await orderService.getOrdersByUserId('user1');

      expect(result).toEqual(mockOrders);
      expect(orderRepository.findByUserId).toHaveBeenCalledWith('user1', 50);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const mockOrder: TicketingOrder = {
        orderId: 'order1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        ticketIds: ['ticket1'],
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD' as Currency,
        status: 'pending' as OrderStatus,
        paymentProvider: 'razorpay',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue(mockOrder);
      orderRepository.updateStatus = jest.fn().mockResolvedValue(mockOrder);
      // The module is auto-mocked; use the REAL transition rules so this test exercises them.
      const realRepo = jest.requireActual('../../repositories/order.repository').orderRepository;
      orderRepository.isValidTransition = (from: OrderStatus, to: OrderStatus) => realRepo.isValidTransition(from, to);

      const result = await orderService.updateOrderStatus('order1', 'paid' as OrderStatus);

      expect(orderRepository.updateStatus).toHaveBeenCalledWith('order1', 'paid');
      expect(result).toEqual(mockOrder);
    });

    it('should reject an invalid status transition (paid -> pending)', async () => {
      const { orderRepository } = require('../../repositories/order.repository');
      const realRepo = jest.requireActual('../../repositories/order.repository').orderRepository;
      orderRepository.isValidTransition = (from: OrderStatus, to: OrderStatus) => realRepo.isValidTransition(from, to);
      orderRepository.findById = jest.fn().mockResolvedValue({ orderId: 'order1', status: 'paid' });
      orderRepository.updateStatus = jest.fn();

      await expect(orderService.updateOrderStatus('order1', 'pending' as OrderStatus)).rejects.toThrow('Invalid status transition');
      expect(orderRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const mockOrder: TicketingOrder = {
        orderId: 'order1',
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        ticketIds: ['ticket1'],
        subtotal: 100,
        discount: 0,
        tax: 10,
        platformFee: 5,
        total: 115,
        currency: 'USD' as Currency,
        status: 'pending' as OrderStatus,
        paymentProvider: 'razorpay',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { orderRepository } = require('../../repositories/order.repository');
      orderRepository.findById = jest.fn().mockResolvedValue(mockOrder);
      orderRepository.cancelOrder = jest.fn().mockResolvedValue(mockOrder);

      const result = await orderService.cancelOrder('order1');

      expect(orderRepository.cancelOrder).toHaveBeenCalledWith('order1');
      expect(result).toEqual({ success: true });
    });
  });
});
