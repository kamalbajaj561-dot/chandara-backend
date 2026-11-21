import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateUpdateUserProfile, validateSearchUsers, validateListUsers, validateUpdateUserStatus, validateUpdateUserRole } from '../validators/user.validators';

const router = Router();

// Get current user profile (authenticated)
router.get('/me', authMiddleware, UserController.getMe);

// Update current user profile (authenticated)
router.put('/me', authMiddleware, validateUpdateUserProfile, UserController.updateProfile);

// Check username availability (public)
router.get('/username/:username/availability', UserController.checkUsernameAvailability);

// Search users (public)
router.get('/search', validateSearchUsers, UserController.searchUsers);

// Get public user profile by ID (public)
router.get('/:userId', UserController.getPublicProfile);

// Get public user profile by username (public)
router.get('/username/:username', UserController.getPublicProfileByUsername);

// List users (admin only)
router.get('/', requireRole('administrator'), validateListUsers, UserController.listUsers);

// Update user status (admin only)
router.put('/:userId/status', requireRole('administrator'), validateUpdateUserStatus, UserController.updateUserStatus);

// Update user role (admin only)
router.put('/:userId/role', requireRole('administrator'), validateUpdateUserRole, UserController.updateUserRole);

// Delete user (admin only)
router.delete('/:userId', requireRole('administrator'), UserController.deleteUser);

export default router;
