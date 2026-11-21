import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { optionalAuth } from '../middleware/auth';
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rateLimit';
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateResetPassword,
  validateConfirmResetPassword,
  validateVerifyEmail,
} from '../validators/auth.validators';

const router = Router();

// Public routes with rate limiting
router.post('/register', registerRateLimiter, validateRegister, AuthController.register);
router.post('/login', loginRateLimiter, validateLogin, AuthController.login);
router.post('/refresh', validateRefreshToken, AuthController.refreshToken);
router.post('/verify-email', validateVerifyEmail, AuthController.verifyEmail);
router.post('/send-password-reset', passwordResetRateLimiter, validateResetPassword, AuthController.sendPasswordResetEmail);
router.post('/reset-password', validateConfirmResetPassword, AuthController.resetPassword);

// Protected routes
router.post('/logout', optionalAuth, AuthController.logout);
router.get('/me', optionalAuth, AuthController.getMe);

export default router;
