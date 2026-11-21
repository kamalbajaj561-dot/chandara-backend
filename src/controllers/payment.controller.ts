import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { ApiResponse } from '../types';

export class PaymentController {
  static async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orderId, amount, currency, provider, description, metadata } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const result = await paymentService.createPayment(
        orderId,
        userId,
        amount,
        currency,
        provider,
        description,
        metadata
      );

      const response: ApiResponse = {
        success: result.success,
        data: result.success ? { paymentUrl: result.paymentUrl, providerPaymentId: result.providerPaymentId } : undefined,
        error: result.error,
      };

      res.status(result.success ? 201 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { providerPaymentId, provider } = req.body;

      const result = await paymentService.verifyPayment(providerPaymentId, provider);

      const response: ApiResponse = {
        success: result.success,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async processRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId, amount, reason } = req.body;

      const result = await paymentService.processRefund(paymentId, amount, reason);

      const response: ApiResponse = {
        success: result.success,
        data: result.success ? { refundId: result.refundId } : undefined,
        error: result.error,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async cancelPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const payment = await paymentService.getPaymentById(paymentId);

      if (!payment) {
        const response: ApiResponse = {
          success: false,
          error: 'Payment not found',
        };
        res.status(404).json(response);
        return;
      }

      // Ownership check: users can only cancel their own payments unless admin
      if (userRole !== 'administrator' && payment.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const cancelled = await paymentService.cancelPayment(paymentId);

      const response: ApiResponse = {
        success: cancelled,
        message: cancelled ? 'Payment cancelled successfully' : 'Payment not found or cannot be cancelled',
      };

      res.status(cancelled ? 200 : 404).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const payment = await paymentService.getPaymentById(paymentId);

      if (!payment) {
        const response: ApiResponse = {
          success: false,
          error: 'Payment not found',
        };
        res.status(404).json(response);
        return;
      }

      // Ownership check: users can only view their own payments unless admin
      if (userRole !== 'administrator' && payment.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: payment,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentsByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const payments = await paymentService.getPaymentsByOrderId(orderId);

      const response: ApiResponse = {
        success: true,
        data: payments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentsByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const payments = await paymentService.getPaymentsByUserId(userId, limit);

      const response: ApiResponse = {
        success: true,
        data: payments,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
