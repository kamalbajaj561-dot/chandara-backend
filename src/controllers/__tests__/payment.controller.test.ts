import { Request, Response, NextFunction } from 'express';
import { PaymentController } from '../payment.controller';

jest.mock('../../services/payment.service');

describe('PaymentController', () => {
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

  describe('createPayment', () => {
    it('should create a new payment', async () => {
      mockRequest.body = {
        orderId: 'order1',
        amount: 100,
        currency: 'USD',
        provider: 'razorpay',
      };

      const { paymentService } = require('../../services/payment.service');
      paymentService.createPayment = jest.fn().mockResolvedValue({
        success: true,
        providerPaymentId: 'razorpay123',
      });

      await PaymentController.createPayment(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getPaymentById', () => {
    it('should return payment by ID', async () => {
      mockRequest.params = { paymentId: 'payment1' };

      const { paymentService } = require('../../services/payment.service');
      paymentService.getPaymentById = jest.fn().mockResolvedValue({
        paymentId: 'payment1',
        orderId: 'order1',
        userId: 'user1',
      });

      await PaymentController.getPaymentById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment', async () => {
      mockRequest.params = { paymentId: 'payment1' };
      mockRequest.body = { provider: 'razorpay' };

      const { paymentService } = require('../../services/payment.service');
      paymentService.verifyPayment = jest.fn().mockResolvedValue({
        success: true,
        status: 'paid',
        amount: 100,
      });

      await PaymentController.verifyPayment(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a payment', async () => {
      mockRequest.params = { paymentId: 'payment1' };

      const { paymentService } = require('../../services/payment.service');
      paymentService.getPaymentById = jest.fn().mockResolvedValue({
        paymentId: 'payment1',
        userId: 'user1',
        status: 'pending',
      });
      paymentService.cancelPayment = jest.fn().mockResolvedValue({
        paymentId: 'payment1',
        status: 'cancelled',
      });

      await PaymentController.cancelPayment(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
