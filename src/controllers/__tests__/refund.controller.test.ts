import { Request, Response, NextFunction } from 'express';
import { RefundController } from '../refund.controller';

jest.mock('../../services/refund.service');

describe('RefundController', () => {
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

  describe('createRefund', () => {
    it('should create a new refund', async () => {
      mockRequest.body = {
        orderId: 'order1',
        amount: 100,
        currency: 'USD',
        reason: 'Not satisfied',
      };

      const { refundService } = require('../../services/refund.service');
      refundService.createRefund = jest.fn().mockResolvedValue({
        success: true,
        refund: {
          refundId: 'refund1',
          orderId: 'order1',
        },
      });

      await RefundController.createRefund(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getRefundById', () => {
    it('should return refund by ID', async () => {
      mockRequest.params = { refundId: 'refund1' };

      const { refundService } = require('../../services/refund.service');
      refundService.getRefundById = jest.fn().mockResolvedValue({
        refundId: 'refund1',
        orderId: 'order1',
      });

      await RefundController.getRefundById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getRefundsByOrderId', () => {
    it('should return refunds for an order', async () => {
      mockRequest.params = { orderId: 'order1' };

      const { refundService } = require('../../services/refund.service');
      refundService.getRefundsByOrderId = jest.fn().mockResolvedValue([
        { refundId: 'refund1', orderId: 'order1' },
      ]);

      await RefundController.getRefundsByOrderId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('approveRefund', () => {
    it('should approve a refund', async () => {
      mockRequest.params = { refundId: 'refund1' };
      mockRequest.body = { approvedBy: 'admin1' };

      const { refundService } = require('../../services/refund.service');
      refundService.approveRefund = jest.fn().mockResolvedValue({
        success: true,
        refund: {
          refundId: 'refund1',
          status: 'approved',
        },
      });

      await RefundController.approveRefund(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('rejectRefund', () => {
    it('should reject a refund', async () => {
      mockRequest.params = { refundId: 'refund1' };

      const { refundService } = require('../../services/refund.service');
      refundService.rejectRefund = jest.fn().mockResolvedValue({
        success: true,
        refund: {
          refundId: 'refund1',
          status: 'rejected',
        },
      });

      await RefundController.rejectRefund(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getRefundStatistics', () => {
    it('should return refund statistics', async () => {
      const { refundService } = require('../../services/refund.service');
      refundService.getRefundStatistics = jest.fn().mockResolvedValue({
        total: 10,
        totalRefunded: 1000,
        pending: 2,
        approved: 7,
        rejected: 1,
      });

      await RefundController.getRefundStatistics(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
