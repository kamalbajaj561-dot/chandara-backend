import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All email routes require authentication
router.use(authMiddleware);

/**
 * POST /email/test
 * Send a test email (users can only send to themselves)
 */
router.post('/test', EmailController.sendTestEmail);

/**
 * POST /email/send
 * Send a single email
 */
router.post('/send', EmailController.sendEmail);

/**
 * POST /email/bulk
 * Send bulk emails (admin only)
 */
router.post('/bulk', requireRole('administrator'), EmailController.sendBulkEmail);

/**
 * GET /email/logs
 * Get email logs for user (with pagination)
 */
router.get('/logs', EmailController.getEmailLogs);

/**
 * GET /email/logs/:id
 * Get single email log
 */
router.get('/logs/:id', EmailController.getEmailLog);

/**
 * POST /email/retry/:id
 * Retry failed email (admin only)
 */
router.post('/retry/:id', requireRole('administrator'), EmailController.retryEmail);

/**
 * GET /email/statistics
 * Get email statistics (admin only)
 */
router.get('/statistics', requireRole('administrator'), EmailController.getStatistics);

/**
 * POST /email/process-queue
 * Process email queue (admin only)
 */
router.post('/process-queue', requireRole('administrator'), EmailController.processQueue);

export default router;
