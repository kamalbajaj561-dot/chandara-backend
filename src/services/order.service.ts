import { TicketingOrder, OrderStatus, PaymentProvider, Currency } from '../types';
import { orderRepository } from '../repositories/order.repository';
import { couponRepository } from '../repositories/coupon.repository';
import { paymentService } from './payment.service';

interface OrderItem {
  ticketType: string;
  price: number;
  quantity: number;
}

export class OrderService {
  async createOrder(
    userId: string,
    creatorId: string,
    eventId: string,
    items: OrderItem[],
    currency: Currency,
    paymentProvider: PaymentProvider,
    couponCode?: string
  ): Promise<{ success: boolean; order?: TicketingOrder; error?: string }> {
    try {
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.price * item.quantity;
      }

      let discount = 0;
      let couponId: string | undefined;

      if (couponCode) {
        const coupon = await couponRepository.findByCode(couponCode);
        if (coupon && coupon.usedCount < coupon.maxUses && new Date() < coupon.expiryDate && subtotal >= coupon.minPurchase) {
          if (coupon.type === 'percentage') {
            discount = (subtotal * coupon.value) / 100;
          } else {
            discount = coupon.value;
          }
          discount = Math.min(discount, subtotal);
          couponId = coupon.couponId;
          await couponRepository.incrementUsedCount(coupon.couponId);
        }
      }

      const tax = subtotal * 0.1;
      const platformFee = subtotal * 0.05;
      const total = subtotal - discount + tax + platformFee;

      const order = await orderRepository.create({
        userId,
        creatorId,
        eventId,
        ticketIds: [],
        subtotal,
        discount,
        tax,
        platformFee,
        total,
        currency,
        status: 'pending',
        paymentProvider,
        couponId,
      });

      return { success: true, order };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      };
    }
  }

  async getOrderById(orderId: string) {
    return await orderRepository.findById(orderId);
  }

  async getOrdersByUserId(userId: string, limit = 50) {
    return await orderRepository.findByUserId(userId, limit);
  }

  async getOrdersByCreatorId(creatorId: string, limit = 100) {
    return await orderRepository.findByCreatorId(creatorId, limit);
  }

  async getOrdersByEventId(eventId: string, limit = 100) {
    return await orderRepository.findByEventId(eventId, limit);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate state transition
    if (!orderRepository.isValidTransition(order.status, status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    }

    return await orderRepository.updateStatus(orderId, status);
  }

  async cancelOrder(orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status !== 'pending') {
      return { success: false, error: 'Cannot cancel non-pending order' };
    }

    const cancelled = await orderRepository.cancelOrder(orderId);

    if (cancelled && order.paymentId) {
      await paymentService.cancelPayment(order.paymentId);
    }

    return { success: !!cancelled };
  }

  async getOrderStatistics(eventId: string) {
    return await orderRepository.getStatistics(eventId);
  }
}

export const orderService = new OrderService();
