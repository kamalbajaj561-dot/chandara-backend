import { Router } from 'express';
import { RefundController } from '../controllers/refund.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateRefund } from '../validators/ticketing.validators';

const router = Router();

// Protected routes - require authentication
router.post('/', authMiddleware, validateCreateRefund, RefundController.createRefund);
router.get('/:refundId', authMiddleware, RefundController.getRefundById);
router.get('/order/:orderId', authMiddleware, RefundController.getRefundsByOrderId);
router.get('/my-refunds', authMiddleware, RefundController.getRefundsByUserId);

// Admin only routes
router.get('/status/:status', authMiddleware, requireRole('administrator'), RefundController.getRefundsByStatus);
router.put('/:refundId/approve', authMiddleware, requireRole('administrator'), RefundController.approveRefund);
router.put('/:refundId/reject', authMiddleware, requireRole('administrator'), RefundController.rejectRefund);
router.get('/statistics/:eventId', authMiddleware, requireRole('administrator'), RefundController.getRefundStatistics);

export default router;
