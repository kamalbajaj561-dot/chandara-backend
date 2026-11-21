import {
  IPaymentProvider,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
} from '../services/paymentProvider.interface';
import { PaymentProvider, OrderStatus } from '../types';

export class RazorpayPaymentProvider implements IPaymentProvider {
  readonly provider: PaymentProvider = 'razorpay';
  private apiKey: string;
  private apiSecret: string;
  private maxRetries = 3;
  private baseDelayMs = 1000;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
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
          return await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
            },
            body: JSON.stringify({
              amount: request.amount * 100,
              currency: request.currency,
              receipt: request.orderId,
              notes: request.metadata,
            }),
          });
        },
        'createPayment'
      );

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.description || 'Failed to create Razorpay order',
        };
      }

      return {
        success: true,
        providerPaymentId: data.id,
        paymentUrl: `https://api.razorpay.com/v1/payments/${data.id}`,
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
          return await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
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
        captured: 'paid',
        authorized: 'paid',
        failed: 'failed',
        refunded: 'refunded',
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
          return await fetch(`https://api.razorpay.com/v1/payments/${request.paymentId}/refund`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
            },
            body: JSON.stringify({
              amount: request.amount * 100,
              notes: {
                reason: request.reason,
              },
            }),
          });
        },
        'processRefund'
      );

      const data = await response.json() as any;

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.description || 'Failed to process refund',
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
          return await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
            },
            body: JSON.stringify({
              status: 'cancelled',
            }),
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
