import { CouponService } from '../coupon.service';
import { Coupon, CouponType } from '../../types';

jest.mock('../../repositories/coupon.repository');

describe('CouponService', () => {
  let couponService: CouponService;

  beforeEach(() => {
    couponService = new CouponService();
    jest.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('should create a new coupon', async () => {
      const mockCoupon: Coupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage' as CouponType,
        value: 20,
        maxUses: 100,
        usedCount: 0,
        minPurchase: 50,
        expiryDate: new Date('2025-12-31'),
        creatorId: 'creator1',
        isPlatformCoupon: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { couponRepository } = require('../../repositories/coupon.repository');
      couponRepository.create = jest.fn().mockResolvedValue(mockCoupon);

      const result = await couponService.createCoupon(
        'SAVE20',
        'percentage' as CouponType,
        20,
        100,
        50,
        new Date('2025-12-31'),
        'creator1',
        false
      );

      expect(couponRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockCoupon);
    });
  });

  describe('validateCoupon', () => {
    it('should validate a valid coupon', async () => {
      const mockCoupon: Coupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage' as CouponType,
        value: 20,
        maxUses: 100,
        usedCount: 10,
        minPurchase: 50,
        expiryDate: new Date('2030-12-31'),
        creatorId: 'creator1',
        isPlatformCoupon: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { couponRepository } = require('../../repositories/coupon.repository');
      couponRepository.findByCode = jest.fn().mockResolvedValue(mockCoupon);

      const result = await couponService.validateCoupon('SAVE20', 100);

      expect(result).toEqual({ valid: true, coupon: mockCoupon, discountAmount: 20 });
    });

    it('should return invalid for expired coupon', async () => {
      const mockCoupon: Coupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage' as CouponType,
        value: 20,
        maxUses: 100,
        usedCount: 10,
        minPurchase: 50,
        expiryDate: new Date('2020-01-01'),
        creatorId: 'creator1',
        isPlatformCoupon: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { couponRepository } = require('../../repositories/coupon.repository');
      couponRepository.findByCode = jest.fn().mockResolvedValue(mockCoupon);

      const result = await couponService.validateCoupon('SAVE20', 100);

      expect(result).toEqual({ valid: false, error: 'Coupon has expired' });
    });

    it('should return invalid for coupon below min purchase', async () => {
      const mockCoupon: Coupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage' as CouponType,
        value: 20,
        maxUses: 100,
        usedCount: 10,
        minPurchase: 50,
        expiryDate: new Date('2030-12-31'),
        creatorId: 'creator1',
        isPlatformCoupon: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { couponRepository } = require('../../repositories/coupon.repository');
      couponRepository.findByCode = jest.fn().mockResolvedValue(mockCoupon);

      const result = await couponService.validateCoupon('SAVE20', 25);

      expect(result).toEqual({ valid: false, error: 'Minimum purchase amount of 50 required' });
    });
  });
});
