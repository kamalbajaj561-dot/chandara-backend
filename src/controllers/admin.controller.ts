import { Request, Response } from 'express';
import { adminDashboardService } from '../services/adminDashboard.service';
import { adminService } from '../services/admin.service';
import { adminSearchService } from '../services/adminSearch.service';
import { adminExportService } from '../services/adminExport.service';
import { maintenanceRepository } from '../repositories/maintenance.repository';
import { featureFlagRepository } from '../repositories/featureFlag.repository';
import { systemSettingsRepository } from '../repositories/systemSettings.repository';
import { auditRepository } from '../repositories/audit.repository';
import logger from '../utils/logger';

/**
 * Admin Controller
 * Handles all admin API endpoints
 */
export class AdminController {
  /**
   * Get admin dashboard
   * GET /admin/dashboard
   */
  async getDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const dashboard = await adminDashboardService.getDashboard();
      res.json(dashboard);
    } catch (error) {
      logger.error('Error getting admin dashboard:', error);
      res.status(500).json({ error: 'Failed to get dashboard' });
    }
  }

  /**
   * Get platform health
   * GET /admin/health
   */
  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const health = await adminDashboardService.getPlatformHealth();
      res.json(health);
    } catch (error) {
      logger.error('Error getting platform health:', error);
      res.status(500).json({ error: 'Failed to get health status' });
    }
  }

  /**
   * Search users
   * GET /admin/users/search
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { query, page = '1', pageSize = '20' } = req.query;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query parameter is required' });
        return;
      }

      const results = await adminService.searchUsers(
        query,
        parseInt(page as string),
        parseInt(pageSize as string)
      );
      res.json(results);
    } catch (error) {
      logger.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  }

  /**
   * Suspend user
   * POST /admin/users/:userId/suspend
   */
  async suspendUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.suspendUser(userId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error suspending user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to suspend user' });
    }
  }

  /**
   * Ban user
   * POST /admin/users/:userId/ban
   */
  async banUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.banUser(userId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error banning user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to ban user' });
    }
  }

  /**
   * Unban user
   * POST /admin/users/:userId/unban
   */
  async unbanUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.unbanUser(userId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error unbanning user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to unban user' });
    }
  }

  /**
   * Verify user
   * POST /admin/users/:userId/verify
   */
  async verifyUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.verifyUser(userId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error verifying user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to verify user' });
    }
  }

  /**
   * Change user role
   * POST /admin/users/:userId/role
   */
  async changeUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!role || !['viewer', 'creator', 'administrator'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      await adminService.changeUserRole(userId, role, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error changing user role:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to change user role' });
    }
  }

  /**
   * Approve creator
   * POST /admin/creators/:creatorId/approve
   */
  async approveCreator(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.approveCreator(creatorId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error approving creator:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve creator' });
    }
  }

  /**
   * Reject creator
   * POST /admin/creators/:creatorId/reject
   */
  async rejectCreator(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.rejectCreator(creatorId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error rejecting creator:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to reject creator' });
    }
  }

  /**
   * Feature creator
   * POST /admin/creators/:creatorId/feature
   */
  async featureCreator(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.featureCreator(creatorId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error featuring creator:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to feature creator' });
    }
  }

  /**
   * Unfeature creator
   * POST /admin/creators/:creatorId/unfeature
   */
  async unfeatureCreator(req: Request, res: Response): Promise<void> {
    try {
      const { creatorId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.unfeatureCreator(creatorId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error unfeaturing creator:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to unfeature creator' });
    }
  }

  /**
   * Get feature flags
   * GET /admin/feature-flags
   */
  async getFeatureFlags(_req: Request, res: Response): Promise<void> {
    try {
      const flags = await featureFlagRepository.getAll();
      res.json(flags);
    } catch (error) {
      logger.error('Error getting feature flags:', error);
      res.status(500).json({ error: 'Failed to get feature flags' });
    }
  }

  /**
   * Enable feature flag
   * POST /admin/feature-flags/:flagId/enable
   */
  async enableFeatureFlag(req: Request, res: Response): Promise<void> {
    try {
      const { flagId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.enableFeatureFlag(flagId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error enabling feature flag:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to enable feature flag' });
    }
  }

  /**
   * Disable feature flag
   * POST /admin/feature-flags/:flagId/disable
   */
  async disableFeatureFlag(req: Request, res: Response): Promise<void> {
    try {
      const { flagId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.disableFeatureFlag(flagId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error disabling feature flag:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to disable feature flag' });
    }
  }

  /**
   * Get system settings
   * GET /admin/settings
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      
      if (category && typeof category === 'string') {
        const settings = await systemSettingsRepository.getByCategory(
          category as any
        );
        res.json(settings);
      } else {
        const settings = await systemSettingsRepository.getAll();
        res.json(settings);
      }
    } catch (error) {
      logger.error('Error getting settings:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  /**
   * Update system setting
   * PUT /admin/settings
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
    try {
      const { key, value, category, description } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!key || value === undefined || !category) {
        res.status(400).json({ error: 'key, value, and category are required' });
        return;
      }

      await adminService.updateSetting(
        key,
        value,
        category,
        adminId,
        adminName,
        description,
        ip,
        userAgent
      );
      res.json({ success: true });
    } catch (error) {
      logger.error('Error updating setting:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update setting' });
    }
  }

  /**
   * Get maintenance mode status
   * GET /admin/maintenance
   */
  async getMaintenanceMode(_req: Request, res: Response): Promise<void> {
    try {
      const maintenance = await maintenanceRepository.getCurrent();
      res.json(maintenance);
    } catch (error) {
      logger.error('Error getting maintenance mode:', error);
      res.status(500).json({ error: 'Failed to get maintenance mode' });
    }
  }

  /**
   * Enable maintenance mode
   * POST /admin/maintenance/enable
   */
  async enableMaintenanceMode(req: Request, res: Response): Promise<void> {
    try {
      const { message, estimatedEndTime, whitelistedAdmins, whitelistedIps } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.enableMaintenanceMode(
        message,
        adminId,
        adminName,
        estimatedEndTime ? new Date(estimatedEndTime) : undefined,
        whitelistedAdmins || [],
        whitelistedIps,
        ip,
        userAgent
      );
      res.json({ success: true });
    } catch (error) {
      logger.error('Error enabling maintenance mode:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to enable maintenance mode' });
    }
  }

  /**
   * Disable maintenance mode
   * POST /admin/maintenance/disable
   */
  async disableMaintenanceMode(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.disableMaintenanceMode(adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error disabling maintenance mode:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to disable maintenance mode' });
    }
  }

  /**
   * Get audit logs
   * GET /admin/audit
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', pageSize = '50', adminId, action, target, startDate, endDate } = req.query;

      const filters: any = {};
      if (adminId && typeof adminId === 'string') filters.adminId = adminId;
      if (action && typeof action === 'string') filters.action = action;
      if (target && typeof target === 'string') filters.target = target;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const logs = await auditRepository.getPaginated(
        parseInt(page as string),
        parseInt(pageSize as string),
        filters
      );
      res.json(logs);
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  }

  /**
   * Global admin search
   * GET /admin/search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit = '50', type } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query parameter is required' });
        return;
      }

      if (type && typeof type === 'string') {
        const results = await adminSearchService.searchByType(
          type as any,
          query,
          parseInt(limit as string)
        );
        res.json(results);
      } else {
        const results = await adminSearchService.search(
          query,
          parseInt(limit as string)
        );
        res.json(results);
      }
    } catch (error) {
      logger.error('Error performing search:', error);
      res.status(500).json({ error: 'Failed to perform search' });
    }
  }

  /**
   * Create export job
   * POST /admin/export
   */
  async createExport(req: Request, res: Response): Promise<void> {
    try {
      const { type, format, filters } = req.body;
      const requestedBy = (req.user as any)?.id;

      if (!type || !format) {
        res.status(400).json({ error: 'type and format are required' });
        return;
      }

      const exportId = await adminExportService.createExport(
        type,
        format,
        filters || {},
        requestedBy
      );
      res.json({ exportId });
    } catch (error) {
      logger.error('Error creating export:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create export' });
    }
  }

  /**
   * Get export status
   * GET /admin/export/:id
   */
  async getExportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const exportJob = await adminExportService.getExportStatus(id);
      
      if (!exportJob) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      res.json(exportJob);
    } catch (error) {
      logger.error('Error getting export status:', error);
      res.status(500).json({ error: 'Failed to get export status' });
    }
  }

  // =====================================================
  // Event Moderation
  // =====================================================

  /**
   * Approve event
   * POST /admin/events/:eventId/approve
   */
  async approveEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.approveEvent(eventId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error approving event:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve event' });
    }
  }

  /**
   * Reject event
   * POST /admin/events/:eventId/reject
   */
  async rejectEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.rejectEvent(eventId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error rejecting event:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to reject event' });
    }
  }

  /**
   * Feature event
   * POST /admin/events/:eventId/feature
   */
  async featureEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.featureEvent(eventId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error featuring event:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to feature event' });
    }
  }

  /**
   * Unfeature event
   * POST /admin/events/:eventId/unfeature
   */
  async unfeatureEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.unfeatureEvent(eventId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error unfeaturing event:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to unfeature event' });
    }
  }

  /**
   * Cancel event
   * POST /admin/events/:eventId/cancel
   */
  async cancelEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.cancelEvent(eventId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error cancelling event:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cancel event' });
    }
  }

  /**
   * Delete event
   * DELETE /admin/events/:eventId
   */
  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.deleteEvent(eventId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting event:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete event' });
    }
  }

  // =====================================================
  // Stream Moderation
  // =====================================================

  /**
   * Force stop stream
   * POST /admin/streams/:streamId/stop
   */
  async forceStopStream(req: Request, res: Response): Promise<void> {
    try {
      const { streamId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.forceStopStream(streamId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error force stopping stream:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to stop stream' });
    }
  }

  /**
   * Mute stream chat
   * POST /admin/events/:eventId/chat/mute
   */
  async muteStreamChat(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.muteStreamChat(eventId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error muting stream chat:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mute chat' });
    }
  }

  /**
   * Enable stream chat
   * POST /admin/events/:eventId/chat/enable
   */
  async enableStreamChat(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.enableStreamChat(eventId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error enabling stream chat:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to enable chat' });
    }
  }

  /**
   * Remove stream
   * DELETE /admin/streams/:streamId
   */
  async removeStream(req: Request, res: Response): Promise<void> {
    try {
      const { streamId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.removeStream(streamId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error removing stream:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove stream' });
    }
  }

  /**
   * Disconnect publisher
   * POST /admin/streams/:streamId/disconnect
   */
  async disconnectPublisher(req: Request, res: Response): Promise<void> {
    try {
      const { streamId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.disconnectPublisher(streamId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error disconnecting publisher:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to disconnect publisher' });
    }
  }

  // =====================================================
  // Chat Moderation
  // =====================================================

  /**
   * Delete chat message
   * DELETE /admin/chat/messages/:messageId
   */
  async deleteChatMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.deleteChatMessage(messageId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting chat message:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete message' });
    }
  }

  /**
   * Mute chat user
   * POST /admin/events/:eventId/chat/users/:userId/mute
   */
  async muteChatUser(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, userId } = req.params;
      const { duration, reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!duration || !reason) {
        res.status(400).json({ error: 'Duration and reason are required' });
        return;
      }

      await adminService.muteChatUser(eventId, userId, duration, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error muting chat user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mute user' });
    }
  }

  /**
   * Ban chat user
   * POST /admin/events/:eventId/chat/users/:userId/ban
   */
  async banChatUser(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, userId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.banChatUser(eventId, userId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error banning chat user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to ban user' });
    }
  }

  /**
   * Shadow ban user
   * POST /admin/events/:eventId/chat/users/:userId/shadow-ban
   */
  async shadowBanUser(req: Request, res: Response): Promise<void> {
    try {
      const { eventId, userId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.shadowBanUser(eventId, userId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error shadow banning user:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to shadow ban user' });
    }
  }

  /**
   * Add moderator note
   * POST /admin/moderator-notes
   */
  async addModeratorNote(req: Request, res: Response): Promise<void> {
    try {
      const { targetId, targetType, note } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!targetId || !targetType || !note) {
        res.status(400).json({ error: 'targetId, targetType, and note are required' });
        return;
      }

      if (!['user', 'creator', 'event', 'chat_message'].includes(targetType)) {
        res.status(400).json({ error: 'Invalid targetType' });
        return;
      }

      await adminService.addModeratorNote(targetId, targetType, note, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error adding moderator note:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add note' });
    }
  }

  // =====================================================
  // Payment Administration
  // =====================================================

  /**
   * Approve refund
   * POST /admin/refunds/:refundId/approve
   */
  async approveRefund(req: Request, res: Response): Promise<void> {
    try {
      const { refundId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.approveRefund(refundId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error approving refund:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve refund' });
    }
  }

  /**
   * Reject refund
   * POST /admin/refunds/:refundId/reject
   */
  async rejectRefund(req: Request, res: Response): Promise<void> {
    try {
      const { refundId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.rejectRefund(refundId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error rejecting refund:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to reject refund' });
    }
  }

  /**
   * Retry payment
   * POST /admin/payments/:paymentId/retry
   */
  async retryPayment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.retryPayment(paymentId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error retrying payment:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retry payment' });
    }
  }

  /**
   * Mark payment as failed
   * POST /admin/payments/:paymentId/failed
   */
  async markPaymentFailed(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.markPaymentFailed(paymentId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error marking payment as failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to mark payment as failed' });
    }
  }

  /**
   * Manual payment adjustment
   * POST /admin/payments/:paymentId/adjust
   */
  async manualPaymentAdjustment(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { adjustmentAmount, reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (adjustmentAmount === undefined || !reason) {
        res.status(400).json({ error: 'adjustmentAmount and reason are required' });
        return;
      }

      await adminService.manualPaymentAdjustment(paymentId, adjustmentAmount, reason, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error adjusting payment:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to adjust payment' });
    }
  }

  // =====================================================
  // Ticket Administration
  // =====================================================

  /**
   * Verify ticket
   * POST /admin/tickets/:ticketId/verify
   */
  async verifyTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.verifyTicket(ticketId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error verifying ticket:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to verify ticket' });
    }
  }

  /**
   * Void ticket
   * POST /admin/tickets/:ticketId/void
   */
  async voidTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.voidTicket(ticketId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error voiding ticket:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to void ticket' });
    }
  }

  /**
   * Reissue ticket
   * POST /admin/tickets/:ticketId/reissue
   */
  async reissueTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.reissueTicket(ticketId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error reissuing ticket:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to reissue ticket' });
    }
  }

  /**
   * Cancel ticket
   * POST /admin/tickets/:ticketId/cancel
   */
  async cancelTicket(req: Request, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.cancelTicket(ticketId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error cancelling ticket:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cancel ticket' });
    }
  }

  // =====================================================
  // Coupon Administration
  // =====================================================

  /**
   * Create coupon
   * POST /admin/coupons
   */
  async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { code, type, value, maxUses, minPurchase, expiryDate, creatorId } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!code || !type || value === undefined || !maxUses || minPurchase === undefined || !expiryDate) {
        res.status(400).json({ error: 'code, type, value, maxUses, minPurchase, and expiryDate are required' });
        return;
      }

      if (!['percentage', 'fixed'].includes(type)) {
        res.status(400).json({ error: 'Invalid coupon type' });
        return;
      }

      await adminService.createCoupon(
        code,
        type,
        value,
        maxUses,
        minPurchase,
        new Date(expiryDate),
        adminId,
        adminName,
        creatorId,
        ip,
        userAgent
      );
      res.json({ success: true });
    } catch (error) {
      logger.error('Error creating coupon:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create coupon' });
    }
  }

  /**
   * Update coupon
   * PUT /admin/coupons/:couponId
   */
  async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { couponId } = req.params;
      const updates = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.updateCoupon(couponId, updates, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error updating coupon:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update coupon' });
    }
  }

  /**
   * Disable coupon
   * POST /admin/coupons/:couponId/disable
   */
  async disableCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { couponId } = req.params;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      await adminService.disableCoupon(couponId, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error disabling coupon:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to disable coupon' });
    }
  }

  /**
   * Delete coupon
   * DELETE /admin/coupons/:couponId
   */
  async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { couponId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.deleteCoupon(couponId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting coupon:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete coupon' });
    }
  }

  /**
   * Get coupon statistics
   * GET /admin/coupons/:couponId/statistics
   */
  async getCouponStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { couponId } = req.params;
      const stats = await adminService.getCouponStatistics(couponId);
      res.json(stats);
    } catch (error) {
      logger.error('Error getting coupon statistics:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get coupon statistics' });
    }
  }

  // =====================================================
  // Notification Administration
  // =====================================================

  /**
   * Broadcast notification
   * POST /admin/notifications/broadcast
   */
  async broadcastNotification(req: Request, res: Response): Promise<void> {
    try {
      const { title, message } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!title || !message) {
        res.status(400).json({ error: 'title and message are required' });
        return;
      }

      await adminService.broadcastNotification(title, message, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error broadcasting notification:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to broadcast notification' });
    }
  }

  /**
   * Broadcast email
   * POST /admin/notifications/broadcast/email
   */
  async broadcastEmail(req: Request, res: Response): Promise<void> {
    try {
      const { subject, content } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!subject || !content) {
        res.status(400).json({ error: 'subject and content are required' });
        return;
      }

      await adminService.broadcastEmail(subject, content, adminId, adminName, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error broadcasting email:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to broadcast email' });
    }
  }

  /**
   * Broadcast push notification
   * POST /admin/notifications/broadcast/push
   */
  async broadcastPush(req: Request, res: Response): Promise<void> {
    try {
      const { title, message } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!title || !message) {
        res.status(400).json({ error: 'title and message are required' });
        return;
      }

      await adminService.broadcastPush(adminId, adminName, message, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error broadcasting push notification:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to broadcast push notification' });
    }
  }

  /**
   * Schedule campaign
   * POST /admin/campaigns
   */
  async scheduleCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, scheduledFor, targetAudience } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!title || !message || !scheduledFor) {
        res.status(400).json({ error: 'title, message, and scheduledFor are required' });
        return;
      }

      await adminService.scheduleCampaign(
        title,
        message,
        new Date(scheduledFor),
        adminId,
        adminName,
        targetAudience,
        ip,
        userAgent
      );
      res.json({ success: true });
    } catch (error) {
      logger.error('Error scheduling campaign:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to schedule campaign' });
    }
  }

  /**
   * Cancel campaign
   * POST /admin/campaigns/:campaignId/cancel
   */
  async cancelCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId } = req.params;
      const { reason } = req.body;
      const adminId = (req.user as any)?.id;
      const adminName = (req.user as any)?.displayName || (req.user as any)?.email || 'Admin';
      const ip = req.ip;
      const userAgent = req.get('user-agent');

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      await adminService.cancelCampaign(campaignId, adminId, adminName, reason, ip, userAgent);
      res.json({ success: true });
    } catch (error) {
      logger.error('Error cancelling campaign:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to cancel campaign' });
    }
  }

  /**
   * Get delivery statistics
   * GET /admin/campaigns/:campaignId/statistics
   */
  async getDeliveryStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId } = req.params;
      const stats = await adminService.getDeliveryStatistics(campaignId);
      res.json(stats);
    } catch (error) {
      logger.error('Error getting delivery statistics:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get delivery statistics' });
    }
  }
}

export const adminController = new AdminController();
