import { emailService } from './email.service';
import { ticketDeliveryRepository } from '../repositories/ticketDelivery.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { orderRepository } from '../repositories/order.repository';
import { UserRepository } from '../repositories/user.repository';
import { eventRepository } from '../repositories/event.repository';
import { pdfService, TicketPDFData } from './pdf.service';
import { receiptService } from './receipt.service';
import { getCache, setCache } from './redis';
import logger from '../utils/logger';

export interface SendTicketEmailOptions {
  ticketId: string;
  recipient: string;
  userId: string;
  queue?: boolean;
}

export interface SendReceiptEmailOptions {
  orderId: string;
  recipient: string;
  userId: string;
  queue?: boolean;
}

export class TicketDeliveryService {
  private readonly RESEND_COOLDOWN = 300; // 5 minutes in seconds
  private readonly RESEND_CACHE_PREFIX = 'resend:';

  /**
   * Send ticket email
   */
  async sendTicketEmail(options: SendTicketEmailOptions): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      // Check resend cooldown
      const cooldownKey = `${this.RESEND_CACHE_PREFIX}ticket:${options.ticketId}`;
      const lastSent = await getCache(cooldownKey);
      if (lastSent) {
        return { success: false, error: 'Ticket email was recently sent. Please wait before resending.' };
      }

      // Get ticket details
      const ticket = await ticketRepository.findById(options.ticketId);
      if (!ticket) {
        return { success: false, error: 'Ticket not found' };
      }

      // Verify ownership
      if (ticket.userId !== options.userId) {
        return { success: false, error: 'Access denied. You do not own this ticket.' };
      }

      // Get order and event details
      const order = await orderRepository.findById(ticket.orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      const event = await eventRepository.findById(ticket.eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      const buyer = await UserRepository.findById(options.userId);
      const creator = await UserRepository.findById(event.creatorUid);

      // Generate PDF
      const pdfData: TicketPDFData = {
        ticketId: ticket.ticketId,
        orderId: ticket.orderId,
        userId: ticket.userId,
        eventId: ticket.eventId,
        ticketType: ticket.ticketType,
        price: ticket.price,
        currency: ticket.currency,
        eventName: event.title,
        eventDate: new Date(event.eventDate),
        eventTime: event.eventTime,
        venue: event.venue || 'TBD',
        isVirtual: false,
        timezone: event.timezone,
        orderDate: order.createdAt,
        buyerName: buyer?.displayName || buyer?.username || 'Unknown',
        buyerEmail: buyer?.email || 'Unknown',
        creatorName: creator?.displayName || creator?.username || 'Unknown',
        creatorEmail: creator?.email || 'Unknown',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
        supportEmail: 'support@chandara.com',
        qrCode: ticket.qrCode,
        qrPayload: ticket.qrSignature,
        createdAt: ticket.createdAt,
      };

      const pdfBuffer = await pdfService.generateTicketPDF(pdfData);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Create delivery log
      const delivery = await ticketDeliveryRepository.create({
        ticketId: options.ticketId,
        orderId: ticket.orderId,
        userId: options.userId,
        recipient: options.recipient,
        provider: 'Email',
      });

      // Send email
      const emailLog = await emailService.sendEmail(
        options.recipient,
        'ticket-delivery',
        `Your Ticket for ${event.title}`,
        {
          userName: buyer?.displayName || buyer?.username || 'there',
          eventName: event.title,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          venue: event.venue || 'TBD',
          ticketId: ticket.ticketId,
          orderId: ticket.orderId,
          ticketType: ticket.ticketType,
          price: `${ticket.currency} ${ticket.price.toFixed(2)}`,
          ticketPdf: pdfBase64,
          platformUrl: 'https://chandara.com',
        },
        { userId: options.userId, queue: options.queue }
      );

      if (emailLog.status === 'sent' || emailLog.status === 'queued') {
        await ticketDeliveryRepository.updateStatus(delivery.deliveryId, 'sent');
        // Set resend cooldown
        await setCache(cooldownKey, 'sent', this.RESEND_COOLDOWN);
        logger.info(`Ticket email sent successfully: ${delivery.deliveryId}`);
        return { success: true, deliveryId: delivery.deliveryId };
      } else {
        await ticketDeliveryRepository.updateWithError(delivery.deliveryId, emailLog.errorMessage || 'Unknown error');
        return { success: false, error: emailLog.errorMessage || 'Failed to send email' };
      }
    } catch (error) {
      logger.error('Error sending ticket email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send ticket email',
      };
    }
  }

  /**
   * Send receipt email
   */
  async sendReceiptEmail(options: SendReceiptEmailOptions): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      // Check resend cooldown
      const cooldownKey = `${this.RESEND_CACHE_PREFIX}receipt:${options.orderId}`;
      const lastSent = await getCache(cooldownKey);
      if (lastSent) {
        return { success: false, error: 'Receipt email was recently sent. Please wait before resending.' };
      }

      // Verify ownership
      const order = await orderRepository.findById(options.orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.userId !== options.userId) {
        return { success: false, error: 'Access denied. You do not own this order.' };
      }

      // Generate receipt PDF
      const pdfResult = await receiptService.generateReceiptPDF(options.orderId);
      if (!pdfResult.success || !pdfResult.pdf) {
        return { success: false, error: pdfResult.error || 'Failed to generate receipt PDF' };
      }

      const pdfBase64 = pdfResult.pdf.toString('base64');

      // Get user details
      const user = await UserRepository.findById(options.userId);
      const event = await eventRepository.findById(order.eventId);

      // Create delivery log (using orderId as ticketId for receipts)
      const delivery = await ticketDeliveryRepository.create({
        ticketId: options.orderId, // Use orderId for receipt tracking
        orderId: options.orderId,
        userId: options.userId,
        recipient: options.recipient,
        provider: 'Email',
      });

      // Send email
      const emailLog = await emailService.sendEmail(
        options.recipient,
        'receipt-delivery',
        `Receipt for Order ${order.orderId}`,
        {
          userName: user?.displayName || user?.username || 'there',
          orderId: order.orderId,
          eventName: event?.title || 'Event',
          total: `${order.currency} ${order.total.toFixed(2)}`,
          receiptPdf: pdfBase64,
          platformUrl: 'https://chandara.com',
        },
        { userId: options.userId, queue: options.queue }
      );

      if (emailLog.status === 'sent' || emailLog.status === 'queued') {
        await ticketDeliveryRepository.updateStatus(delivery.deliveryId, 'sent');
        // Set resend cooldown
        await setCache(cooldownKey, 'sent', this.RESEND_COOLDOWN);
        logger.info(`Receipt email sent successfully: ${delivery.deliveryId}`);
        return { success: true, deliveryId: delivery.deliveryId };
      } else {
        await ticketDeliveryRepository.updateWithError(delivery.deliveryId, emailLog.errorMessage || 'Unknown error');
        return { success: false, error: emailLog.errorMessage || 'Failed to send email' };
      }
    } catch (error) {
      logger.error('Error sending receipt email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send receipt email',
      };
    }
  }

  /**
   * Send ticket email (admin resend)
   */
  async adminResendTicket(ticketId: string, recipient: string): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      const ticket = await ticketRepository.findById(ticketId);
      if (!ticket) {
        return { success: false, error: 'Ticket not found' };
      }

      // Bypass cooldown for admin - clear the cache key
      const cooldownKey = `${this.RESEND_CACHE_PREFIX}ticket:${ticketId}`;
      await setCache(cooldownKey, '', 0);

      const result = await this.sendTicketEmail({
        ticketId,
        recipient,
        userId: ticket.userId,
        queue: false,
      });

      return result;
    } catch (error) {
      logger.error('Error in admin resend ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend ticket',
      };
    }
  }

  /**
   * Send receipt email (admin resend)
   */
  async adminResendReceipt(orderId: string, recipient: string): Promise<{ success: boolean; deliveryId?: string; error?: string }> {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Bypass cooldown for admin
      const result = await this.sendReceiptEmail({
        orderId,
        recipient,
        userId: order.userId,
        queue: false,
      });

      return result;
    } catch (error) {
      logger.error('Error in admin resend receipt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend receipt',
      };
    }
  }

  /**
   * Get delivery logs for user
   */
  async getUserDeliveryLogs(userId: string, limit = 50, offset = 0) {
    return await ticketDeliveryRepository.findByUserId(userId, limit, offset);
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(userId?: string) {
    return await ticketDeliveryRepository.getStatistics(userId);
  }

  /**
   * Track email open
   */
  async trackEmailOpen(deliveryId: string): Promise<void> {
    await ticketDeliveryRepository.updateStatus(deliveryId, 'opened');
  }

  /**
   * Track email click
   */
  async trackEmailClick(deliveryId: string): Promise<void> {
    await ticketDeliveryRepository.updateStatus(deliveryId, 'clicked');
  }
}

export const ticketDeliveryService = new TicketDeliveryService();
