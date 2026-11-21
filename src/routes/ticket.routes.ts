import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateValidateTicket } from '../validators/ticketing.validators';

const router = Router();

// Public routes
router.post('/validate', validateValidateTicket, TicketController.validateTicket);

// Protected routes - require authentication
router.get('/my-tickets', authMiddleware, TicketController.getTicketsByUserId);
router.get('/order/:orderId', authMiddleware, TicketController.getTicketsByOrderId);
router.get('/event/:eventId', authMiddleware, TicketController.getTicketsByEventId);
router.get('/:ticketId', authMiddleware, TicketController.getTicketById);
router.put('/:ticketId/use', authMiddleware, TicketController.markTicketAsUsed);
router.put('/:ticketId/cancel', authMiddleware, TicketController.cancelTicket);

// Statistics - admin only
router.get('/statistics/:eventId', authMiddleware, requireRole('administrator'), TicketController.getTicketStatistics);

export default router;
