import {
  IPaymentProvider,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
} from '../services/paymentProvider.interface';
import { PaymentProvider, OrderStatus } from '../types';

const delay = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export class MockPaymentProvider implements IPaymentProvider {
  readonly provider: PaymentProvider = 'mock';

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    await delay(500);

    const providerPaymentId = `mock_payment_${Date.now()}`;

    return {
      success: true,
      providerPaymentId,
      paymentUrl: `https://mock-payment.example.com/pay/${providerPaymentId}`,
      metadata: {
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
      },
    };
  }

  async verifyPayment(_providerPaymentId: string): Promise<{
    success: boolean;
    status: OrderStatus;
    amount: number;
  }> {
    await delay(300);

    return {
      success: true,
      status: 'paid',
      amount: 100,
    };
  }

  async processRefund(_request: RefundRequest): Promise<RefundResponse> {
    await delay(500);

    const refundId = `mock_refund_${Date.now()}`;

    return {
      success: true,
      refundId,
    };
  }

  async cancelPayment(_providerPaymentId: string): Promise<boolean> {
    await delay(300);
    return true;
  }
}
