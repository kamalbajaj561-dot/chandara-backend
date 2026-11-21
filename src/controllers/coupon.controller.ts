import { Request, Response, NextFunction } from 'express';
import { couponService } from '../services/coupon.service';
import { ApiResponse } from '../types';

export class CouponController {
  static async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { code, type, value, maxUses, minPurchase, expiryDate, isPlatformCoupon } = req.body;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const creatorId = req.user?.role === 'creator' ? userId : undefined;

      const coupon = await couponService.createCoupon(
        code,
        type,
        value,
        maxUses,
        minPurchase,
        new Date(expiryDate),
        creatorId,
        isPlatformCoupon
      );

      const response: ApiResponse = {
        success: true,
        data: coupon,
        message: 'Coupon created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getCouponById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { couponId } = req.params;
      const coupon = await couponService.getCouponById(couponId);

      if (!coupon) {
        const response: ApiResponse = {
          success: false,
          error: 'Coupon not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: coupon,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getCouponByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const coupon = await couponService.getCouponByCode(code);

      if (!coupon) {
        const response: ApiResponse = {
          success: false,
          error: 'Coupon not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: coupon,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getCouponsByCreatorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorId = req.user?.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!creatorId) {
        const response: ApiResponse = {
          success: false,
          error: 'User not authenticated',
        };
        res.status(401).json(response);
        return;
      }

      const coupons = await couponService.getCouponsByCreatorId(creatorId, limit);

      const response: ApiResponse = {
        success: true,
        data: coupons,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getPlatformCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const coupons = await couponService.getPlatformCoupons(limit);

      const response: ApiResponse = {
        success: true,
        data: coupons,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async getActiveCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const coupons = await couponService.getActiveCoupons(limit);

      const response: ApiResponse = {
        success: true,
        data: coupons,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, purchaseAmount } = req.body;

      const result = await couponService.validateCoupon(code, purchaseAmount);

      const response: ApiResponse = {
        success: result.valid,
        data: result.valid ? { coupon: result.coupon, discountAmount: result.discountAmount } : undefined,
        error: result.error,
      };

      res.status(result.valid ? 200 : 400).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { couponId } = req.params;
      const couponData = req.body;

      const coupon = await couponService.updateCoupon(couponId, couponData);

      if (!coupon) {
        const response: ApiResponse = {
          success: false,
          error: 'Coupon not found',
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: coupon,
        message: 'Coupon updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { couponId } = req.params;
      const deleted = await couponService.deleteCoupon(couponId);

      const response: ApiResponse = {
        success: deleted,
        message: deleted ? 'Coupon deleted successfully' : 'Coupon not found',
      };

      res.status(deleted ? 200 : 404).json(response);
    } catch (error) {
      next(error);
    }
  }
}
