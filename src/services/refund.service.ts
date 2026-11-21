import { Refund, RefundStatus, Currency } from '../types';
import { refundRepository } from '../repositories/refund.repository';
import { paymentService } from './payment.service';
import { orderRepository } from '../repositories/order.repository';

export class RefundService {
  async createRefund(
    orderId: string,
    userId: string,
    amount: number,
    currency: Currency,
    reason: string
  ): Promise<{ success: boolean; refund?: Refund; error?: string }> {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.userId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      if (order.status !== 'paid') {
        return { success: false, error: 'Order must be paid to request refund' };
      }

      if (amount > order.total) {
        return { success: false, error: 'Refund amount exceeds order total' };
      }

      const existingRefunds = await refundRepository.findByOrderId(orderId);
      const totalRefunded = existingRefunds
        .filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + r.amount, 0);

      if (totalRefunded + amount > order.total) {
        return { success: false, error: 'Total refund amount would exceed order total' };
      }

      const refund = await refundRepository.create({
        orderId,
        userId,
        amount,
        currency,
        reason,
        status: 'pending',
      });

      return { success: true, refund };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create refund',
      };
    }
  }

  async getRefundById(refundId: string) {
    return await refundRepository.findById(refundId);
  }

  async getRefundsByOrderId(orderId: string) {
    return await refundRepository.findByOrderId(orderId);
  }

  async getRefundsByUserId(userId: string, limit = 50) {
    return await refundRepository.findByUserId(userId, limit);
  }

  async getRefundsByStatus(status: RefundStatus, limit = 50) {
    return await refundRepository.findByStatus(status, limit);
  }

  async approveRefund(refundId: string, approvedBy: string): Promise<{
    success: boolean;
    refund?: Refund;
    error?: string;
  }> {
    try {
      const refund = await refundRepository.findById(refundId);
      if (!refund) {
        return { success: false, error: 'Refund not found' };
      }

      if (refund.status !== 'pending') {
        return { success: false, error: 'Refund is not pending' };
      }

      const order = await orderRepository.findById(refund.orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const payment = await paymentService.getPaymentsByOrderId(order.orderId);
      if (!payment || payment.length === 0) {
        return { success: false, error: 'Payment not found' };
      }

      const processResult = await paymentService.processRefund(
        payment[0].paymentId,
        refund.amount,
        refund.reason
      );

      if (!processResult.success) {
        return { success: false, error: processResult.error || 'Failed to process refund' };
      }

      const updatedRefund = await refundRepository.updateStatus(refundId, 'approved', approvedBy);

      if (updatedRefund) {
        const totalRefunded = (await refundRepository.findByOrderId(order.orderId))
          .filter((r) => r.status === 'approved')
          .reduce((sum, r) => sum + r.amount, 0);

        if (totalRefunded >= order.total) {
          await orderRepository.updateStatus(order.orderId, 'refunded');
        }
      }

      return { success: true, refund: updatedRefund || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve refund',
      };
    }
  }

  async rejectRefund(refundId: string): Promise<{
    success: boolean;
    refund?: Refund;
    error?: string;
  }> {
    try {
      const refund = await refundRepository.findById(refundId);
      if (!refund) {
        return { success: false, error: 'Refund not found' };
      }

      if (refund.status !== 'pending') {
        return { success: false, error: 'Refund is not pending' };
      }

      const updatedRefund = await refundRepository.updateStatus(refundId, 'rejected');

      return { success: true, refund: updatedRefund || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject refund',
      };
    }
  }

  async getRefundStatistics(eventId: string) {
    return await refundRepository.getStatistics(eventId);
  }
}

export const refundService = new RefundService();
