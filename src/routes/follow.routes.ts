import { Router } from 'express';
import { FollowController } from '../controllers/follow.controller';
import { authMiddleware } from '../middleware/auth';
import { validateListFollows } from '../validators/follow.validators';

const router = Router();

// Follow a user (authenticated)
router.post('/users/:userId', authMiddleware, FollowController.followUser);

// Unfollow a user (authenticated)
router.delete('/users/:userId', authMiddleware, FollowController.unfollowUser);

// Check if following a user (authenticated)
router.get('/users/:userId/check', authMiddleware, FollowController.checkIsFollowing);

// Get user's followers (public)
router.get('/users/:userId/followers', validateListFollows, FollowController.getFollowers);

// Get user's following (public)
router.get('/users/:userId/following', validateListFollows, FollowController.getFollowing);

// Get user's followers count (public)
router.get('/users/:userId/followers/count', FollowController.getFollowersCount);

// Get user's following count (public)
router.get('/users/:userId/following/count', FollowController.getFollowingCount);

// Follow a creator (authenticated)
router.post('/creators/:creatorId', authMiddleware, FollowController.followCreator);

// Unfollow a creator (authenticated)
router.delete('/creators/:creatorId', authMiddleware, FollowController.unfollowCreator);

export default router;
