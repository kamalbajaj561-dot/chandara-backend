import { Receipt, ReceiptItem } from '../types';
import { receiptRepository } from '../repositories/receipt.repository';
import { orderRepository } from '../repositories/order.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { pdfService, ReceiptPDFData } from './pdf.service';
import { eventRepository } from '../repositories/event.repository';
import { UserRepository } from '../repositories/user.repository';
import logger from '../utils/logger';

export class ReceiptService {
  /**
   * Generate receipt data for PDF
   */
  private async generateReceiptPDFData(orderId: string): Promise<ReceiptPDFData | null> {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return null;
      }

      const event = await eventRepository.findById(order.eventId);
      if (!event) {
        return null;
      }

      const buyer = await UserRepository.findById(order.userId);
      const creator = await UserRepository.findById(event.creatorUid);

      const tickets = await ticketRepository.findByOrderId(orderId);
      const items = tickets.map((ticket) => ({
        ticketType: ticket.ticketType,
        quantity: 1,
        price: ticket.price,
        subtotal: ticket.price,
      }));

      // Generate invoice number from order ID
      const invoiceNumber = `INV-${order.orderId.substring(0, 8).toUpperCase()}`;

      return {
        orderId: order.orderId,
        invoiceNumber,
        orderDate: order.createdAt,
        buyerName: buyer?.displayName || buyer?.username || 'Unknown',
        buyerEmail: buyer?.email || 'Unknown',
        creatorName: creator?.displayName || creator?.username || 'Unknown',
        creatorEmail: creator?.email || 'Unknown',
        eventName: event.title,
        eventDate: new Date(event.eventDate),
        eventTime: event.eventTime,
        venue: event.venue || 'TBD',
        items,
        subtotal: order.subtotal,
        taxes: order.tax || 0,
        platformFees: order.platformFee || 0,
        discounts: order.discount || 0,
        couponCode: order.couponId,
        total: order.total,
        currency: order.currency,
        paymentMethod: order.paymentProvider,
        paymentId: order.paymentId || 'Unknown',
        supportEmail: 'support@chandara.com',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
      };
    } catch (error) {
      logger.error('Error generating receipt PDF data:', error);
      return null;
    }
  }

  /**
   * Generate receipt PDF
   */
  async generateReceiptPDF(orderId: string): Promise<{ success: boolean; pdf?: Buffer; error?: string }> {
    const pdfData = await this.generateReceiptPDFData(orderId);
    
    if (!pdfData) {
      return { success: false, error: 'Failed to generate receipt data' };
    }

    try {
      const pdf = await pdfService.generateReceiptPDF(pdfData);
      return { success: true, pdf };
    } catch (error) {
      logger.error('Error generating receipt PDF:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      };
    }
  }

  /**
   * Generate receipt (database record)
   */
  async generateReceipt(orderId: string): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.status !== 'paid') {
        return { success: false, error: 'Order must be paid to generate receipt' };
      }

      const existingReceipt = await receiptRepository.findByOrderId(orderId);
      if (existingReceipt) {
        return { success: true, receipt: existingReceipt };
      }

      const tickets = await ticketRepository.findByOrderId(orderId);
      const items: ReceiptItem[] = tickets.map((ticket) => ({
        ticketId: ticket.ticketId,
        ticketType: ticket.ticketType,
        eventName: `Event ${order.eventId}`,
        price: ticket.price,
        quantity: 1,
      }));

      const receipt = await receiptRepository.create({
        orderId: order.orderId,
        userId: order.userId,
        items: items as any,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        platformFee: order.platformFee,
        total: order.total,
        currency: order.currency,
      });

      return { success: true, receipt };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate receipt',
      };
    }
  }

  async getReceiptById(receiptId: string) {
    return await receiptRepository.findById(receiptId);
  }

  async getReceiptByOrderId(orderId: string) {
    return await receiptRepository.findByOrderId(orderId);
  }

  async getReceiptsByUserId(userId: string, limit = 50) {
    return await receiptRepository.findByUserId(userId, limit);
  }

  async deleteReceipt(receiptId: string): Promise<boolean> {
    return await receiptRepository.delete(receiptId);
  }

  async regenerateReceipt(orderId: string): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    const existingReceipt = await receiptRepository.findByOrderId(orderId);
    if (existingReceipt) {
      const deleted = await receiptRepository.delete(existingReceipt.receiptId);
      if (!deleted) {
        return { success: false, error: 'Failed to delete existing receipt' };
      }
    }
    return await this.generateReceipt(orderId);
  }
}

export const receiptService = new ReceiptService();
