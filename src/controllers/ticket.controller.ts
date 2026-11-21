import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticket.service';
import { ApiResponse } from '../types';

export class TicketController {
  static async getTicketById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const ticket = await ticketService.getTicketById(ticketId);

      if (!ticket) {
        const response: ApiResponse = {
          success: false,
          error: 'Ticket not found',
        };
        res.status(404).json(response);
        return;
      }

      // Ownership check: users can only view their own tickets unless admin
      if (userRole !== 'administrator' && ticket.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: ticket,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketsByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const tickets = await ticketService.getTicketsByUserId(userId, limit);

      const response: ApiResponse = {
        success: true,
        data: tickets,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketsByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const tickets = await ticketService.getTicketsByOrderId(orderId);

      // Ownership check: users can only view tickets for their own orders unless admin
      if (userRole !== 'administrator' && tickets.length > 0 && tickets[0].userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: tickets,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketsByEventId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userRole = req.user?.role;
      const limit = parseInt(req.query.limit as string) || 100;

      const tickets = await ticketService.getTicketsByEventId(eventId, limit);

      // Ownership check: only admins or event creators can view all tickets for an event
      if (userRole !== 'administrator') {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: tickets,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async validateTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { qrCode } = req.body;

      const result = await ticketService.validateTicket(qrCode);

      const response: ApiResponse = {
        success: result.valid,
        data: result.ticket,
        error: result.error,
      };

      res.status(result.valid ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async markTicketAsUsed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;
      const userRole = req.user?.role;

      // Only administrators and creators can mark tickets as used
      if (userRole !== 'administrator' && userRole !== 'creator') {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const ticket = await ticketService.markTicketAsUsed(ticketId);

      if (!ticket) {
        const response: ApiResponse = {
          success: false,
          error: 'Ticket not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: ticket,
        message: 'Ticket marked as used',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async cancelTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.userId;

      const ticket = await ticketService.getTicketById(ticketId);

      if (!ticket) {
        const response: ApiResponse = {
          success: false,
          error: 'Ticket not found',
        };
        res.status(404).json(response);
        return;
      }

      if (ticket.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized',
        };
        res.status(403).json(response);
        return;
      }

      const cancelledTicket = await ticketService.cancelTicket(ticketId);

      const response: ApiResponse = {
        success: true,
        data: cancelledTicket,
        message: 'Ticket cancelled successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const statistics = await ticketService.getTicketStatistics(eventId);

      const response: ApiResponse = {
        success: true,
        data: statistics,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
