import { TicketingTicket, TicketType, Currency } from '../types';
import { ticketRepository } from '../repositories/ticket.repository';
import { orderRepository } from '../repositories/order.repository';

export class TicketService {
  async createTicket(
    eventId: string,
    userId: string,
    creatorId: string,
    orderId: string,
    ticketType: TicketType,
    price: number,
    currency: Currency
  ): Promise<TicketingTicket> {
    const qrCode = this.generateQRCode(userId, eventId);
    const qrSignature = this.generateQRSignature(qrCode);

    return await ticketRepository.create({
      eventId,
      userId,
      creatorId,
      orderId,
      ticketType,
      price,
      currency,
      status: 'active',
      qrCode,
      qrSignature,
      purchaseDate: new Date(),
    });
  }

  async createTicketsForOrder(
    eventId: string,
    userId: string,
    creatorId: string,
    orderId: string,
    items: Array<{ ticketType: TicketType; price: number; quantity: number }>,
    currency: Currency
  ): Promise<{ tickets: TicketingTicket[]; success: boolean; error?: string }> {
    const tickets: TicketingTicket[] = [];

    for (const item of items) {
      // Use transaction-based creation with concurrency protection
      const result = await ticketRepository.createWithConcurrencyCheck(
        eventId,
        userId,
        creatorId,
        orderId,
        item.ticketType,
        item.price,
        currency,
        item.quantity
      );

      if (!result.success) {
        return {
          tickets,
          success: false,
          error: result.error || 'Failed to create tickets',
        };
      }

      tickets.push(...result.tickets);
    }

    const ticketIds = tickets.map((t) => t.ticketId);
    await orderRepository.update(orderId, { ticketIds });

    return { tickets, success: true };
  }

  async getTicketById(ticketId: string) {
    return await ticketRepository.findById(ticketId);
  }

  async getTicketsByUserId(userId: string, limit = 50) {
    return await ticketRepository.findByUserId(userId, limit);
  }

  async getTicketsByOrderId(orderId: string) {
    return await ticketRepository.findByOrderId(orderId);
  }

  async getTicketsByEventId(eventId: string, limit = 100) {
    return await ticketRepository.findByEventId(eventId, limit);
  }

  async validateTicket(qrCode: string): Promise<{
    valid: boolean;
    ticket?: TicketingTicket;
    error?: string;
  }> {
    const ticket = await ticketRepository.findByQRCode(qrCode);

    if (!ticket) {
      return { valid: false, error: 'Ticket not found' };
    }

    if (ticket.status === 'used') {
      return { valid: false, error: 'Ticket already used' };
    }

    if (ticket.status === 'cancelled') {
      return { valid: false, error: 'Ticket cancelled' };
    }

    if (ticket.status === 'expired') {
      return { valid: false, error: 'Ticket expired' };
    }

    return { valid: true, ticket };
  }

  async markTicketAsUsed(ticketId: string): Promise<TicketingTicket | null> {
    return await ticketRepository.markAsUsed(ticketId);
  }

  async cancelTicket(ticketId: string): Promise<TicketingTicket | null> {
    return await ticketRepository.cancelTicket(ticketId);
  }

  async getTicketStatistics(eventId: string) {
    return await ticketRepository.getStatistics(eventId);
  }

  private generateQRCode(userId: string, eventId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `QR_${userId}_${eventId}_${timestamp}_${random}`;
  }

  private generateQRSignature(qrCode: string): string {
    const hash = this.simpleHash(qrCode);
    return `SIG_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export const ticketService = new TicketService();
