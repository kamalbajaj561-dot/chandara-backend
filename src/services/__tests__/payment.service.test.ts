import { PaymentService } from '../payment.service';
import { Payment, PaymentProvider, OrderStatus, Currency } from '../../types';

jest.mock('../../repositories/payment.repository');
jest.mock('../../repositories/order.repository');
jest.mock('../../providers/mockPayment.provider');
jest.mock('../../providers/razorpayPayment.provider');

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a new payment', async () => {
      const mockPayment: Payment = {
        paymentId: 'payment1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        provider: 'razorpay' as PaymentProvider,
        providerPaymentId: 'razorpay123',
        status: 'pending' as OrderStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { paymentRepository } = require('../../repositories/payment.repository');
      
      paymentRepository.create = jest.fn().mockResolvedValue(mockPayment);
      
      // Mock the provider method through the service instance
      const razorpayProvider = paymentService.getProvider('razorpay' as PaymentProvider);
      jest.spyOn(razorpayProvider, 'createPayment').mockResolvedValue({
        success: true,
        providerPaymentId: 'razorpay123',
        paymentUrl: 'https://razorpay.com/pay'
      });

      const result = await paymentService.createPayment(
        'order1',
        'user1',
        100,
        'USD' as Currency,
        'razorpay' as PaymentProvider
      );

      expect(paymentRepository.create).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        providerPaymentId: 'razorpay123',
        paymentUrl: 'https://razorpay.com/pay'
      });
    });
  });

  describe('getPaymentById', () => {
    it('should return payment by ID', async () => {
      const mockPayment: Payment = {
        paymentId: 'payment1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        provider: 'razorpay' as PaymentProvider,
        providerPaymentId: 'razorpay123',
        status: 'paid' as OrderStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { paymentRepository } = require('../../repositories/payment.repository');
      paymentRepository.findById = jest.fn().mockResolvedValue(mockPayment);

      const result = await paymentService.getPaymentById('payment1');

      expect(result).toEqual(mockPayment);
      expect(paymentRepository.findById).toHaveBeenCalledWith('payment1');
    });
  });

  describe('getPaymentsByOrderId', () => {
    it('should return payments for an order', async () => {
      const mockPayments = [
        {
          paymentId: 'payment1',
          orderId: 'order1',
          status: 'paid' as OrderStatus,
          amount: 100,
        },
      ];

      const { paymentRepository } = require('../../repositories/payment.repository');
      paymentRepository.findByOrderId = jest.fn().mockResolvedValue(mockPayments);

      const result = await paymentService.getPaymentsByOrderId('order1');

      expect(result).toEqual(mockPayments);
      expect(paymentRepository.findByOrderId).toHaveBeenCalledWith('order1');
    });
  });

  describe('verifyPayment', () => {
    it('should verify a payment', async () => {
      const mockPayment = {
        paymentId: 'payment1',
        orderId: 'order1',
        userId: 'user1',
        amount: 100,
        currency: 'USD' as Currency,
        provider: 'razorpay' as PaymentProvider,
        providerPaymentId: 'razorpay123',
        status: 'paid' as OrderStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { paymentRepository } = require('../../repositories/payment.repository');
      
      paymentRepository.findByProviderPaymentId = jest.fn().mockResolvedValue(mockPayment);
      paymentRepository.updateStatus = jest.fn().mockResolvedValue(mockPayment);
      
      // Mock the provider method through the service instance
      const razorpayProvider = paymentService.getProvider('razorpay' as PaymentProvider);
      jest.spyOn(razorpayProvider, 'verifyPayment').mockResolvedValue({
        success: true,
        status: 'paid',
        amount: 100
      });

      const result = await paymentService.verifyPayment('razorpay123', 'razorpay' as PaymentProvider);

      expect(result.success).toBe(true);
      expect(result.status).toBe('paid');
    });
  });
});
