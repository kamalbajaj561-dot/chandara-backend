import Joi from 'joi';

/**
 * Admin Validators
 * Joi validation schemas for admin operations
 */

// User Management Validators
export const searchUsersSchema = Joi.object({
  query: Joi.string().required().min(1).max(100),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

export const suspendUserSchema = Joi.object({
  reason: Joi.string().optional().max(500),
});

export const banUserSchema = Joi.object({
  reason: Joi.string().optional().max(500),
});

export const changeUserRoleSchema = Joi.object({
  role: Joi.string().required().valid('viewer', 'creator', 'administrator'),
});

// Creator Management Validators
export const rejectCreatorSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

// Feature Flag Validators
export const createFeatureFlagSchema = Joi.object({
  key: Joi.string().required().min(1).max(100).pattern(/^[a-zA-Z0-9_-]+$/),
  name: Joi.string().required().min(1).max(100),
  description: Joi.string().optional().max(500),
  enabled: Joi.boolean().default(false),
  environment: Joi.string().valid('development', 'staging', 'production').default('production'),
  percentage: Joi.number().min(0).max(100).default(100),
  conditions: Joi.object().optional(),
});

export const updateFeatureFlagSchema = Joi.object({
  name: Joi.string().optional().min(1).max(100),
  description: Joi.string().optional().max(500),
  enabled: Joi.boolean().optional(),
  percentage: Joi.number().min(0).max(100).optional(),
  conditions: Joi.object().optional(),
});

// System Settings Validators
export const updateSettingSchema = Joi.object({
  key: Joi.string().required().min(1).max(100),
  value: Joi.any().required(),
  category: Joi.string().required().valid('general', 'platform', 'streaming', 'payment', 'email', 'push', 'analytics'),
  description: Joi.string().optional().max(500),
});

export const bulkUpdateSettingsSchema = Joi.object({
  settings: Joi.array().items(
    Joi.object({
      key: Joi.string().required().min(1).max(100),
      value: Joi.any().required(),
      category: Joi.string().required().valid('general', 'platform', 'streaming', 'payment', 'email', 'push', 'analytics'),
    })
  ).min(1).max(50).required(),
});

// Maintenance Mode Validators
export const enableMaintenanceSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000),
  estimatedEndTime: Joi.date().iso().optional(),
  whitelistedAdmins: Joi.array().items(Joi.string()).optional(),
  whitelistedIps: Joi.array().items(Joi.string().ip()).optional(),
});

export const updateMaintenanceMessageSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000),
});

export const addToWhitelistSchema = Joi.object({
  adminIds: Joi.array().items(Joi.string()).optional(),
  ips: Joi.array().items(Joi.string().ip()).optional(),
});

// Audit Log Validators
export const getAuditLogsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
  adminId: Joi.string().optional(),
  action: Joi.string().optional(),
  target: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

// Search Validators
export const globalSearchSchema = Joi.object({
  query: Joi.string().required().min(1).max(100),
  limit: Joi.number().integer().min(1).max(100).default(50),
  type: Joi.string().optional().valid('user', 'creator', 'event', 'order', 'payment', 'analytics', 'audit_logs'),
});

// Export Validators
export const createExportSchema = Joi.object({
  type: Joi.string().required().valid('users', 'creators', 'events', 'orders', 'payments', 'analytics', 'audit_logs'),
  format: Joi.string().required().valid('csv', 'json', 'xlsx'),
  filters: Joi.object().optional(),
});

// Support Ticket Validators
export const updateTicketSchema = Joi.object({
  status: Joi.string().optional().valid('open', 'in_progress', 'resolved', 'closed'),
  priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent'),
  assignedTo: Joi.string().optional(),
  response: Joi.string().optional().max(2000),
});

export const assignTicketSchema = Joi.object({
  assignedTo: Joi.string().required(),
});

export const addTicketNoteSchema = Joi.object({
  note: Joi.string().required().min(1).max(2000),
  isInternal: Joi.boolean().default(false),
});

// Admin Account Validators
export const createAdminSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().required().valid('super_admin', 'admin', 'moderator'),
  permissions: Joi.array().items(Joi.string()).optional(),
});

export const updateAdminSchema = Joi.object({
  role: Joi.string().optional().valid('super_admin', 'admin', 'moderator'),
  permissions: Joi.array().items(Joi.string()).optional(),
  active: Joi.boolean().optional(),
});

export const updateAdminPermissionsSchema = Joi.object({
  permissions: Joi.array().items(Joi.string()).min(1).required(),
});

// =====================================================
// Event Moderation Validators
// =====================================================

export const rejectEventSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const cancelEventSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const deleteEventSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

// =====================================================
// Stream Moderation Validators
// =====================================================

export const forceStopStreamSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const removeStreamSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const disconnectPublisherSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

// =====================================================
// Chat Moderation Validators
// =====================================================

export const deleteChatMessageSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const muteChatUserSchema = Joi.object({
  duration: Joi.number().required().min(60).max(86400), // 1 minute to 24 hours
  reason: Joi.string().required().min(1).max(500),
});

export const banChatUserSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const shadowBanUserSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const moderatorNoteSchema = Joi.object({
  targetId: Joi.string().required(),
  targetType: Joi.string().required().valid('user', 'creator', 'event', 'chat_message'),
  note: Joi.string().required().min(1).max(2000),
});

// =====================================================
// Payment Administration Validators
// =====================================================

export const rejectRefundSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const markPaymentFailedSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const manualPaymentAdjustmentSchema = Joi.object({
  adjustmentAmount: Joi.number().required(),
  reason: Joi.string().required().min(1).max(500),
});

// =====================================================
// Ticket Administration Validators
// =====================================================

export const voidTicketSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const reissueTicketSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

export const cancelTicketSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

// =====================================================
// Coupon Administration Validators
// =====================================================

export const createCouponSchema = Joi.object({
  code: Joi.string().required().min(1).max(50).pattern(/^[A-Z0-9_-]+$/),
  type: Joi.string().required().valid('percentage', 'fixed'),
  value: Joi.number().required().min(0),
  maxUses: Joi.number().required().min(1),
  minPurchase: Joi.number().required().min(0),
  expiryDate: Joi.date().iso().required(),
  creatorId: Joi.string().optional(),
});

export const updateCouponSchema = Joi.object({
  code: Joi.string().optional().min(1).max(50).pattern(/^[A-Z0-9_-]+$/),
  type: Joi.string().optional().valid('percentage', 'fixed'),
  value: Joi.number().optional().min(0),
  maxUses: Joi.number().optional().min(1),
  minPurchase: Joi.number().optional().min(0),
  expiryDate: Joi.date().iso().optional(),
  creatorId: Joi.string().optional(),
});

export const deleteCouponSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});

// =====================================================
// Notification Administration Validators
// =====================================================

export const broadcastNotificationSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  message: Joi.string().required().min(1).max(1000),
});

export const broadcastEmailSchema = Joi.object({
  subject: Joi.string().required().min(1).max(200),
  content: Joi.string().required().min(1).max(5000),
});

export const broadcastPushSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  message: Joi.string().required().min(1).max(1000),
});

export const scheduleCampaignSchema = Joi.object({
  title: Joi.string().required().min(1).max(200),
  message: Joi.string().required().min(1).max(1000),
  scheduledFor: Joi.date().iso().required(),
  targetAudience: Joi.array().items(Joi.string()).optional(),
});

export const cancelCampaignSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
});
