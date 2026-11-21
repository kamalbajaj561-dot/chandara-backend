import { PaymentProvider, OrderStatus } from '../types';

export interface PaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  providerPaymentId?: string;
  paymentUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface IPaymentProvider {
  readonly provider: PaymentProvider;

  createPayment(request: PaymentRequest): Promise<PaymentResponse>;

  verifyPayment(providerPaymentId: string): Promise<{
    success: boolean;
    status: OrderStatus;
    amount: number;
  }>;

  processRefund(request: RefundRequest): Promise<RefundResponse>;

  cancelPayment(providerPaymentId: string): Promise<boolean>;
}
