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

      const items = [
        { ticketType: 'general', price: 100, quantity: 2 },
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
      expect(result).toEqual({ success: true, order: mockOrder });
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

      const result = await orderService.updateOrderStatus('order1', 'paid' as OrderStatus);

      expect(orderRepository.updateStatus).toHaveBeenCalledWith('order1', 'paid');
      expect(result).toEqual(mockOrder);
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
