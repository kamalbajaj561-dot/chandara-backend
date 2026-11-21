import { Request, Response, NextFunction } from 'express';
import { CouponController } from '../coupon.controller';

jest.mock('../../services/coupon.service');

describe('CouponController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      user: { userId: 'user1', email: 'user1@example.com', role: 'creator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('should create a new coupon', async () => {
      mockRequest.body = {
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        maxUses: 100,
        minPurchase: 50,
        expiryDate: '2025-12-31',
      };

      const { couponService } = require('../../services/coupon.service');
      couponService.createCoupon = jest.fn().mockResolvedValue({
        couponId: 'coupon1',
        code: 'SAVE20',
      });

      await CouponController.createCoupon(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getCouponById', () => {
    it('should return coupon by ID', async () => {
      mockRequest.params = { couponId: 'coupon1' };

      const { couponService } = require('../../services/coupon.service');
      couponService.getCouponById = jest.fn().mockResolvedValue({
        couponId: 'coupon1',
        code: 'SAVE20',
      });

      await CouponController.getCouponById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('validateCoupon', () => {
    it('should validate a coupon', async () => {
      mockRequest.params = { code: 'SAVE20' };
      mockRequest.query = { purchaseAmount: '100' };

      const { couponService } = require('../../services/coupon.service');
      couponService.validateCoupon = jest.fn().mockResolvedValue({
        valid: true,
        coupon: { couponId: 'coupon1' },
        discountAmount: 20,
      });

      await CouponController.validateCoupon(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('updateCoupon', () => {
    it('should update a coupon', async () => {
      mockRequest.params = { couponId: 'coupon1' };
      mockRequest.body = { maxUses: 200 };

      const { couponService } = require('../../services/coupon.service');
      couponService.updateCoupon = jest.fn().mockResolvedValue({
        couponId: 'coupon1',
        maxUses: 200,
      });

      await CouponController.updateCoupon(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('deleteCoupon', () => {
    it('should delete a coupon', async () => {
      mockRequest.params = { couponId: 'coupon1' };

      const { couponService } = require('../../services/coupon.service');
      couponService.deleteCoupon = jest.fn().mockResolvedValue(true);

      await CouponController.deleteCoupon(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
