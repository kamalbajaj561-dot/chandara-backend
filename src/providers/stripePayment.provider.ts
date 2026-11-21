import {
  IPaymentProvider,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
} from '../services/paymentProvider.interface';
import { PaymentProvider, OrderStatus } from '../types';

export class StripePaymentProvider implements IPaymentProvider {
  readonly provider: PaymentProvider = 'stripe';
  private apiKey: string;
  private maxRetries = 3;
  private baseDelayMs = 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Helper method for retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await this.retryWithBackoff(
        async () => {
          return await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: new URLSearchParams({
              amount: (request.amount * 100).toString(),
              currency: request.currency.toLowerCase(),
              metadata: JSON.stringify(request.metadata || {}),
              description: request.description || '',
            }),
          });
        },
        'createPayment'
      );

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to create Stripe payment intent',
        };
      }

      return {
        success: true,
        providerPaymentId: data.id,
        paymentUrl: data.next_action?.redirect_to_url?.url,
        metadata: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyPayment(providerPaymentId: string): Promise<{
    success: boolean;
    status: OrderStatus;
    amount: number;
  }> {
    try {
      const response = await this.retryWithBackoff(
        async () => {
          return await fetch(`https://api.stripe.com/v1/payment_intents/${providerPaymentId}`, {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          });
        },
        'verifyPayment'
      );

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          status: 'failed',
          amount: 0,
        };
      }

      const statusMap: Record<string, OrderStatus> = {
        succeeded: 'paid',
        processing: 'pending',
        requires_payment_method: 'failed',
        canceled: 'cancelled',
      };

      return {
        success: true,
        status: statusMap[data.status] || 'pending',
        amount: data.amount / 100,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        amount: 0,
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const response = await this.retryWithBackoff(
        async () => {
          return await fetch('https://api.stripe.com/v1/refunds', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: new URLSearchParams({
              payment_intent: request.paymentId,
              amount: (request.amount * 100).toString(),
              reason: request.reason || 'requested_by_customer',
            }),
          });
        },
        'processRefund'
      );

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to process refund',
        };
      }

      return {
        success: true,
        refundId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cancelPayment(providerPaymentId: string): Promise<boolean> {
    try {
      const response = await this.retryWithBackoff(
        async () => {
          return await fetch(`https://api.stripe.com/v1/payment_intents/${providerPaymentId}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          });
        },
        'cancelPayment'
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
