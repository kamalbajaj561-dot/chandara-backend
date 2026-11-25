import { Router } from 'express';
import { RefundController } from '../controllers/refund.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateRefund } from '../validators/ticketing.validators';
import { fromBody } from '../middleware/validate';

const router = Router();

// Protected routes - require authentication
router.post('/', authMiddleware, fromBody(validateCreateRefund), RefundController.createRefund);
router.get('/my-refunds', authMiddleware, RefundController.getRefundsByUserId);
router.get('/:refundId', authMiddleware, RefundController.getRefundById);
router.get('/order/:orderId', authMiddleware, RefundController.getRefundsByOrderId);

// Admin only routes
router.get('/status/:status', authMiddleware, requireRole('administrator'), RefundController.getRefundsByStatus);
router.put('/:refundId/approve', authMiddleware, requireRole('administrator'), RefundController.approveRefund);
router.put('/:refundId/reject', authMiddleware, requireRole('administrator'), RefundController.rejectRefund);
router.get('/statistics/:eventId', authMiddleware, requireRole('administrator'), RefundController.getRefundStatistics);

export default router;
