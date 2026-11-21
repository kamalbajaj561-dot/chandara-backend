import { Router } from 'express';
import { TicketDeliveryController } from '../controllers/ticketDelivery.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import {
  validateResendTicket,
  validateResendReceipt,
  validateAdminResend,
  validateDeliveryLogsQuery,
} from '../validators/ticketDelivery.validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /tickets/:id/download
 * @desc    Download ticket PDF
 * @access  Private (ticket owner or admin)
 */
router.get('/tickets/:id/download', TicketDeliveryController.downloadTicket);

/**
 * @route   GET /tickets/:id/qr
 * @desc    View QR code for ticket
 * @access  Private (ticket owner or admin)
 */
router.get('/tickets/:id/qr', TicketDeliveryController.viewQR);

/**
 * @route   GET /orders/:id/receipt
 * @desc    Download receipt PDF
 * @access  Private (order owner or admin)
 */
router.get('/orders/:id/receipt', TicketDeliveryController.downloadReceipt);

/**
 * @route   POST /tickets/:id/resend
 * @desc    Resend ticket email
 * @access  Private (ticket owner only)
 */
router.post('/tickets/:id/resend', validateResendTicket, TicketDeliveryController.resendTicket);

/**
 * @route   POST /orders/:id/resend-receipt
 * @desc    Resend receipt email
 * @access  Private (order owner only)
 */
router.post('/orders/:id/resend-receipt', validateResendReceipt, TicketDeliveryController.resendReceipt);

/**
 * @route   GET /tickets/:id/view
 * @desc    View ticket details online
 * @access  Private (ticket owner or admin)
 */
router.get('/tickets/:id/view', TicketDeliveryController.viewTicket);

/**
 * @route   GET /delivery/logs
 * @desc    Get delivery logs
 * @access  Private (admin only)
 */
router.get('/delivery/logs', requireRole('administrator'), validateDeliveryLogsQuery, TicketDeliveryController.getDeliveryLogs);

/**
 * @route   GET /delivery/statistics
 * @desc    Get delivery statistics
 * @access  Private (admin only)
 */
router.get('/delivery/statistics', requireRole('administrator'), TicketDeliveryController.getStatistics);

/**
 * @route   POST /admin/tickets/:id/resend
 * @desc    Admin resend ticket
 * @access  Private (admin only)
 */
router.post('/admin/tickets/:id/resend', requireRole('administrator'), validateAdminResend, TicketDeliveryController.adminResendTicket);

/**
 * @route   POST /admin/orders/:id/resend-receipt
 * @desc    Admin resend receipt
 * @access  Private (admin only)
 */
router.post('/admin/orders/:id/resend-receipt', requireRole('administrator'), validateAdminResend, TicketDeliveryController.adminResendReceipt);

export default router;
