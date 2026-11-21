import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';
import { validateCreateNotification, validateNotificationPreferences } from '../validators/notification.validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get notifications with pagination and filtering
router.get('/', NotificationController.getNotifications);

// Search notifications
router.get('/search', NotificationController.searchNotifications);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Get notification preferences
router.get('/preferences', NotificationController.getPreferences);

// Update notification preferences
router.put('/preferences', validateNotificationPreferences, NotificationController.updatePreferences);

// Get single notification
router.get('/:id', NotificationController.getNotification);

// Create notification (admin can send to others, users can only send to themselves)
router.post('/', validateCreateNotification, NotificationController.createNotification);

// Mark notification as read
router.put('/:id/read', NotificationController.markAsRead);

// Mark notification as unread
router.put('/:id/unread', NotificationController.markAsUnread);

// Mark all notifications as read
router.put('/read-all', NotificationController.markAllAsRead);

// Delete single notification
router.delete('/:id', NotificationController.deleteNotification);

// Delete all notifications
router.delete('/', NotificationController.deleteAllNotifications);

export default router;
