import { IPaymentProvider, PaymentRequest, PaymentResponse, RefundRequest } from './paymentProvider.interface';
import { MockPaymentProvider } from '../providers/mockPayment.provider';
import { RazorpayPaymentProvider } from '../providers/razorpayPayment.provider';
import { StripePaymentProvider } from '../providers/stripePayment.provider';
import { PaymentProvider as PaymentProviderType, OrderStatus, Currency } from '../types';
import { paymentRepository } from '../repositories/payment.repository';
import { orderRepository } from '../repositories/order.repository';
import { getFirestore } from './firebase';
import admin from 'firebase-admin';
import logger from '../utils/logger';

export class PaymentService {
  private providers: Map<PaymentProviderType, IPaymentProvider>;

  constructor() {
    this.providers = new Map([
      ['mock', new MockPaymentProvider()],
      ['razorpay', new RazorpayPaymentProvider('', '')],
      ['stripe', new StripePaymentProvider('')],
    ]);
  }

  getProvider(provider: PaymentProviderType): IPaymentProvider {
    const paymentProvider = this.providers.get(provider);
    if (!paymentProvider) {
      throw new Error(`Payment provider ${provider} not found`);
    }
    return paymentProvider;
  }

  async createPayment(
    orderId: string,
    userId: string,
    amount: number,
    currency: Currency,
    provider: PaymentProviderType,
    description?: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ): Promise<PaymentResponse> {
    const paymentProvider = this.getProvider(provider);

    const request: PaymentRequest = {
      orderId,
      userId,
      amount,
      currency: currency as any,
      description,
      metadata,
    };

    // Use idempotency if key is provided
    if (idempotencyKey) {
      const existingPayment = await paymentRepository.findByIdempotencyKey(idempotencyKey);
      if (existingPayment) {
        logger.info(`Returning existing payment for idempotency key: ${idempotencyKey}`);
        return {
          success: true,
          providerPaymentId: existingPayment.providerPaymentId,
          metadata: existingPayment.metadata,
        };
      }

      const response = await paymentProvider.createPayment(request);

      if (response.success && response.providerPaymentId) {
        const result = await paymentRepository.createWithIdempotency({
          orderId,
          userId,
          amount,
          currency,
          provider,
          providerPaymentId: response.providerPaymentId,
          status: 'pending',
          metadata: response.metadata,
          idempotencyKey,
        });

        if (!result.created) {
          logger.info(`Payment already existed for idempotency key: ${idempotencyKey}`);
        }
      }

      return response;
    }

    // Non-idempotent path (legacy)
    const response = await paymentProvider.createPayment(request);

    if (response.success && response.providerPaymentId) {
      await paymentRepository.create({
        orderId,
        userId,
        amount,
        currency,
        provider,
        providerPaymentId: response.providerPaymentId,
        status: 'pending',
        metadata: response.metadata,
      });
    }

    return response;
  }

  async verifyPayment(providerPaymentId: string, provider: PaymentProviderType): Promise<{
    success: boolean;
    status: OrderStatus;
    amount: number;
  }> {
    const paymentProvider = this.getProvider(provider);
    const verification = await paymentProvider.verifyPayment(providerPaymentId);

    if (verification.success) {
      const db = getFirestore();
      if (!db) {
        throw new Error('Firestore not initialized');
      }
      
      // Use transaction to ensure atomic payment and order status updates
      await db!.runTransaction(async (transaction: admin.firestore.Transaction) => {
        const payment = await paymentRepository.findByProviderPaymentId(providerPaymentId);
        if (payment && payment.status !== verification.status) {
          // Update payment status
          const paymentRef = db!.collection('payments').doc(payment.paymentId);
          transaction.update(paymentRef, {
            status: verification.status,
            updatedAt: new Date(),
          });

          // Update order status atomically
          const order = await orderRepository.findByPaymentId(payment.paymentId);
          if (order) {
            const orderRef = db!.collection('orders').doc(order.orderId);
            transaction.update(orderRef, {
              status: verification.status,
              updatedAt: new Date(),
            });
          }
        }
      });
    }

    return verification;
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    const paymentProvider = this.getProvider(payment.provider);

    const request: RefundRequest = {
      paymentId: payment.providerPaymentId,
      amount,
      reason,
    };

    const response = await paymentProvider.processRefund(request);

    if (response.success) {
      await paymentRepository.updateStatus(payment.paymentId, 'refunded');
    }

    return response;
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      return false;
    }

    const paymentProvider = this.getProvider(payment.provider);
    const cancelled = await paymentProvider.cancelPayment(payment.providerPaymentId);

    if (cancelled) {
      await paymentRepository.updateStatus(payment.paymentId, 'cancelled');

      const order = await orderRepository.findByPaymentId(payment.paymentId);
      if (order) {
        await orderRepository.updateStatus(order.orderId, 'cancelled');
      }
    }

    return cancelled;
  }

  async getPaymentById(paymentId: string) {
    return await paymentRepository.findById(paymentId);
  }

  async getPaymentsByOrderId(orderId: string) {
    return await paymentRepository.findByOrderId(orderId);
  }

  async getPaymentsByUserId(userId: string, limit = 50) {
    return await paymentRepository.findByUserId(userId, limit);
  }
}

export const paymentService = new PaymentService();
