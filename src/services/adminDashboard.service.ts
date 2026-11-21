import { platformAnalyticsRepository } from '../repositories/platformAnalytics.repository';
import { revenueAnalyticsRepository } from '../repositories/revenueAnalytics.repository';
import { auditRepository } from '../repositories/audit.repository';
import { UserRepository } from '../repositories/user.repository';
import { schedulerService } from './scheduler.service';
import { getCache, setCache, deleteCache } from './redis';
import { AdminDashboard, DashboardSummary, PlatformHealth, ServiceHealth, WorkerHealth, SystemHealth, RecentActivity, AdminAlert } from '../types';
import logger from '../utils/logger';
import os from 'os';

/**
 * Admin Dashboard Service
 * Provides comprehensive dashboard data for admin panel
 */
export class AdminDashboardService {
  private cacheTTL = 300; // 5 minutes
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
    };
  }

  /**
   * Get complete admin dashboard
   */
  async getDashboard(): Promise<AdminDashboard> {
    const cacheKey = 'admin:dashboard:summary';
    const cachedResult = await getCache<AdminDashboard>(cacheKey);
    
    if (cachedResult.data) {
      this.cacheStats.hits++;
      return cachedResult.data;
    }

    this.cacheStats.misses++;

    const [summary, platformHealth, recentActivity, alerts] = await Promise.all([
      this.getDashboardSummary(),
      this.getPlatformHealth(),
      this.getRecentActivity(),
      this.getAlerts(),
    ]);

    const dashboard: AdminDashboard = {
      summary,
      platformHealth,
      recentActivity,
      alerts,
    };

    await setCache(cacheKey, dashboard, this.cacheTTL);
    this.cacheStats.sets++;
    return dashboard;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [platformStats, revenueStats] = await Promise.all([
      platformAnalyticsRepository.getLatest(),
      revenueAnalyticsRepository.getStatistics(monthStart, now),
    ]);

    const totalRevenue = platformStats?.totalRevenue || 0;
    const monthlyRevenue = revenueStats?.totalGrossRevenue || 0;

    // Placeholder values for repositories that need count methods
    const totalUsers = platformStats?.totalUsers || 0;
    const activeUsers = platformStats?.activeUsers || 0;
    const totalCreators = platformStats?.totalCreators || 0;
    const activeCreators = platformStats?.activeCreators || 0;
    const totalEvents = platformStats?.totalEvents || 0;
    const liveEvents = platformStats?.activeEvents || 0;
    const totalTickets = platformStats?.totalTicketsSold || 0;
    const monthlyTickets = 0; // Placeholder
    const totalStreams = 0; // Placeholder
    const activeStreams = 0; // Placeholder
    const totalMessages = 0; // Placeholder
    const pendingReports = 0; // Placeholder
    const pendingVerifications = 0; // Placeholder

    // Determine system status based on health checks
    const systemStatus = await this.determineSystemStatus();

    return {
      totalUsers,
      activeUsers,
      totalCreators,
      activeCreators,
      totalEvents,
      liveEvents,
      totalRevenue,
      monthlyRevenue,
      totalTickets,
      monthlyTickets,
      totalStreams,
      activeStreams,
      totalMessages,
      pendingReports,
      pendingVerifications,
      systemStatus,
    };
  }

  /**
   * Get platform health
   */
  async getPlatformHealth(): Promise<PlatformHealth> {
    const cacheKey = 'admin:dashboard:health';
    const cachedResult = await getCache<PlatformHealth>(cacheKey);
    
    if (cachedResult.data) {
      return cachedResult.data;
    }

    const [
      firestore,
      redis,
      livekit,
      queue,
      scheduler,
      email,
      push,
      workers,
      system,
    ] = await Promise.all([
      this.checkFirestore(),
      this.checkRedis(),
      this.checkLiveKit(),
      this.checkQueue(),
      this.checkScheduler(),
      this.checkEmail(),
      this.checkPush(),
      this.getWorkerHealth(),
      this.getSystemHealth(),
    ]);

    const health: PlatformHealth = {
      firestore,
      redis,
      livekit,
      queue,
      scheduler,
      email,
      push,
      workers,
      system,
    };

    await setCache(cacheKey, health, 60); // Cache for 1 minute
    return health;
  }

  /**
   * Get recent admin activity
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    const cacheKey = 'admin:dashboard:activity';
    const cachedResult = await getCache<RecentActivity[]>(cacheKey);
    
    if (cachedResult.data) {
      return cachedResult.data;
    }

    const auditLogs = await auditRepository.getPaginated(1, limit);
    
    const activity: RecentActivity[] = auditLogs.logs.map(log => ({
      id: log.id,
      type: this.inferActivityType(log.target),
      action: log.action,
      description: this.formatActivityDescription(log),
      targetId: log.targetId,
      targetName: log.targetId,
      adminId: log.adminId,
      adminName: log.adminName,
      timestamp: log.timestamp,
    }));

    await setCache(cacheKey, activity, this.cacheTTL);
    return activity;
  }

  /**
   * Get admin alerts
   */
  async getAlerts(): Promise<AdminAlert[]> {
    const cacheKey = 'admin:dashboard:alerts';
    const cachedResult = await getCache<AdminAlert[]>(cacheKey);
    
    if (cachedResult.data) {
      return cachedResult.data;
    }

    const alerts: AdminAlert[] = [];
    const health = await this.getPlatformHealth();
    const summary = await this.getDashboardSummary();

    // Check for critical health issues
    if (health.firestore.status === 'down') {
      alerts.push({
        id: 'alert_firestore_down',
        type: 'critical',
        title: 'Firestore Down',
        message: 'Firestore database is not responding',
        source: 'system',
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    if (health.redis.status === 'down') {
      alerts.push({
        id: 'alert_redis_down',
        type: 'critical',
        title: 'Redis Down',
        message: 'Redis cache is not responding',
        source: 'system',
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Check for high pending reports
    if (summary.pendingReports > 50) {
      alerts.push({
        id: 'alert_high_reports',
        type: 'warning',
        title: 'High Pending Reports',
        message: `${summary.pendingReports} reports pending review`,
        source: 'moderation',
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Check for pending verifications
    if (summary.pendingVerifications > 20) {
      alerts.push({
        id: 'alert_pending_verifications',
        type: 'info',
        title: 'Pending Verifications',
        message: `${summary.pendingVerifications} creator verifications pending`,
        source: 'creators',
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Check system resources
    if (health.system.cpu > 80) {
      alerts.push({
        id: 'alert_high_cpu',
        type: 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is at ${health.system.cpu}%`,
        source: 'system',
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    if (health.system.memory > 80) {
      alerts.push({
        id: 'alert_high_memory',
        type: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is at ${health.system.memory}%`,
        source: 'system',
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    await setCache(cacheKey, alerts, 60); // Cache for 1 minute
    return alerts;
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateCache(): Promise<void> {
    await Promise.all([
      deleteCache('admin:dashboard:summary'),
      deleteCache('admin:dashboard:health'),
      deleteCache('admin:dashboard:activity'),
      deleteCache('admin:dashboard:alerts'),
    ]);
    logger.debug('Admin dashboard cache invalidated');
  }

  // =====================================================
  // Health Check Methods
  // =====================================================

  private async checkFirestore(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await UserRepository.listUsers({ limit: 1 });
      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date(),
        errorRate: 100,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await getCache('health_check');
      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date(),
        errorRate: 100,
      };
    }
  }

  private async checkLiveKit(): Promise<ServiceHealth> {
    // Placeholder - would check LiveKit connection
    return {
      status: 'healthy',
      lastCheck: new Date(),
    };
  }

  private async checkQueue(): Promise<ServiceHealth> {
    try {
      await schedulerService.getSchedulerStatistics();
      return {
        status: 'healthy',
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        lastCheck: new Date(),
        errorRate: 50,
      };
    }
  }

  private async checkScheduler(): Promise<ServiceHealth> {
    try {
      await schedulerService.getSchedulerStatistics();
      return {
        status: 'healthy',
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        lastCheck: new Date(),
        errorRate: 50,
      };
    }
  }

  private async checkEmail(): Promise<ServiceHealth> {
    // Placeholder - would check email service
    return {
      status: 'healthy',
      lastCheck: new Date(),
    };
  }

  private async checkPush(): Promise<ServiceHealth> {
    // Placeholder - would check push notification service
    return {
      status: 'healthy',
      lastCheck: new Date(),
    };
  }

  private async getWorkerHealth(): Promise<WorkerHealth[]> {
    // Placeholder - would return actual worker health
    return [
      {
        id: 'worker_1',
        type: 'analytics',
        status: 'active',
        jobsProcessed: 1000,
        jobsFailed: 5,
        lastActivity: new Date(),
      },
    ];
  }

  private async getSystemHealth(): Promise<SystemHealth> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    return {
      cpu: loadAverage[0] * 100 / cpus.length,
      memory: memoryPercent,
      disk: 0, // Would check actual disk usage
      uptime: os.uptime(),
      loadAverage: loadAverage.map(l => l * 100 / cpus.length),
    };
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  private async determineSystemStatus(): Promise<'healthy' | 'degraded' | 'critical'> {
    const health = await this.getPlatformHealth();
    
    const criticalCount = Object.values(health).filter(
      (h): h is ServiceHealth => 'status' in h && h.status === 'down'
    ).length;

    const degradedCount = Object.values(health).filter(
      (h): h is ServiceHealth => 'status' in h && h.status === 'degraded'
    ).length;

    if (criticalCount > 0) return 'critical';
    if (degradedCount > 2) return 'degraded';
    return 'healthy';
  }

  private inferActivityType(target: string): RecentActivity['type'] {
    if (target.includes('user')) return 'user';
    if (target.includes('creator')) return 'creator';
    if (target.includes('event')) return 'event';
    if (target.includes('payment')) return 'payment';
    if (target.includes('report')) return 'report';
    return 'user';
  }

  private formatActivityDescription(log: any): string {
    return `${log.action} on ${log.target}${log.targetId ? ` (${log.targetId})` : ''}`;
  }
}

export const adminDashboardService = new AdminDashboardService();
