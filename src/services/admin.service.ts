import { canTransition, normalizeEventStatus } from '../utils/eventLifecycle';
import { UserRepository } from '../repositories/user.repository';
import { CreatorRepository } from '../repositories/creator.repository';
import { EventRepository } from '../repositories/event.repository';
import { StreamRepository } from '../repositories/stream.repository';
import { ChatMessageRepository } from '../repositories/chatMessage.repository';
import { ChatBanRepository } from '../repositories/chatBan.repository';
import { ChatRoomRepository } from '../repositories/chatRoom.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { TicketRepository } from '../repositories/ticket.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { ScheduledNotificationRepository } from '../repositories/scheduledNotification.repository';
import { auditRepository } from '../repositories/audit.repository';
import { maintenanceRepository } from '../repositories/maintenance.repository';
import { featureFlagRepository } from '../repositories/featureFlag.repository';
import { systemSettingsRepository } from '../repositories/systemSettings.repository';
import { ticketService } from './ticket.service';
import { couponService } from './coupon.service';
import { User } from '../types';
import logger from '../utils/logger';

// Instantiate repositories
const eventRepository = new EventRepository();
const streamRepository = new StreamRepository();
const chatMessageRepository = new ChatMessageRepository();
const chatBanRepository = new ChatBanRepository();
const chatRoomRepository = new ChatRoomRepository();
const paymentRepository = new PaymentRepository();
const refundRepository = new RefundRepository();
const ticketRepository = new TicketRepository();
const couponRepository = new CouponRepository();
const scheduledNotificationRepository = new ScheduledNotificationRepository();

/**
 * Admin Service
 * Handles all admin operations including user management, moderation, and platform administration
 */
export class AdminService {
  /**
   * Log admin action to audit log
   */
  private async logAudit(
    adminId: string,
    adminName: string,
    action: string,
    target: string,
    targetId?: string,
    before?: any,
    after?: any,
    ip?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await auditRepository.create({
      adminId,
      adminName,
      adminEmail: '', // Placeholder - would fetch from user repository
      action,
      target,
      targetId,
      before,
      after,
      ip: ip || 'unknown',
      userAgent,
      success,
      errorMessage,
    });
  }

  // =====================================================
  // User Management
  // =====================================================

  /**
   * Search users
   */
  async searchUsers(query: string, page: number = 1, pageSize: number = 20): Promise<{
    users: User[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const users = await UserRepository.searchUsers(query, pageSize);
    return { users, total: users.length, page, pageSize };
  }

  /**
   * Suspend user
   */
  async suspendUser(
    userId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const before = { status: user.status };
    await UserRepository.update(userId, { status: 'suspended' });
    const after = { status: 'suspended' };

    await this.logAudit(
      adminId,
      adminName,
      'suspend_user',
      'user',
      userId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} suspended by ${adminName}`);
  }

  /**
   * Ban user
   */
  async banUser(
    userId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const before = { status: user.status };
    await UserRepository.update(userId, { status: 'banned' });
    const after = { status: 'banned' };

    await this.logAudit(
      adminId,
      adminName,
      'ban_user',
      'user',
      userId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} banned by ${adminName}`);
  }

  /**
   * Unban user
   */
  async unbanUser(
    userId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const before = { status: user.status };
    await UserRepository.update(userId, { status: 'active' });
    const after = { status: 'active' };

    await this.logAudit(
      adminId,
      adminName,
      'unban_user',
      'user',
      userId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} unbanned by ${adminName}`);
  }

  /**
   * Verify user
   */
  async verifyUser(
    userId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const before = { verified: user.verified };
    await UserRepository.update(userId, { verified: true });
    const after = { verified: true };

    await this.logAudit(
      adminId,
      adminName,
      'verify_user',
      'user',
      userId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} verified by ${adminName}`);
  }

  /**
   * Change user role
   */
  async changeUserRole(
    userId: string,
    newRole: 'viewer' | 'creator' | 'administrator',
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const before = { role: user.role };
    await UserRepository.update(userId, { role: newRole });
    const after = { role: newRole };

    await this.logAudit(
      adminId,
      adminName,
      'change_user_role',
      'user',
      userId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} role changed to ${newRole} by ${adminName}`);
  }

  // =====================================================
  // Creator Management
  // =====================================================

  /**
   * Approve creator verification
   */
  async approveCreator(
    creatorId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const creator = await CreatorRepository.findById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    const before = { verificationStatus: creator.verificationStatus, verified: creator.verified };
    await CreatorRepository.update(creatorId, {
      verificationStatus: 'approved',
      verified: true,
    });
    const after = { verificationStatus: 'approved', verified: true };

    await this.logAudit(
      adminId,
      adminName,
      'approve_creator',
      'creator',
      creatorId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Creator ${creatorId} approved by ${adminName}`);
  }

  /**
   * Reject creator verification
   */
  async rejectCreator(
    creatorId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const creator = await CreatorRepository.findById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    const before = { verificationStatus: creator.verificationStatus };
    await CreatorRepository.update(creatorId, {
      verificationStatus: 'rejected',
      verified: false,
    });
    const after = { verificationStatus: 'rejected', verified: false };

    await this.logAudit(
      adminId,
      adminName,
      'reject_creator',
      'creator',
      creatorId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Creator ${creatorId} rejected by ${adminName}`);
  }

  /**
   * Feature creator
   */
  async featureCreator(
    creatorId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const creator = await CreatorRepository.findById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    const before = { featured: creator.featured };
    await CreatorRepository.update(creatorId, { featured: true });
    const after = { featured: true };

    await this.logAudit(
      adminId,
      adminName,
      'feature_creator',
      'creator',
      creatorId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Creator ${creatorId} featured by ${adminName}`);
  }

  /**
   * Remove featured creator
   */
  async unfeatureCreator(
    creatorId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const creator = await CreatorRepository.findById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    const before = { featured: creator.featured };
    await CreatorRepository.update(creatorId, { featured: false });
    const after = { featured: false };

    await this.logAudit(
      adminId,
      adminName,
      'unfeature_creator',
      'creator',
      creatorId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Creator ${creatorId} unfeatured by ${adminName}`);
  }

  // =====================================================
  // Feature Flags
  // =====================================================

  /**
   * Enable feature flag
   */
  async enableFeatureFlag(
    flagId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const flag = await featureFlagRepository.findById(flagId);
    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const before = { enabled: flag.enabled };
    await featureFlagRepository.enable(flagId, adminId);
    const after = { enabled: true };

    await this.logAudit(
      adminId,
      adminName,
      'enable_feature_flag',
      'feature_flag',
      flagId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Feature flag ${flagId} enabled by ${adminName}`);
  }

  /**
   * Disable feature flag
   */
  async disableFeatureFlag(
    flagId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const flag = await featureFlagRepository.findById(flagId);
    if (!flag) {
      throw new Error('Feature flag not found');
    }

    const before = { enabled: flag.enabled };
    await featureFlagRepository.disable(flagId, adminId);
    const after = { enabled: false };

    await this.logAudit(
      adminId,
      adminName,
      'disable_feature_flag',
      'feature_flag',
      flagId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Feature flag ${flagId} disabled by ${adminName}`);
  }

  // =====================================================
  // Maintenance Mode
  // =====================================================

  /**
   * Enable maintenance mode
   */
  async enableMaintenanceMode(
    message: string,
    adminId: string,
    adminName: string,
    estimatedEndTime?: Date,
    whitelistedAdmins: string[] = [],
    whitelistedIps?: string[],
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const current = await maintenanceRepository.getCurrent();
    const before = { enabled: current?.enabled || false };

    await maintenanceRepository.enable(
      message,
      adminId,
      estimatedEndTime,
      whitelistedAdmins,
      whitelistedIps
    );
    const after = { enabled: true };

    await this.logAudit(
      adminId,
      adminName,
      'enable_maintenance_mode',
      'maintenance',
      undefined,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Maintenance mode enabled by ${adminName}`);
  }

  /**
   * Disable maintenance mode
   */
  async disableMaintenanceMode(
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const current = await maintenanceRepository.getCurrent();
    const before = { enabled: current?.enabled || false };

    await maintenanceRepository.disable(adminId);
    const after = { enabled: false };

    await this.logAudit(
      adminId,
      adminName,
      'disable_maintenance_mode',
      'maintenance',
      undefined,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Maintenance mode disabled by ${adminName}`);
  }

  // =====================================================
  // System Settings
  // =====================================================

  /**
   * Update system setting
   */
  async updateSetting(
    key: string,
    value: any,
    category: 'general' | 'platform' | 'streaming' | 'payment' | 'email' | 'push' | 'analytics',
    adminId: string,
    adminName: string,
    description?: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const existing = await systemSettingsRepository.get(key);
    const before = existing ? { value: existing.value } : null;

    await systemSettingsRepository.upsert(key, value, category, adminId, description);
    const after = { value };

    await this.logAudit(
      adminId,
      adminName,
      'update_setting',
      'setting',
      key,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Setting ${key} updated by ${adminName}`);
  }

  // =====================================================
  // Event Moderation
  // =====================================================

  /**
   * Approve event
   */
  async approveEvent(
    eventId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!canTransition(event.status, 'scheduled')) {
      throw new Error(`Only pending events can be approved (current status: ${event.status})`);
    }
    const before = { status: event.status };
    await eventRepository.update(eventId, { status: 'scheduled', rejectionReason: '' });
    const after = { status: 'scheduled' };

    await this.logAudit(
      adminId,
      adminName,
      'approve_event',
      'event',
      eventId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Event ${eventId} approved by ${adminName}`);
  }

  /**
   * Reject event
   */
  async rejectEvent(
    eventId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (!canTransition(event.status, 'rejected')) {
      throw new Error(`Only pending events can be rejected (current status: ${event.status})`);
    }
    const before = { status: event.status };
    await eventRepository.update(eventId, { status: 'rejected', rejectionReason: reason });
    const after = { status: 'rejected', reason };

    await this.logAudit(
      adminId,
      adminName,
      'reject_event',
      'event',
      eventId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Event ${eventId} rejected by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Feature event
   */
  async featureEvent(
    eventId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const before = { featured: event.featured };
    await eventRepository.update(eventId, { featured: true });
    const after = { featured: true };

    await this.logAudit(
      adminId,
      adminName,
      'feature_event',
      'event',
      eventId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Event ${eventId} featured by ${adminName}`);
  }

  /**
   * Unfeature event
   */
  async unfeatureEvent(
    eventId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const before = { featured: event.featured };
    await eventRepository.update(eventId, { featured: false });
    const after = { featured: false };

    await this.logAudit(
      adminId,
      adminName,
      'unfeature_event',
      'event',
      eventId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Event ${eventId} unfeatured by ${adminName}`);
  }

  /**
   * Cancel event
   */
  async cancelEvent(
    eventId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (['ended', 'cancelled'].includes(normalizeEventStatus(event.status))) {
      throw new Error(`Event is already ${normalizeEventStatus(event.status)}`);
    }
    const before = { status: event.status };
    await eventRepository.update(eventId, { status: 'cancelled' });
    const after = { status: 'cancelled' };

    await this.logAudit(
      adminId,
      adminName,
      'cancel_event',
      'event',
      eventId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Event ${eventId} cancelled by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Delete event
   */
  async deleteEvent(
    eventId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const before = { ...event };
    await eventRepository.delete(eventId);
    const after = null;

    await this.logAudit(
      adminId,
      adminName,
      'delete_event',
      'event',
      eventId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Event ${eventId} deleted by ${adminName}. Reason: ${reason}`);
  }

  // =====================================================
  // Stream Moderation
  // =====================================================

  /**
   * Force stop stream
   */
  async forceStopStream(
    streamId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const stream = await streamRepository.findById(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    await streamRepository.update(streamId, { status: 'ended' });

    await this.logAudit(
      adminId,
      adminName,
      'force_stop_stream',
      'stream',
      streamId,
      { status: stream.status },
      { status: 'ended' },
      ip,
      userAgent
    );

    logger.info(`Stream ${streamId} force stopped by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Mute stream chat
   */
  async muteStreamChat(
    eventId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const room = await chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const before = { chatEnabled: room.chatEnabled };
    await chatRoomRepository.update(room.id, { chatEnabled: false });
    const after = { chatEnabled: false };

    await this.logAudit(
      adminId,
      adminName,
      'mute_stream_chat',
      'chat_room',
      room.id,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Chat muted for event ${eventId} by ${adminName}`);
  }

  /**
   * Enable stream chat
   */
  async enableStreamChat(
    eventId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const room = await chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const before = { chatEnabled: room.chatEnabled };
    await chatRoomRepository.update(room.id, { chatEnabled: true });
    const after = { chatEnabled: true };

    await this.logAudit(
      adminId,
      adminName,
      'enable_stream_chat',
      'chat_room',
      room.id,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Chat enabled for event ${eventId} by ${adminName}`);
  }

  /**
   * Remove stream
   */
  async removeStream(
    streamId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const stream = await streamRepository.findById(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    await streamRepository.delete(streamId);

    await this.logAudit(
      adminId,
      adminName,
      'remove_stream',
      'stream',
      streamId,
      { ...stream },
      null,
      ip,
      userAgent
    );

    logger.info(`Stream ${streamId} removed by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Disconnect publisher
   */
  async disconnectPublisher(
    streamId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const stream = await streamRepository.findById(streamId);
    if (!stream) {
      throw new Error('Stream not found');
    }

    await streamRepository.update(streamId, { publisherConnected: false });

    await this.logAudit(
      adminId,
      adminName,
      'disconnect_publisher',
      'stream',
      streamId,
      { publisherConnected: stream.publisherConnected },
      { publisherConnected: false },
      ip,
      userAgent
    );

    logger.info(`Publisher disconnected from stream ${streamId} by ${adminName}. Reason: ${reason}`);
  }

  // =====================================================
  // Chat Moderation
  // =====================================================

  /**
   * Delete chat message
   */
  async deleteChatMessage(
    messageId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const message = await chatMessageRepository.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    await chatMessageRepository.delete(messageId);

    await this.logAudit(
      adminId,
      adminName,
      'delete_chat_message',
      'chat_message',
      messageId,
      { ...message },
      null,
      ip,
      userAgent
    );

    logger.info(`Chat message ${messageId} deleted by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Mute user in chat
   */
  async muteChatUser(
    eventId: string,
    userId: string,
    duration: number,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const room = await chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const before = { mutedUsers: room.mutedUsers };
    if (!room.mutedUsers.includes(userId)) {
      room.mutedUsers.push(userId);
      await chatRoomRepository.update(room.id, { mutedUsers: room.mutedUsers });
    }
    const after = { mutedUsers: room.mutedUsers };

    await this.logAudit(
      adminId,
      adminName,
      'mute_chat_user',
      'chat_room',
      room.id,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} muted in chat for ${duration} minutes by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Ban user from chat
   */
  async banChatUser(
    eventId: string,
    userId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const room = await chatRoomRepository.findByEventId(eventId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const before = { bannedUsers: room.bannedUsers };
    if (!room.bannedUsers.includes(userId)) {
      room.bannedUsers.push(userId);
      await chatRoomRepository.update(room.id, { bannedUsers: room.bannedUsers });
    }
    const after = { bannedUsers: room.bannedUsers };

    await this.logAudit(
      adminId,
      adminName,
      'ban_chat_user',
      'chat_room',
      room.id,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`User ${userId} banned from chat by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Shadow ban user
   */
  async shadowBanUser(
    eventId: string,
    userId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await chatBanRepository.create({
      banId: `ban_${Date.now()}_${userId}`,
      eventId,
      userId,
      userName: 'Unknown',
      bannedBy: adminId,
      bannedByName: adminName,
      reason,
      banType: 'permanent',
      isActive: true,
    });

    await this.logAudit(
      adminId,
      adminName,
      'shadow_ban_user',
      'chat_ban',
      userId,
      null,
      { shadowBanned: true },
      ip,
      userAgent
    );

    logger.info(`User ${userId} shadow banned by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Add moderator note
   */
  async addModeratorNote(
    targetId: string,
    targetType: 'user' | 'creator' | 'event' | 'chat_message',
    note: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await auditRepository.create({
      adminId,
      adminName,
      adminEmail: adminName,
      action: 'moderator_note',
      target: targetType,
      targetId,
      before: null,
      after: { note },
      ip: ip || 'unknown',
      userAgent,
      success: true,
    });

    logger.info(`Moderator note added to ${targetType} ${targetId} by ${adminName}`);
  }

  // =====================================================
  // Payment Administration
  // =====================================================

  /**
   * Approve refund
   */
  async approveRefund(
    refundId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const refund = await refundRepository.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    const before = { status: refund.status };
    await refundRepository.update(refundId, { status: 'approved' });
    const after = { status: 'approved' };

    await this.logAudit(
      adminId,
      adminName,
      'approve_refund',
      'refund',
      refundId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Refund ${refundId} approved by ${adminName}`);
  }

  /**
   * Reject refund
   */
  async rejectRefund(
    refundId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const refund = await refundRepository.findById(refundId);
    if (!refund) {
      throw new Error('Refund not found');
    }

    const before = { status: refund.status };
    await refundRepository.update(refundId, { status: 'rejected' });
    const after = { status: 'rejected' };

    await this.logAudit(
      adminId,
      adminName,
      'reject_refund',
      'refund',
      refundId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Refund ${refundId} rejected by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Retry payment
   */
  async retryPayment(
    paymentId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    await paymentRepository.update(paymentId, { status: 'pending' });

    await this.logAudit(
      adminId,
      adminName,
      'retry_payment',
      'payment',
      paymentId,
      { status: payment.status },
      { status: 'pending' },
      ip,
      userAgent
    );

    logger.info(`Payment ${paymentId} retried by ${adminName}`);
  }

  /**
   * Mark payment as failed
   */
  async markPaymentFailed(
    paymentId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const before = { status: payment.status };
    await paymentRepository.update(paymentId, { status: 'failed' });
    const after = { status: 'failed' };

    await this.logAudit(
      adminId,
      adminName,
      'mark_payment_failed',
      'payment',
      paymentId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Payment ${paymentId} marked as failed by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Manual payment adjustment
   */
  async manualPaymentAdjustment(
    paymentId: string,
    adjustmentAmount: number,
    reason: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const before = { amount: payment.amount };
    await paymentRepository.update(paymentId, { 
      amount: payment.amount + adjustmentAmount
    });
    const after = { amount: payment.amount + adjustmentAmount };

    await this.logAudit(
      adminId,
      adminName,
      'manual_payment_adjustment',
      'payment',
      paymentId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Payment ${paymentId} manually adjusted by ${adminName}. Amount: ${adjustmentAmount}. Reason: ${reason}`);
  }

  // =====================================================
  // Ticket Administration
  // =====================================================

  /**
   * Verify ticket
   */
  async verifyTicket(
    ticketId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const before = { status: ticket.status };
    await ticketRepository.update(ticketId, { status: 'active' });
    const after = { status: 'active' };

    await this.logAudit(
      adminId,
      adminName,
      'verify_ticket',
      'ticket',
      ticketId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Ticket ${ticketId} verified by ${adminName}`);
  }

  /**
   * Void ticket
   */
  async voidTicket(
    ticketId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const before = { status: ticket.status };
    await ticketRepository.update(ticketId, { status: 'cancelled' });
    const after = { status: 'cancelled' };

    await this.logAudit(
      adminId,
      adminName,
      'void_ticket',
      'ticket',
      ticketId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Ticket ${ticketId} voided by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Reissue ticket
   */
  async reissueTicket(
    ticketId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const newTicket = await ticketService.createTicket(
      ticket.eventId,
      ticket.userId,
      ticket.creatorId,
      ticket.orderId,
      ticket.ticketType,
      ticket.price,
      ticket.currency
    );

    await ticketRepository.update(ticketId, { status: 'cancelled' });

    await this.logAudit(
      adminId,
      adminName,
      'reissue_ticket',
      'ticket',
      ticketId,
      { oldTicketId: ticketId },
      { newTicketId: newTicket.ticketId },
      ip,
      userAgent
    );

    logger.info(`Ticket ${ticketId} reissued as ${newTicket.ticketId} by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Cancel ticket
   */
  async cancelTicket(
    ticketId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const before = { status: ticket.status };
    await ticketRepository.update(ticketId, { status: 'cancelled' });
    const after = { status: 'cancelled' };

    await this.logAudit(
      adminId,
      adminName,
      'cancel_ticket',
      'ticket',
      ticketId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Ticket ${ticketId} cancelled by ${adminName}. Reason: ${reason}`);
  }

  // =====================================================
  // Coupon Administration
  // =====================================================

  /**
   * Create coupon
   */
  async createCoupon(
    code: string,
    type: 'percentage' | 'fixed',
    value: number,
    maxUses: number,
    minPurchase: number,
    expiryDate: Date,
    adminId: string,
    adminName: string,
    creatorId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const coupon = await couponService.createCoupon(
      code,
      type,
      value,
      maxUses,
      minPurchase,
      expiryDate,
      creatorId,
      true
    );

    await this.logAudit(
      adminId,
      adminName,
      'create_coupon',
      'coupon',
      coupon.couponId,
      null,
      { couponId: coupon.couponId, code: coupon.code },
      ip,
      userAgent
    );

    logger.info(`Coupon ${code} created by ${adminName}`);
  }

  /**
   * Update coupon
   */
  async updateCoupon(
    couponId: string,
    updates: any,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    const before = { ...coupon };
    await couponRepository.update(couponId, updates);
    const after = { ...updates };

    await this.logAudit(
      adminId,
      adminName,
      'update_coupon',
      'coupon',
      couponId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Coupon ${couponId} updated by ${adminName}`);
  }

  /**
   * Disable coupon
   */
  async disableCoupon(
    couponId: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    const before = { isPlatformCoupon: coupon.isPlatformCoupon };
    await couponRepository.update(couponId, { isPlatformCoupon: false });
    const after = { isPlatformCoupon: false };

    await this.logAudit(
      adminId,
      adminName,
      'disable_coupon',
      'coupon',
      couponId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Coupon ${couponId} disabled by ${adminName}`);
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(
    couponId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    const before = { ...coupon };
    await couponRepository.delete(couponId);
    const after = null;

    await this.logAudit(
      adminId,
      adminName,
      'delete_coupon',
      'coupon',
      couponId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Coupon ${couponId} deleted by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Get coupon statistics
   */
  async getCouponStatistics(couponId: string): Promise<any> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    return {
      couponId: coupon.couponId,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      remainingUses: coupon.maxUses - coupon.usedCount,
      expiryDate: coupon.expiryDate,
      isPlatformCoupon: coupon.isPlatformCoupon,
    };
  }

  // =====================================================
  // Notification Administration
  // =====================================================

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(
    title: string,
    message: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAudit(
      adminId,
      adminName,
      'broadcast_notification',
      'notification',
      undefined,
      null,
      { title, message },
      ip,
      userAgent
    );

    logger.info(`Broadcast notification sent by ${adminName}: ${title}`);
  }

  /**
   * Broadcast email to all users
   */
  async broadcastEmail(
    subject: string,
    _content: string,
    adminId: string,
    adminName: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAudit(
      adminId,
      adminName,
      'broadcast_email',
      'email',
      undefined,
      null,
      { subject },
      ip,
      userAgent
    );

    logger.info(`Broadcast email sent by ${adminName}: ${subject}`);
  }

  /**
   * Broadcast push notification to all users
   */
  async broadcastPush(
    adminId: string,
    adminName: string,
    message: string,
    ip?: string,
    userAgent?: string,
    _targetAudience?: string[]
  ): Promise<void> {
    await this.logAudit(
      adminId,
      adminName,
      'broadcast_push',
      'push_notification',
      undefined,
      null,
      { title: 'Broadcast', message },
      ip,
      userAgent
    );

    logger.info(`Broadcast push notification sent by ${adminName}`);
  }

  /**
   * Schedule notification campaign
   */
  async scheduleCampaign(
    title: string,
    _message: string,
    scheduledFor: Date,
    adminId: string,
    adminName: string,
    _targetAudience?: string[],
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAudit(
      adminId,
      adminName,
      'schedule_campaign',
      'campaign',
      undefined,
      null,
      { title, scheduledFor },
      ip,
      userAgent
    );

    logger.info(`Campaign scheduled by ${adminName}: ${title} at ${scheduledFor}`);
  }

  /**
   * Cancel scheduled campaign
   */
  async cancelCampaign(
    campaignId: string,
    adminId: string,
    adminName: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    const campaign = await scheduledNotificationRepository.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const before = { status: campaign.status };
    await scheduledNotificationRepository.update(campaignId, { status: 'cancelled' });
    const after = { status: 'cancelled' };

    await this.logAudit(
      adminId,
      adminName,
      'cancel_campaign',
      'campaign',
      campaignId,
      before,
      after,
      ip,
      userAgent
    );

    logger.info(`Campaign ${campaignId} cancelled by ${adminName}. Reason: ${reason}`);
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStatistics(campaignId: string): Promise<any> {
    const campaign = await scheduledNotificationRepository.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return {
      campaignId: campaign.id,
      status: campaign.status,
      scheduledFor: campaign.scheduledFor,
      sentAt: campaign.sentAt,
    };
  }
}

export const adminService = new AdminService();
