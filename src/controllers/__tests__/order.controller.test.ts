import { Request, Response, NextFunction } from 'express';
import { OrderController } from '../order.controller';

jest.mock('../../services/order.service');

describe('OrderController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      user: { userId: 'user1', email: 'user1@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a new order', async () => {
      mockRequest.body = {
        eventId: 'event1',
        creatorId: 'creator1',
        items: [{ ticketType: 'general', price: 100, quantity: 2 }],
        currency: 'USD',
        paymentProvider: 'razorpay',
      };

      const { orderService } = require('../../services/order.service');
      orderService.createOrder = jest.fn().mockResolvedValue({
        success: true,
        order: { orderId: 'order1' },
      });

      await OrderController.createOrder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order by ID', async () => {
      mockRequest.params = { orderId: 'order1' };

      const { orderService } = require('../../services/order.service');
      orderService.getOrderById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
      });

      await OrderController.getOrderById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getOrdersByUserId', () => {
    it('should return orders for user', async () => {
      mockRequest.user = { userId: 'user1', email: 'user1@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockRequest.query = {};

      const { orderService } = require('../../services/order.service');
      orderService.getOrdersByUserId = jest.fn().mockResolvedValue([
        { orderId: 'order1', userId: 'user1' },
      ]);

      await OrderController.getOrdersByUserId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      mockRequest.params = { orderId: 'order1' };

      const { orderService } = require('../../services/order.service');
      orderService.getOrderById = jest.fn().mockResolvedValue({
        orderId: 'order1',
        userId: 'user1',
        status: 'pending',
      });
      orderService.cancelOrder = jest.fn().mockResolvedValue({
        success: true,
        orderId: 'order1',
        status: 'cancelled',
      });

      await OrderController.cancelOrder(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
