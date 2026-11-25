import { TicketingOrder, TicketType, Currency } from '../types';
import { orderRepository } from '../repositories/order.repository';
import { ticketService } from './ticket.service';
import logger from '../utils/logger';

export interface FulfillmentDeps {
  claim: (orderId: string) => Promise<TicketingOrder | null>;
  release: (orderId: string) => Promise<void>;
  createTickets: (
    eventId: string,
    userId: string,
    creatorId: string,
    orderId: string,
    items: Array<{ ticketType: TicketType; price: number; quantity: number }>,
    currency: Currency
  ) => Promise<{ success: boolean; error?: string; tickets: Array<{ ticketId: string }> }>;
}

const defaultDeps: FulfillmentDeps = {
  claim: (id) => orderRepository.claimFulfillment(id),
  release: (id) => orderRepository.releaseFulfillmentClaim(id),
  createTickets: (...args) => ticketService.createTicketsForOrder(...args),
};

/**
 * Issues tickets for an order whose payment has been verified. Safe to call repeatedly and concurrently:
 * only the caller that wins the atomic claim issues tickets; everyone else gets `fulfilled: false`.
 */
export async function fulfillPaidOrder(
  orderId: string,
  deps: FulfillmentDeps = defaultDeps
): Promise<{ fulfilled: boolean; error?: string }> {
  const order = await deps.claim(orderId);
  if (!order) return { fulfilled: false };

  const items =
    order.items && order.items.length > 0
      ? order.items
      : [{ ticketType: 'regular' as TicketType, price: order.subtotal, quantity: 1 }];

  try {
    const result = await deps.createTickets(order.eventId, order.userId, order.creatorId, order.orderId, items, order.currency);
    if (!result.success) {
      await deps.release(orderId);
      logger.error(`Ticket issuance failed for paid order ${orderId}: ${result.error}`);
      return { fulfilled: false, error: result.error || 'Ticket issuance failed' };
    }
    return { fulfilled: true };
  } catch (error) {
    await deps.release(orderId);
    logger.error(`Ticket issuance threw for paid order ${orderId}:`, error);
    return { fulfilled: false, error: 'Ticket issuance failed' };
  }
}
