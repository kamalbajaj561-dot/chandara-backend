import { Coupon, CouponType } from '../types';
import { couponRepository } from '../repositories/coupon.repository';

export class CouponService {
  async createCoupon(
    code: string,
    type: CouponType,
    value: number,
    maxUses: number,
    minPurchase: number,
    expiryDate: Date,
    creatorId?: string,
    isPlatformCoupon = false
  ): Promise<Coupon> {
    const normalizedCode = code.toUpperCase().trim();
    const existingCoupon = await couponRepository.findByCode(normalizedCode);
    if (existingCoupon) {
      throw new Error('Coupon code already exists');
    }

    return await couponRepository.create({
      code: normalizedCode,
      type,
      value,
      maxUses,
      usedCount: 0,
      minPurchase,
      expiryDate,
      creatorId,
      isPlatformCoupon,
    });
  }

  async getCouponById(couponId: string) {
    return await couponRepository.findById(couponId);
  }

  async getCouponByCode(code: string) {
    return await couponRepository.findByCode(code.toUpperCase());
  }

  async getCouponsByCreatorId(creatorId: string, limit = 50) {
    return await couponRepository.findByCreatorId(creatorId, limit);
  }

  async getPlatformCoupons(limit = 50) {
    return await couponRepository.findPlatformCoupons(limit);
  }

  async getActiveCoupons(limit = 50) {
    return await couponRepository.findActiveCoupons(limit);
  }

  async validateCoupon(
    code: string,
    purchaseAmount: number
  ): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    error?: string;
  }> {
    const coupon = await couponRepository.findByCode(code.toUpperCase());

    if (!coupon) {
      return { valid: false, error: 'Coupon not found' };
    }

    if (new Date() > coupon.expiryDate) {
      return { valid: false, error: 'Coupon has expired' };
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: 'Coupon usage limit reached' };
    }

    if (purchaseAmount < coupon.minPurchase) {
      return {
        valid: false,
        error: `Minimum purchase amount of ${coupon.minPurchase} required`,
      };
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (purchaseAmount * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    discountAmount = Math.min(discountAmount, purchaseAmount);

    return {
      valid: true,
      coupon,
      discountAmount,
    };
  }

  async updateCoupon(couponId: string, couponData: Partial<Coupon>) {
    return await couponRepository.update(couponId, couponData);
  }

  async deleteCoupon(couponId: string): Promise<boolean> {
    return await couponRepository.delete(couponId);
  }

  async incrementCouponUsage(couponId: string) {
    return await couponRepository.incrementUsedCount(couponId);
  }
}

export const couponService = new CouponService();
