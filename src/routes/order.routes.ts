import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateOrder, validateUpdateOrderStatus } from '../validators/ticketing.validators';
import { fromBody } from '../middleware/validate';

const router = Router();

// Protected routes - require authentication
router.post('/', authMiddleware, fromBody(validateCreateOrder), OrderController.createOrder);
router.get('/my-orders', authMiddleware, OrderController.getOrdersByUserId);
router.get('/creator', authMiddleware, OrderController.getOrdersByCreatorId);
router.get('/event/:eventId', authMiddleware, OrderController.getOrdersByEventId);
router.get('/:orderId', authMiddleware, OrderController.getOrderById);
// Order status is driven by verified payments; manual changes are admin-only.
router.put('/:orderId/status', authMiddleware, requireRole('administrator'), fromBody(validateUpdateOrderStatus), OrderController.updateOrderStatus);
router.put('/:orderId/cancel', authMiddleware, OrderController.cancelOrder);

// Statistics - admin only
router.get('/statistics/:eventId', authMiddleware, requireRole('administrator'), OrderController.getOrderStatistics);

export default router;
