import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { ApiResponse } from '../types';

export class OrderController {
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { eventId, items, currency, paymentProvider, couponCode } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const creatorId = req.user?.role === 'creator' ? userId : undefined;

      const result = await orderService.createOrder(
        userId,
        creatorId || '',
        eventId,
        items,
        currency,
        paymentProvider,
        couponCode
      );

      const response: ApiResponse = {
        success: result.success,
        data: result.order,
        error: result.error,
      };

      res.status(result.success ? 201 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      const order = await orderService.getOrderById(orderId);

      if (!order) {
        const response: ApiResponse = {
          success: false,
          error: 'Order not found',
        };
        res.status(404).json(response);
        return;
      }

      // Ownership check: users can only view their own orders unless admin
      if (userRole !== 'administrator' && order.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Access denied',
        };
        res.status(403).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: order,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrdersByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const orders = await orderService.getOrdersByUserId(userId, limit);

      const response: ApiResponse = {
        success: true,
        data: orders,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrdersByCreatorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorId = req.user?.userId;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!creatorId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const orders = await orderService.getOrdersByCreatorId(creatorId, limit);

      const response: ApiResponse = {
        success: true,
        data: orders,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrdersByEventId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const orders = await orderService.getOrdersByEventId(eventId, limit);

      const response: ApiResponse = {
        success: true,
        data: orders,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const order = await orderService.updateOrderStatus(orderId, status);

      if (!order) {
        const response: ApiResponse = {
          success: false,
          error: 'Order not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: order,
        message: 'Order status updated',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId;

      const order = await orderService.getOrderById(orderId);

      if (!order) {
        const response: ApiResponse = {
          success: false,
          error: 'Order not found',
        };
        res.status(404).json(response);
        return;
      }

      if (order.userId !== userId) {
        const response: ApiResponse = {
          success: false,
          error: 'Unauthorized',
        };
        res.status(403).json(response);
        return;
      }

      const result = await orderService.cancelOrder(orderId);

      const response: ApiResponse = {
        success: result.success,
        error: result.error,
        message: result.success ? 'Order cancelled successfully' : undefined,
      };

      res.status(result.success ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const statistics = await orderService.getOrderStatistics(eventId);

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
