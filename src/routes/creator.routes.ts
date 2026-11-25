import { Router } from 'express';
import { CreatorController } from '../controllers/creator.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateCreateCreator, validateUpdateCreatorProfile, validateSearchCreators, validateListCreators, validateSubmitVerificationRequest, validateRejectVerificationRequest, validateSetFeatured } from '../validators/creator.validators';
import { fromBody, fromQuery } from '../middleware/validate';

const router = Router();

// Get current user's creator profile (authenticated, creator only)
router.get('/me', authMiddleware, requireRole('creator'), CreatorController.getMyProfile);

// Create creator profile (authenticated)
router.post('/', authMiddleware, fromBody(validateCreateCreator), CreatorController.createProfile);

// Check creator username availability (public)
router.get('/username/:username/availability', CreatorController.checkUsernameAvailability);

// Search creators (public)
router.get('/search', fromQuery(validateSearchCreators), CreatorController.searchCreators);

// Get featured creators (public)
router.get('/featured', CreatorController.getFeaturedCreators);

// Get creators by category (public)
router.get('/category/:category', CreatorController.getCreatorsByCategory);

// List creators (public with optional filters)
router.get('/', fromQuery(validateListCreators), CreatorController.listCreators);

// Get creator profile by ID (public)
router.get('/:creatorId', CreatorController.getPublicProfile);

// Get creator profile by username (public)
router.get('/username/:username', CreatorController.getPublicProfileByUsername);

// Update creator profile (authenticated, creator or admin - ownership check in controller)
router.put('/:creatorId', authMiddleware, fromBody(validateUpdateCreatorProfile), CreatorController.updateProfile);

// Delete creator profile (authenticated, creator or admin - ownership check in controller)
router.delete('/:creatorId', authMiddleware, CreatorController.deleteProfile);

// Submit verification request (authenticated, creator only)
router.post('/:creatorId/verification', authMiddleware, requireRole('creator'), fromBody(validateSubmitVerificationRequest), CreatorController.submitVerificationRequest);

// Approve verification request (admin only)
router.put('/:creatorId/verification/approve', authMiddleware, requireRole('administrator'), CreatorController.approveVerificationRequest);

// Reject verification request (admin only)
router.put('/:creatorId/verification/reject', authMiddleware, requireRole('administrator'), fromBody(validateRejectVerificationRequest), CreatorController.rejectVerificationRequest);

// Set featured status (admin only)
router.put('/:creatorId/featured', authMiddleware, requireRole('administrator'), fromBody(validateSetFeatured), CreatorController.setFeatured);

export default router;
