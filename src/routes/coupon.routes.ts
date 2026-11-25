import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateCoupon, validateValidateCoupon } from '../validators/ticketing.validators';
import { fromBody } from '../middleware/validate';

const router = Router();

// Public routes
router.post('/validate', fromBody(validateValidateCoupon), CouponController.validateCoupon);
router.get('/platform', CouponController.getPlatformCoupons);
router.get('/active', CouponController.getActiveCoupons);

// Protected routes - require authentication
router.post('/', authMiddleware, requireRole('administrator'), fromBody(validateCreateCoupon), CouponController.createCoupon);
router.get('/:couponId', authMiddleware, CouponController.getCouponById);
router.get('/code/:code', authMiddleware, CouponController.getCouponByCode);
router.get('/creator/my-coupons', authMiddleware, requireRole('creator'), CouponController.getCouponsByCreatorId);
router.put('/:couponId', authMiddleware, requireRole('administrator'), CouponController.updateCoupon);
router.delete('/:couponId', authMiddleware, requireRole('administrator'), CouponController.deleteCoupon);

export default router;
