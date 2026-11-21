import { Request, Response, NextFunction } from 'express';
import { refundService } from '../services/refund.service';
import { ApiResponse } from '../types';

export class RefundController {
  static async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orderId, amount, currency, reason } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const result = await refundService.createRefund(orderId, userId, amount, currency, reason);

      const response: ApiResponse = {
        success: result.success,
        data: result.refund,
        error: result.error,
      };

      res.status(result.success ? 201 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRefundById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refundId } = req.params;
      const refund = await refundService.getRefundById(refundId);

      if (!refund) {
        const response: ApiResponse = {
          success: false,
          error: 'Refund not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: refund,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRefundsByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const refunds = await refundService.getRefundsByOrderId(orderId);

      const response: ApiResponse = {
        success: true,
        data: refunds,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRefundsByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const refunds = await refundService.getRefundsByUserId(userId, limit);

      const response: ApiResponse = {
        success: true,
        data: refunds,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRefundsByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const refunds = await refundService.getRefundsByStatus(status as any, limit);

      const response: ApiResponse = {
        success: true,
        data: refunds,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async approveRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refundId } = req.params;
      const approvedBy = req.user?.userId;

      if (!approvedBy) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const result = await refundService.approveRefund(refundId, approvedBy);

      const response: ApiResponse = {
        success: result.success,
        data: result.refund,
        error: result.error,
        message: result.success ? 'Refund approved successfully' : undefined,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async rejectRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refundId } = req.params;

      const result = await refundService.rejectRefund(refundId);

      const response: ApiResponse = {
        success: result.success,
        data: result.refund,
        error: result.error,
        message: result.success ? 'Refund rejected successfully' : undefined,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getRefundStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const statistics = await refundService.getRefundStatistics(eventId);

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
