import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth';
import { validateCreatePayment, validateVerifyPayment, validateProcessRefund } from '../validators/ticketing.validators';

const router = Router();

// Protected routes - require authentication
router.post('/', authMiddleware, validateCreatePayment, PaymentController.createPayment);
router.post('/verify', authMiddleware, validateVerifyPayment, PaymentController.verifyPayment);
router.post('/refund', authMiddleware, validateProcessRefund, PaymentController.processRefund);
router.put('/:paymentId/cancel', authMiddleware, PaymentController.cancelPayment);
router.get('/:paymentId', authMiddleware, PaymentController.getPaymentById);
router.get('/order/:orderId', authMiddleware, PaymentController.getPaymentsByOrderId);
router.get('/my-payments', authMiddleware, PaymentController.getPaymentsByUserId);

export default router;
