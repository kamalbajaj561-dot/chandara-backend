import { TicketingOrder, OrderStatus, PaymentProvider, Currency } from '../types';
import { orderRepository } from '../repositories/order.repository';
import { couponRepository } from '../repositories/coupon.repository';
import { paymentService } from './payment.service';
import { eventService } from './event.service';
import { getEventOwnerId, NON_BOOKABLE_EVENT_STATUSES } from '../utils/eventOwner';
import config from '../config';

const MAX_TICKETS_PER_ORDER = 10;

interface OrderItem {
  ticketType: string;
  price: number;
  quantity: number;
}

export class OrderService {
  /** Overridable for tests. */
  eventLookup: (id: string) => Promise<any> = (id) => eventService.getEvent(id);

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
      // Never trust client pricing: the unit price always comes from the event record.
      if (config.nodeEnv === 'production' && paymentProvider === 'mock') {
        return { success: false, error: 'Mock payments are disabled in production' };
      }

      let event: any;
      try {
        event = await this.eventLookup(eventId);
      } catch {
        return { success: false, error: 'Event not found' };
      }
      if (NON_BOOKABLE_EVENT_STATUSES.includes(event.status)) {
        return { success: false, error: 'Tickets are not available for this event' };
      }
      const unitPrice = Number(event.ticketPrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { success: false, error: 'This event does not require a ticket purchase' };
      }

      const requested = Array.isArray(items) ? items : [];
      let quantity = 0;
      for (const item of requested) {
        if (item.ticketType !== 'general' && item.ticketType !== 'regular') {
          return { success: false, error: 'Only general admission tickets are available for this event' };
        }
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          return { success: false, error: 'Invalid ticket quantity' };
        }
        quantity += item.quantity;
      }
      if (quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) {
        return { success: false, error: `You can buy between 1 and ${MAX_TICKETS_PER_ORDER} tickets per order` };
      }

      const trustedItems = [{ ticketType: 'regular' as const, price: unitPrice, quantity }];
      creatorId = getEventOwnerId(event) || creatorId;
      currency = (event.currency as Currency) || currency;
      const subtotal = unitPrice * quantity;

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
        items: trustedItems,
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
