import { Router } from 'express';
import { pushController } from '../controllers/push.controller';
import {
  validateDeviceRegistration,
  validatePushSend,
  validateTopicPushSend,
  validateSchedulePush,
  validateUpdateSchedule,
  validateLogsQuery,
  validateTestNotification,
} from '../validators/push.validators';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /push/register-device
 * @desc    Register a device token for push notifications
 * @access  Private
 */
router.post(
  '/register-device',
  authMiddleware,
  (req, _res, next) => {
    validateDeviceRegistration(req.body);
    next();
  },
  pushController.registerDevice.bind(pushController)
);

/**
 * @route   DELETE /push/device/:id
 * @desc    Delete a device token
 * @access  Private
 */
router.delete(
  '/device/:id',
  authMiddleware,
  pushController.deleteDevice.bind(pushController)
);

/**
 * @route   POST /push/send
 * @desc    Send a push notification to a user
 * @access  Private
 */
router.post(
  '/send',
  authMiddleware,
  (req, _res, next) => {
    validatePushSend(req.body);
    next();
  },
  pushController.sendPush.bind(pushController)
);

/**
 * @route   POST /push/send-topic
 * @desc    Send a push notification to a topic
 * @access  Private
 */
router.post(
  '/send-topic',
  authMiddleware,
  (req, _res, next) => {
    validateTopicPushSend(req.body);
    next();
  },
  pushController.sendTopicPush.bind(pushController)
);

/**
 * @route   POST /push/test
 * @desc    Send a test push notification
 * @access  Private
 */
router.post(
  '/test',
  authMiddleware,
  (req, _res, next) => {
    validateTestNotification(req.body);
    next();
  },
  pushController.testPush.bind(pushController)
);

/**
 * @route   GET /push/logs
 * @desc    Get push notification logs for the user
 * @access  Private
 */
router.get(
  '/logs',
  authMiddleware,
  (req, _res, next) => {
    validateLogsQuery(req.query);
    next();
  },
  pushController.getLogs.bind(pushController)
);

/**
 * @route   POST /push/schedule
 * @desc    Schedule a push notification
 * @access  Private
 */
router.post(
  '/schedule',
  authMiddleware,
  (req, _res, next) => {
    validateSchedulePush(req.body);
    next();
  },
  pushController.schedulePush.bind(pushController)
);

/**
 * @route   PUT /push/schedule/:id
 * @desc    Update a scheduled push notification
 * @access  Private
 */
router.put(
  '/schedule/:id',
  authMiddleware,
  (req, _res, next) => {
    validateUpdateSchedule(req.body);
    next();
  },
  pushController.updateSchedule.bind(pushController)
);

/**
 * @route   DELETE /push/schedule/:id
 * @desc    Cancel a scheduled push notification
 * @access  Private
 */
router.delete(
  '/schedule/:id',
  authMiddleware,
  pushController.cancelSchedule.bind(pushController)
);

/**
 * @route   GET /push/schedules
 * @desc    Get user's scheduled push notifications
 * @access  Private
 */
router.get(
  '/schedules',
  authMiddleware,
  pushController.getSchedules.bind(pushController)
);

/**
 * @route   GET /push/devices
 * @desc    Get user's registered devices
 * @access  Private
 */
router.get(
  '/devices',
  authMiddleware,
  pushController.getDevices.bind(pushController)
);

/**
 * @route   GET /push/stats
 * @desc    Get scheduler statistics
 * @access  Admin
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole('administrator'),
  pushController.getStats.bind(pushController)
);

/**
 * @route   POST /push/process-queue
 * @desc    Manually process the queue
 * @access  Admin
 */
router.post(
  '/process-queue',
  authMiddleware,
  requireRole('administrator'),
  pushController.processQueue.bind(pushController)
);

export default router;
