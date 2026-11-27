import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { AdminController } from '../controllers/admin.controller';

const router = Router();
const controller = new AdminController();

// Every admin route requires a verified user AND the administrator role, checked on the server.
router.use(authMiddleware);
router.use(requireRole('administrator'));

const wrap =
  (name: keyof AdminController) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve((controller[name] as any).call(controller, req, res)).catch(next);
  };

router.get('/dashboard', wrap('getDashboard'));
router.get('/health', wrap('getHealth'));
router.get('/users/search', wrap('searchUsers'));
router.post('/users/:userId/suspend', wrap('suspendUser'));
router.post('/users/:userId/ban', wrap('banUser'));
router.post('/users/:userId/unban', wrap('unbanUser'));
router.post('/users/:userId/verify', wrap('verifyUser'));
router.post('/users/:userId/role', wrap('changeUserRole'));
router.post('/creators/:creatorId/approve', wrap('approveCreator'));
router.post('/creators/:creatorId/reject', wrap('rejectCreator'));
router.post('/creators/:creatorId/feature', wrap('featureCreator'));
router.post('/creators/:creatorId/unfeature', wrap('unfeatureCreator'));
router.get('/feature-flags', wrap('getFeatureFlags'));
router.post('/feature-flags/:flagId/enable', wrap('enableFeatureFlag'));
router.post('/feature-flags/:flagId/disable', wrap('disableFeatureFlag'));
router.get('/settings', wrap('getSettings'));
router.put('/settings', wrap('updateSetting'));
router.get('/maintenance', wrap('getMaintenanceMode'));
router.post('/maintenance/enable', wrap('enableMaintenanceMode'));
router.post('/maintenance/disable', wrap('disableMaintenanceMode'));
router.get('/audit', wrap('getAuditLogs'));
router.get('/search', wrap('search'));
router.post('/export', wrap('createExport'));
router.get('/export/:id', wrap('getExportStatus'));
router.post('/events/:eventId/approve', wrap('approveEvent'));
router.post('/events/:eventId/reject', wrap('rejectEvent'));
router.post('/events/:eventId/feature', wrap('featureEvent'));
router.post('/events/:eventId/unfeature', wrap('unfeatureEvent'));
router.post('/events/:eventId/cancel', wrap('cancelEvent'));
router.delete('/events/:eventId', wrap('deleteEvent'));
router.post('/streams/:streamId/stop', wrap('forceStopStream'));
router.post('/events/:eventId/chat/mute', wrap('muteStreamChat'));
router.post('/events/:eventId/chat/enable', wrap('enableStreamChat'));
router.delete('/streams/:streamId', wrap('removeStream'));
router.post('/streams/:streamId/disconnect', wrap('disconnectPublisher'));
router.delete('/chat/messages/:messageId', wrap('deleteChatMessage'));
router.post('/events/:eventId/chat/users/:userId/mute', wrap('muteChatUser'));
router.post('/events/:eventId/chat/users/:userId/ban', wrap('banChatUser'));
router.post('/events/:eventId/chat/users/:userId/shadow-ban', wrap('shadowBanUser'));
router.post('/moderator-notes', wrap('addModeratorNote'));
router.post('/refunds/:refundId/approve', wrap('approveRefund'));
router.post('/refunds/:refundId/reject', wrap('rejectRefund'));
router.post('/payments/:paymentId/retry', wrap('retryPayment'));
router.post('/payments/:paymentId/failed', wrap('markPaymentFailed'));
router.post('/payments/:paymentId/adjust', wrap('manualPaymentAdjustment'));
router.post('/tickets/:ticketId/verify', wrap('verifyTicket'));
router.post('/tickets/:ticketId/void', wrap('voidTicket'));
router.post('/tickets/:ticketId/reissue', wrap('reissueTicket'));
router.post('/tickets/:ticketId/cancel', wrap('cancelTicket'));
router.post('/coupons', wrap('createCoupon'));
router.put('/coupons/:couponId', wrap('updateCoupon'));
router.post('/coupons/:couponId/disable', wrap('disableCoupon'));
router.delete('/coupons/:couponId', wrap('deleteCoupon'));
router.get('/coupons/:couponId/statistics', wrap('getCouponStatistics'));
router.post('/notifications/broadcast', wrap('broadcastNotification'));
router.post('/notifications/broadcast/email', wrap('broadcastEmail'));
router.post('/notifications/broadcast/push', wrap('broadcastPush'));
router.post('/campaigns', wrap('scheduleCampaign'));
router.post('/campaigns/:campaignId/cancel', wrap('cancelCampaign'));
router.get('/campaigns/:campaignId/statistics', wrap('getDeliveryStatistics'));

export default router;
