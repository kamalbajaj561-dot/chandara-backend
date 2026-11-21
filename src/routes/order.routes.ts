import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateOrder, validateUpdateOrderStatus } from '../validators/ticketing.validators';

const router = Router();

// Protected routes - require authentication
router.post('/', authMiddleware, validateCreateOrder, OrderController.createOrder);
router.get('/my-orders', authMiddleware, OrderController.getOrdersByUserId);
router.get('/creator', authMiddleware, OrderController.getOrdersByCreatorId);
router.get('/event/:eventId', authMiddleware, OrderController.getOrdersByEventId);
router.get('/:orderId', authMiddleware, OrderController.getOrderById);
router.put('/:orderId/status', authMiddleware, validateUpdateOrderStatus, OrderController.updateOrderStatus);
router.put('/:orderId/cancel', authMiddleware, OrderController.cancelOrder);

// Statistics - admin only
router.get('/statistics/:eventId', authMiddleware, requireRole('administrator'), OrderController.getOrderStatistics);

export default router;
