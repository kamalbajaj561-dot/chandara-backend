import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreatePayment, validateVerifyPayment, validateProcessRefund } from '../validators/ticketing.validators';
import { fromBody } from '../middleware/validate';

const router = Router();

// Protected routes - require authentication
// Provider webhook: unauthenticated by design; authenticity comes from the signed raw body.
router.post('/webhook/:provider', PaymentController.webhook);

router.post('/', authMiddleware, fromBody(validateCreatePayment), PaymentController.createPayment);
router.post('/verify', authMiddleware, fromBody(validateVerifyPayment), PaymentController.verifyPayment);
// Direct provider refunds are admin-only; customers request refunds through /refunds (approval flow).
router.post('/refund', authMiddleware, requireRole('administrator'), fromBody(validateProcessRefund), PaymentController.processRefund);
router.put('/:paymentId/cancel', authMiddleware, PaymentController.cancelPayment);
router.get('/my-payments', authMiddleware, PaymentController.getPaymentsByUserId);
router.get('/:paymentId', authMiddleware, PaymentController.getPaymentById);
router.get('/order/:orderId', authMiddleware, PaymentController.getPaymentsByOrderId);

export default router;
