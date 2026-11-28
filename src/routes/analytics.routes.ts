import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import {
  validateDateRange,
  validateAnalyticsTrack,
  validateTrendsQuery,
} from '../validators/analytics.validators';
import { authMiddleware, optionalAuth, requireRole } from '../middleware/auth';
import { requireCreatorOrAdmin, requireEventOwnerOrAdmin } from '../middleware/analyticsAccess';

import { getCreatorSummary, getEventSummary, getPlatformSummary } from '../controllers/analyticsSummary.controller';

const router = Router();

// Aggregation-backed summaries (real counts/sums; unavailable metrics are null)
router.get('/summary/platform', authMiddleware, requireRole('administrator'), getPlatformSummary);
router.get('/summary/creator/:id', authMiddleware, requireCreatorOrAdmin('id'), getCreatorSummary);
router.get('/summary/event/:id', authMiddleware, requireEventOwnerOrAdmin('id'), getEventSummary);

/**
 * Analytics Routes
 * All routes require authentication
 */

// Platform analytics (admin only)
router.get('/platform', authMiddleware, requireRole('administrator'), validateDateRange, analyticsController.getPlatformAnalytics.bind(analyticsController));

// Revenue analytics (admin only)
router.get('/revenue', authMiddleware, requireRole('administrator'), validateDateRange, analyticsController.getRevenueAnalytics.bind(analyticsController));

// Creator analytics (creator can access own, admin can access all)
router.get('/creator/:id', authMiddleware, requireCreatorOrAdmin('id'), validateDateRange, analyticsController.getCreatorAnalytics.bind(analyticsController));

// Event analytics (creator can access own events, admin can access all)
router.get('/event/:id', authMiddleware, requireEventOwnerOrAdmin('id'), validateDateRange, analyticsController.getEventAnalytics.bind(analyticsController));

// User analytics (admin only)
router.get('/user', authMiddleware, requireRole('administrator'), validateDateRange, analyticsController.getUserAnalytics.bind(analyticsController));

// Chat analytics (creator for own events, admin for all)
router.get('/chat/:eventId', authMiddleware, requireEventOwnerOrAdmin('eventId'), validateDateRange, analyticsController.getChatAnalytics.bind(analyticsController));

// Streaming analytics (creator for own events, admin for all)
router.get('/stream/:eventId', authMiddleware, requireEventOwnerOrAdmin('eventId'), validateDateRange, analyticsController.getStreamingAnalytics.bind(analyticsController));

// Dashboard summary
router.get('/dashboard', authMiddleware, requireRole('administrator'), analyticsController.getDashboard.bind(analyticsController));

// Trends
router.get('/trends', authMiddleware, requireRole('administrator'), validateTrendsQuery, analyticsController.getTrends.bind(analyticsController));

// Track event (internal use, may not require auth for client-side tracking)
router.post('/track', optionalAuth, validateAnalyticsTrack, analyticsController.trackEvent.bind(analyticsController));

export default router;
