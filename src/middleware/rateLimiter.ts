import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Rate limit configurations for different endpoint types
const rateLimitConfigs = {
  // Auth endpoints - very strict to prevent brute force
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later.',
  },
  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per window
    message: 'Too many password reset attempts, please try again later.',
  },
  // Registration - strict to prevent spam
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour
    message: 'Too many registration attempts, please try again later.',
  },
  // Payment endpoints - moderate strict
  payment: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 payment attempts per minute
    message: 'Too many payment attempts, please try again later.',
  },
  // Ticket purchase - moderate strict
  ticket: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 ticket purchases per minute
    message: 'Too many ticket purchase attempts, please try again later.',
  },
  // Chat - permissive for user experience
  chat: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 messages per minute
    message: 'Too many chat messages, please slow down.',
  },
  // Streaming - permissive
  streaming: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many streaming requests, please slow down.',
  },
  // Notifications - moderate
  notification: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 notifications per minute
    message: 'Too many notification requests, please slow down.',
  },
  // Admin - strict
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 admin actions per 15 minutes
    message: 'Too many admin actions, please try again later.',
  },
  // General API - default
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests, please try again later.',
  },
};

// Create rate limiters
export const authLimiter = rateLimit(rateLimitConfigs.auth);
export const passwordResetLimiter = rateLimit(rateLimitConfigs.passwordReset);
export const registrationLimiter = rateLimit(rateLimitConfigs.registration);
export const paymentLimiter = rateLimit(rateLimitConfigs.payment);
export const ticketLimiter = rateLimit(rateLimitConfigs.ticket);
export const chatLimiter = rateLimit(rateLimitConfigs.chat);
export const streamingLimiter = rateLimit(rateLimitConfigs.streaming);
export const notificationLimiter = rateLimit(rateLimitConfigs.notification);
export const adminLimiter = rateLimit(rateLimitConfigs.admin);
export const generalLimiter = rateLimit(rateLimitConfigs.general);

// Dynamic rate limiter based on user role
export const createRoleBasedLimiter = (baseConfig: typeof rateLimitConfigs.general) => {
  return rateLimit({
    ...baseConfig,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.userId || req.ip || 'unknown';
      return `${userId}-${req.path}`;
    },
    skip: (req: Request) => {
      // Skip rate limiting for admin users
      return (req as any).user?.role === 'admin';
    },
  });
};

// IP-based rate limiter for sensitive operations
export const sensitiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many sensitive operations, please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});

// Account creation limiter (per IP)
export const accountCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: 'Too many accounts created from this IP, please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
});
