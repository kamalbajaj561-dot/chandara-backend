import { Request, Response, NextFunction } from 'express';
import { PaymentController } from '../payment.controller';

jest.mock('../../services/payment.service');
jest.mock('../../services/paymentFlow.service', () => ({
  createPaymentForOrder: jest.fn(),
  verifyAndFulfill: jest.fn(),
}));
import { createPaymentForOrder, verifyAndFulfill } from '../../services/paymentFlow.service';

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
    it('creates a payment for the order using only the order id from the request', async () => {
      mockRequest.body = { orderId: 'order1', amount: 0.01, currency: 'USD', provider: 'mock' }; // money fields ignored
      (createPaymentForOrder as jest.Mock).mockResolvedValue({ orderId: 'order1', providerPaymentId: 'pp1' });

      await PaymentController.createPayment(mockRequest as Request, mockResponse as Response, mockNext);

      expect(createPaymentForOrder).toHaveBeenCalledWith({ userId: 'user1', role: 'viewer' }, 'order1');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('forwards flow errors (e.g. not your order) to the error handler', async () => {
      mockRequest.body = { orderId: 'order1' };
      const err = new Error('Order not found');
      (createPaymentForOrder as jest.Mock).mockRejectedValue(err);
      await PaymentController.createPayment(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(err);
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
    it('verifies on behalf of the authenticated user and reports ticket issuance', async () => {
      mockRequest.body = { providerPaymentId: 'pp1', provider: 'razorpay' };
      (verifyAndFulfill as jest.Mock).mockResolvedValue({ success: true, status: 'paid', amount: 100, orderId: 'o1', ticketsIssued: true });

      await PaymentController.verifyPayment(mockRequest as Request, mockResponse as Response, mockNext);

      expect(verifyAndFulfill).toHaveBeenCalledWith({ userId: 'user1', role: 'viewer' }, 'pp1', 'razorpay');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
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
