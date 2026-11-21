import { Router } from 'express';
import { streamController } from '../controllers/stream.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateStartStream, validateStopStream, validateTokenRequest, validateUpdateViewers, validateUpdateHealth } from '../validators/stream.validators';

const router = Router();

// Public routes
router.get('/live', streamController.getLiveStreams.bind(streamController));

// Protected routes - require authentication
router.get('/:eventId', authMiddleware, streamController.getStream.bind(streamController));
router.get('/:eventId/health', authMiddleware, streamController.getStreamHealth.bind(streamController));

// Token generation - requires authentication
router.post('/:eventId/token', authMiddleware, validateTokenRequest, streamController.getToken.bind(streamController));

// Stream lifecycle - requires creator role
router.post('/:eventId/start', authMiddleware, requireRole('creator'), validateStartStream, streamController.startStream.bind(streamController));
router.post('/:eventId/stop', authMiddleware, requireRole('creator'), validateStopStream, streamController.stopStream.bind(streamController));

// Viewer management - requires authentication
router.put('/:eventId/viewers', authMiddleware, validateUpdateViewers, streamController.updateViewers.bind(streamController));

// Session management - requires authentication
router.post('/:streamId/join', authMiddleware, streamController.joinStream.bind(streamController));
router.post('/:streamId/leave', authMiddleware, streamController.leaveStream.bind(streamController));

// Health management - requires authentication (internal use)
router.put('/:streamId/health', authMiddleware, validateUpdateHealth, streamController.updateHealth.bind(streamController));
router.post('/:streamId/heartbeat', authMiddleware, streamController.recordHeartbeat.bind(streamController));

export default router;
