import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { reviewController } from '../controllers/review.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateEvent, validateUpdateEvent, validateListEvents, validateSetFeatured } from '../validators/event.validators';
import { fromBody, fromQuery } from '../middleware/validate';

const router = Router();

// Public routes
router.get('/search', eventController.searchEvents.bind(eventController));
router.get('/featured', eventController.getFeaturedEvents.bind(eventController));
router.get('/live', eventController.getLiveEvents.bind(eventController));
router.get('/upcoming', eventController.getUpcomingEvents.bind(eventController));
router.get('/tags', eventController.getEventsByTags.bind(eventController));
router.get('/creator/:creatorUid', eventController.getEventsByCreator.bind(eventController));
router.get('/', fromQuery(validateListEvents), eventController.listEvents.bind(eventController));
router.get('/slug/:slug', eventController.getEventBySlug.bind(eventController));
router.get('/:id', eventController.getEvent.bind(eventController));

// Protected routes - require creator role
router.post('/', authMiddleware, requireRole('creator'), fromBody(validateCreateEvent), eventController.createEvent.bind(eventController));
router.put('/:id', authMiddleware, requireRole('creator'), fromBody(validateUpdateEvent), eventController.updateEvent.bind(eventController));
router.delete('/:id', authMiddleware, requireRole('creator'), eventController.deleteEvent.bind(eventController));

// Event lifecycle management - creator only
router.post('/:id/schedule', authMiddleware, requireRole('creator'), eventController.scheduleEvent.bind(eventController));
router.post('/:id/start', authMiddleware, requireRole('creator'), eventController.startEvent.bind(eventController));
router.post('/:id/end', authMiddleware, requireRole('creator'), eventController.endEvent.bind(eventController));
router.post('/:id/cancel', authMiddleware, requireRole('creator'), eventController.cancelEvent.bind(eventController));

// Admin only routes
router.put('/:id/featured', authMiddleware, requireRole('administrator'), fromBody(validateSetFeatured), eventController.setFeatured.bind(eventController));

// Review routes
router.get('/:eventId/reviews', reviewController.getReviews.bind(reviewController));
router.get('/:eventId/reviews/average', reviewController.getAverageRating.bind(reviewController));
router.post('/:eventId/reviews', authMiddleware, reviewController.createReview.bind(reviewController));
router.get('/user/reviews', authMiddleware, reviewController.getUserReviews.bind(reviewController));
router.get('/:eventId/reviews/my', authMiddleware, reviewController.getReview.bind(reviewController));
router.put('/reviews/:reviewId', authMiddleware, reviewController.updateReview.bind(reviewController));
router.delete('/reviews/:reviewId', authMiddleware, reviewController.deleteReview.bind(reviewController));

export default router;
