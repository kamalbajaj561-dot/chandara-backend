import { RefundService } from '../refund.service';
import { Refund, RefundStatus, Currency } from '../../types';

jest.mock('../../repositories/refund.repository');
jest.mock('../../repositories/payment.repository');
jest.mock('../../repositories/order.repository');

describe('RefundService', () => {
  let refundService: RefundService;
  let refundRepository: any;
  let orderRepository: any;
  let paymentService: any;

  beforeEach(() => {
    refundService = new RefundService();
    refundRepository = require('../../repositories/refund.repository').refundRepository;
    orderRepository = require('../../repositories/order.repository').orderRepository;
    paymentService = require('../payment.service').paymentService;
    jest.clearAllMocks();
  });

  describe('createRefund', () => {
    it('should create a new refund', async () => {
      const mockRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'pending' as RefundStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrder = {
        orderId: 'order1',
        userId: 'user1',
        total: 100,
        status: 'paid',
      };

      orderRepository.findById = jest.fn().mockResolvedValue(mockOrder);
      refundRepository.findByOrderId = jest.fn().mockResolvedValue([]);
      refundRepository.create = jest.fn().mockResolvedValue(mockRefund);

      const result = await refundService.createRefund(
        'order1',
        'user1',
        100,
        'USD' as Currency,
        'Not satisfied'
      );

      expect(result.success).toBe(true);
      expect(result.refund).toEqual(mockRefund);
      expect(refundRepository.create).toHaveBeenCalled();
    });
  });

  describe('getRefundById', () => {
    it('should return refund by ID', async () => {
      const mockRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'approved' as RefundStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      refundRepository.findById = jest.fn().mockResolvedValue(mockRefund);

      const result = await refundService.getRefundById('refund1');

      expect(result).toEqual(mockRefund);
      expect(refundRepository.findById).toHaveBeenCalledWith('refund1');
    });
  });

  describe('getRefundsByOrderId', () => {
    it('should return refunds for an order', async () => {
      const mockRefunds = [
        {
          refundId: 'refund1',
          orderId: 'order1',
          status: 'approved' as RefundStatus,
          amount: 100,
        },
      ];

      refundRepository.findByOrderId = jest.fn().mockResolvedValue(mockRefunds);

      const result = await refundService.getRefundsByOrderId('order1');

      expect(result).toEqual(mockRefunds);
      expect(refundRepository.findByOrderId).toHaveBeenCalledWith('order1');
    });
  });

  describe('approveRefund', () => {
    it('should approve a refund', async () => {
      const mockPendingRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'pending' as RefundStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockApprovedRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'approved' as RefundStatus,
        approvedBy: 'admin1',
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOrder = {
        orderId: 'order1',
        total: 100,
      };

      const mockPayment = [
        {
          paymentId: 'pay1',
          amount: 100,
        },
      ];

      refundRepository.findById = jest.fn().mockResolvedValue(mockPendingRefund);
      orderRepository.findById = jest.fn().mockResolvedValue(mockOrder);
      paymentService.getPaymentsByOrderId = jest.fn().mockResolvedValue(mockPayment);
      paymentService.processRefund = jest.fn().mockResolvedValue({ success: true });
      refundRepository.findByOrderId = jest.fn().mockResolvedValue([mockApprovedRefund]);
      refundRepository.updateStatus = jest.fn().mockResolvedValue(mockApprovedRefund);

      const result = await refundService.approveRefund('refund1', 'admin1');

      expect(result.success).toBe(true);
      expect(result.refund).toEqual(mockApprovedRefund);
      expect(refundRepository.updateStatus).toHaveBeenCalledWith('refund1', 'approved', 'admin1');
    });
  });

  describe('rejectRefund', () => {
    it('should reject a refund', async () => {
      const mockPendingRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'pending' as RefundStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRejectedRefund: Refund = {
        refundId: 'refund1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        reason: 'Not satisfied',
        status: 'rejected' as RefundStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      refundRepository.findById = jest.fn().mockResolvedValue(mockPendingRefund);
      refundRepository.updateStatus = jest.fn().mockResolvedValue(mockRejectedRefund);

      const result = await refundService.rejectRefund('refund1');

      expect(result.success).toBe(true);
      expect(result.refund).toEqual(mockRejectedRefund);
      expect(refundRepository.updateStatus).toHaveBeenCalledWith('refund1', 'rejected');
    });
  });
});
