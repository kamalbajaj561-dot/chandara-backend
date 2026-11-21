import { Request, Response, NextFunction } from 'express';
import { ticketDeliveryService } from '../services/ticketDelivery.service';
import { ticketRepository } from '../repositories/ticket.repository';
import { orderRepository } from '../repositories/order.repository';
import { pdfService } from '../services/pdf.service';
import { receiptService } from '../services/receipt.service';
import { qrCodeService } from '../services/qrCode.service';
import { eventRepository } from '../repositories/event.repository';
import { UserRepository } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';

export class TicketDeliveryController {
  /**
   * Download ticket PDF
   */
  static async downloadTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      const ticket = await ticketRepository.findById(String(id));
      if (!ticket) {
        throw new AppError('Ticket not found', 404);
      }

      // Verify ownership
      if (ticket.userId !== user.userId && user.role !== 'administrator') {
        throw new AppError('Access denied. You do not own this ticket.', 403);
      }

      // Get order and event details for PDF
      const order = await orderRepository.findById(String(ticket.orderId));
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const event = await eventRepository.findById(String(ticket.eventId));
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      const buyer = await UserRepository.findById(String(user.userId));
      const creator = await UserRepository.findById(String(event.creatorUid));

      const pdfData = {
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

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketId}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * View QR code
   */
  static async viewQR(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      const ticket = await ticketRepository.findById(String(id));
      if (!ticket) {
        throw new AppError('Ticket not found', 404);
      }

      // Verify ownership
      if (ticket.userId !== user.userId && user.role !== 'administrator') {
        throw new AppError('Access denied. You do not own this ticket.', 403);
      }

      // Generate QR code
      const qrBase64 = await qrCodeService.generateQRBase64(ticket.qrSignature);

      res.json({
        success: true,
        data: {
          qrCode: qrBase64,
          ticketId: ticket.ticketId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download receipt PDF
   */
  static async downloadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      const order = await orderRepository.findById(String(id));
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Verify ownership
      if (order.userId !== user.userId && user.role !== 'administrator') {
        throw new AppError('Access denied. You do not own this order.', 403);
      }

      const pdfResult = await receiptService.generateReceiptPDF(String(id));
      if (!pdfResult.success || !pdfResult.pdf) {
        throw new AppError(pdfResult.error || 'Failed to generate receipt PDF', 500);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.orderId}.pdf"`);
      res.send(pdfResult.pdf);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend ticket email
   */
  static async resendTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { recipient } = req.body;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      const ticket = await ticketRepository.findById(String(id));
      if (!ticket) {
        throw new AppError('Ticket not found', 404);
      }

      // Verify ownership
      if (ticket.userId !== user.userId) {
        throw new AppError('Access denied. You can only resend your own tickets.', 403);
      }

      const result = await ticketDeliveryService.sendTicketEmail({
        ticketId: String(id),
        recipient: recipient || user.email,
        userId: user.userId,
        queue: false,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: { deliveryId: result.deliveryId },
          message: 'Ticket email resent successfully',
        });
      } else {
        throw new AppError(result.error || 'Failed to resend ticket email', 400);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend receipt email
   */
  static async resendReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { recipient } = req.body;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      const order = await orderRepository.findById(String(id));
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Verify ownership
      if (order.userId !== user.userId) {
        throw new AppError('Access denied. You can only resend your own receipts.', 403);
      }

      const result = await ticketDeliveryService.sendReceiptEmail({
        orderId: String(id),
        recipient: recipient || user.email,
        userId: user.userId,
        queue: false,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: { deliveryId: result.deliveryId },
          message: 'Receipt email resent successfully',
        });
      } else {
        throw new AppError(result.error || 'Failed to resend receipt email', 400);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * View ticket online
   */
  static async viewTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      const ticket = await ticketRepository.findById(String(id));
      if (!ticket) {
        throw new AppError('Ticket not found', 404);
      }

      // Verify ownership
      if (ticket.userId !== user.userId && user.role !== 'administrator') {
        throw new AppError('Access denied. You do not own this ticket.', 403);
      }

      const order = await orderRepository.findById(String(ticket.orderId));
      const event = await eventRepository.findById(String(ticket.eventId));

      res.json({
        success: true,
        data: {
          ticket: {
            ticketId: ticket.ticketId,
            ticketType: ticket.ticketType,
            price: ticket.price,
            currency: ticket.currency,
            qrCode: ticket.qrCode,
            status: ticket.status,
          },
          order: {
            orderId: order?.orderId,
            total: order?.total,
            createdAt: order?.createdAt,
          },
          event: {
            title: event?.title,
            eventDate: event?.eventDate,
            eventTime: event?.eventTime,
            venue: event?.venue,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get delivery logs (admin only)
   */
  static async getDeliveryLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      if (user.role !== 'administrator') {
        throw new AppError('Access denied. Delivery logs are admin only.', 403);
      }

      const { userId } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await ticketDeliveryService.getUserDeliveryLogs(
        userId as string,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        data: logs,
        pagination: { limit, offset },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get delivery statistics (admin only)
   */
  static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      if (user.role !== 'administrator') {
        throw new AppError('Access denied. Statistics are admin only.', 403);
      }

      const { userId } = req.query;
      const stats = await ticketDeliveryService.getStatistics(userId as string);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin resend ticket (admin only)
   */
  static async adminResendTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { recipient } = req.body;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      if (user.role !== 'administrator') {
        throw new AppError('Access denied. Admin resend is admin only.', 403);
      }

      if (!recipient) {
        throw new AppError('Recipient email is required', 400);
      }

      const result = await ticketDeliveryService.adminResendTicket(String(id), recipient);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: { deliveryId: result.deliveryId },
          message: 'Ticket resent successfully',
        });
      } else {
        throw new AppError(result.error || 'Failed to resend ticket', 400);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin resend receipt (admin only)
   */
  static async adminResendReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { recipient } = req.body;
      const user = req.user as any;

      if (!user) {
        throw new AppError('User not authenticated', 401);
      }

      if (user.role !== 'administrator') {
        throw new AppError('Access denied. Admin resend is admin only.', 403);
      }

      if (!recipient) {
        throw new AppError('Recipient email is required', 400);
      }

      const result = await ticketDeliveryService.adminResendReceipt(String(id), recipient);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: { deliveryId: result.deliveryId },
          message: 'Receipt resent successfully',
        });
      } else {
        throw new AppError(result.error || 'Failed to resend receipt', 400);
      }
    } catch (error) {
      next(error);
    }
  }
}
