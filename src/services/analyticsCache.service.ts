import { getCache, setCache, deleteCache, deleteCachePattern } from './redis';
import logger from '../utils/logger';

/**
 * Cache TTL Configuration (in seconds)
 */
export const CACHE_TTL = {
  PLATFORM_DASHBOARD: 300, // 5 minutes
  REVENUE_DASHBOARD: 300, // 5 minutes
  CREATOR_ANALYTICS: 600, // 10 minutes
  EVENT_ANALYTICS: 300, // 5 minutes
  STREAMING_ANALYTICS: 60, // 1 minute (real-time data)
  CHAT_ANALYTICS: 60, // 1 minute (real-time data)
  USER_ANALYTICS: 600, // 10 minutes
  TRENDS: 900, // 15 minutes
  EXPORT_METADATA: 3600, // 1 hour
  AGGREGATED_HOURLY: 3600, // 1 hour
  AGGREGATED_DAILY: 86400, // 24 hours
  AGGREGATED_WEEKLY: 604800, // 7 days
  AGGREGATED_MONTHLY: 2592000, // 30 days
  AGGREGATED_YEARLY: 31536000, // 365 days
};

/**
 * Cache Key Patterns
 */
const CACHE_KEYS = {
  PLATFORM_DASHBOARD: (date: string) => `analytics:platform:${date}`,
  REVENUE_DASHBOARD: (date: string) => `analytics:revenue:${date}`,
  CREATOR_ANALYTICS: (creatorId: string, date: string) => `analytics:creator:${creatorId}:${date}`,
  EVENT_ANALYTICS: (eventId: string, date: string) => `analytics:event:${eventId}:${date}`,
  STREAMING_ANALYTICS: (eventId: string, date: string) => `analytics:stream:${eventId}:${date}`,
  CHAT_ANALYTICS: (eventId: string, date: string) => `analytics:chat:${eventId}:${date}`,
  USER_ANALYTICS: (userId: string, date: string) => `analytics:user:${userId}:${date}`,
  TRENDS: (period: string) => `analytics:trends:${period}`,
  EXPORT_METADATA: (exportId: string) => `analytics:export:${exportId}`,
  AGGREGATED_HOURLY: (date: string, hour: number) => `analytics:agg:hourly:${date}:${hour}`,
  AGGREGATED_DAILY: (date: string) => `analytics:agg:daily:${date}`,
  AGGREGATED_WEEKLY: (year: number, week: number) => `analytics:agg:weekly:${year}:${week}`,
  AGGREGATED_MONTHLY: (year: number, month: number) => `analytics:agg:monthly:${year}:${month}`,
  AGGREGATED_YEARLY: (year: number) => `analytics:agg:yearly:${year}`,
};

/**
 * Analytics Cache Service
 * Handles caching for analytics data with proper TTLs and invalidation
 */
export class AnalyticsCacheService {
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Get with stats tracking
   */
  private async getWithStats(key: string): Promise<any | null> {
    const result = await getCache(key);
    if (result) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }
    return result;
  }

  /**
   * Set with stats tracking
   */
  private async setWithStats(key: string, data: any, ttl: number): Promise<void> {
    await setCache(key, data, ttl);
    this.cacheStats.sets++;
  }

  /**
   * Delete with stats tracking
   */
  private async deleteWithStats(key: string): Promise<void> {
    await deleteCache(key);
    this.cacheStats.deletes++;
  }
  /**
   * Get platform dashboard from cache
   */
  async getPlatformDashboard(date: string): Promise<any | null> {
    const key = CACHE_KEYS.PLATFORM_DASHBOARD(date);
    return this.getWithStats(key);
  }

  /**
   * Set platform dashboard in cache
   */
  async setPlatformDashboard(date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.PLATFORM_DASHBOARD(date);
    await this.setWithStats(key, data, CACHE_TTL.PLATFORM_DASHBOARD);
    logger.debug(`Cached platform dashboard for ${date}`);
  }

  /**
   * Invalidate platform dashboard cache
   */
  async invalidatePlatformDashboard(date: string): Promise<void> {
    const key = CACHE_KEYS.PLATFORM_DASHBOARD(date);
    await this.deleteWithStats(key);
    logger.debug(`Invalidated platform dashboard cache for ${date}`);
  }

  /**
   * Get revenue dashboard from cache
   */
  async getRevenueDashboard(date: string): Promise<any | null> {
    const key = CACHE_KEYS.REVENUE_DASHBOARD(date);
    return this.getWithStats(key);
  }

  /**
   * Set revenue dashboard in cache
   */
  async setRevenueDashboard(date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.REVENUE_DASHBOARD(date);
    await this.setWithStats(key, data, CACHE_TTL.REVENUE_DASHBOARD);
    logger.debug(`Cached revenue dashboard for ${date}`);
  }

  /**
   * Invalidate revenue dashboard cache
   */
  async invalidateRevenueDashboard(date: string): Promise<void> {
    const key = CACHE_KEYS.REVENUE_DASHBOARD(date);
    await this.deleteWithStats(key);
    logger.debug(`Invalidated revenue dashboard cache for ${date}`);
  }

  /**
   * Get creator analytics from cache
   */
  async getCreatorAnalytics(creatorId: string, date: string): Promise<any | null> {
    const key = CACHE_KEYS.CREATOR_ANALYTICS(creatorId, date);
    return this.getWithStats(key);
  }

  /**
   * Set creator analytics in cache
   */
  async setCreatorAnalytics(creatorId: string, date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.CREATOR_ANALYTICS(creatorId, date);
    await this.setWithStats(key, data, CACHE_TTL.CREATOR_ANALYTICS);
    logger.debug(`Cached creator analytics for ${creatorId} on ${date}`);
  }

  /**
   * Invalidate creator analytics cache
   */
  async invalidateCreatorAnalytics(creatorId: string): Promise<void> {
    const pattern = `analytics:creator:${creatorId}:*`;
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.debug(`Invalidated creator analytics cache for ${creatorId}`);
  }

  /**
   * Get event analytics from cache
   */
  async getEventAnalytics(eventId: string, date: string): Promise<any | null> {
    const key = CACHE_KEYS.EVENT_ANALYTICS(eventId, date);
    return this.getWithStats(key);
  }

  /**
   * Set event analytics in cache
   */
  async setEventAnalytics(eventId: string, date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.EVENT_ANALYTICS(eventId, date);
    await this.setWithStats(key, data, CACHE_TTL.EVENT_ANALYTICS);
    logger.debug(`Cached event analytics for ${eventId} on ${date}`);
  }

  /**
   * Invalidate event analytics cache
   */
  async invalidateEventAnalytics(eventId: string): Promise<void> {
    const pattern = `analytics:event:${eventId}:*`;
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.debug(`Invalidated event analytics cache for ${eventId}`);
  }

  /**
   * Get streaming analytics from cache
   */
  async getStreamingAnalytics(eventId: string, date: string): Promise<any | null> {
    const key = CACHE_KEYS.STREAMING_ANALYTICS(eventId, date);
    return this.getWithStats(key);
  }

  /**
   * Set streaming analytics in cache
   */
  async setStreamingAnalytics(eventId: string, date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.STREAMING_ANALYTICS(eventId, date);
    await this.setWithStats(key, data, CACHE_TTL.STREAMING_ANALYTICS);
    logger.debug(`Cached streaming analytics for ${eventId} on ${date}`);
  }

  /**
   * Invalidate streaming analytics cache
   */
  async invalidateStreamingAnalytics(eventId: string): Promise<void> {
    const pattern = `analytics:stream:${eventId}:*`;
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.debug(`Invalidated streaming analytics cache for ${eventId}`);
  }

  /**
   * Get chat analytics from cache
   */
  async getChatAnalytics(eventId: string, date: string): Promise<any | null> {
    const key = CACHE_KEYS.CHAT_ANALYTICS(eventId, date);
    return this.getWithStats(key);
  }

  /**
   * Set chat analytics in cache
   */
  async setChatAnalytics(eventId: string, date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.CHAT_ANALYTICS(eventId, date);
    await this.setWithStats(key, data, CACHE_TTL.CHAT_ANALYTICS);
    logger.debug(`Cached chat analytics for ${eventId} on ${date}`);
  }

  /**
   * Invalidate chat analytics cache
   */
  async invalidateChatAnalytics(eventId: string): Promise<void> {
    const pattern = `analytics:chat:${eventId}:*`;
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.debug(`Invalidated chat analytics cache for ${eventId}`);
  }

  /**
   * Get user analytics from cache
   */
  async getUserAnalytics(userId: string, date: string): Promise<any | null> {
    const key = CACHE_KEYS.USER_ANALYTICS(userId, date);
    return this.getWithStats(key);
  }

  /**
   * Set user analytics in cache
   */
  async setUserAnalytics(userId: string, date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.USER_ANALYTICS(userId, date);
    await this.setWithStats(key, data, CACHE_TTL.USER_ANALYTICS);
    logger.debug(`Cached user analytics for ${userId} on ${date}`);
  }

  /**
   * Invalidate user analytics cache
   */
  async invalidateUserAnalytics(userId: string): Promise<void> {
    const pattern = `analytics:user:${userId}:*`;
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.debug(`Invalidated user analytics cache for ${userId}`);
  }

  /**
   * Get trends from cache
   */
  async getTrends(period: string): Promise<any | null> {
    const key = CACHE_KEYS.TRENDS(period);
    return this.getWithStats(key);
  }

  /**
   * Set trends in cache
   */
  async setTrends(period: string, data: any): Promise<void> {
    const key = CACHE_KEYS.TRENDS(period);
    await this.setWithStats(key, data, CACHE_TTL.TRENDS);
    logger.debug(`Cached trends for period ${period}`);
  }

  /**
   * Invalidate trends cache
   */
  async invalidateTrends(): Promise<void> {
    const pattern = 'analytics:trends:*';
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.debug('Invalidated trends cache');
  }

  /**
   * Get export metadata from cache
   */
  async getExportMetadata(exportId: string): Promise<any | null> {
    const key = CACHE_KEYS.EXPORT_METADATA(exportId);
    return this.getWithStats(key);
  }

  /**
   * Set export metadata in cache
   */
  async setExportMetadata(exportId: string, data: any): Promise<void> {
    const key = CACHE_KEYS.EXPORT_METADATA(exportId);
    await this.setWithStats(key, data, CACHE_TTL.EXPORT_METADATA);
    logger.debug(`Cached export metadata for ${exportId}`);
  }

  /**
   * Invalidate export metadata cache
   */
  async invalidateExportMetadata(exportId: string): Promise<void> {
    const key = CACHE_KEYS.EXPORT_METADATA(exportId);
    await this.deleteWithStats(key);
    logger.debug(`Invalidated export metadata cache for ${exportId}`);
  }

  /**
   * Get aggregated hourly data from cache
   */
  async getAggregatedHourly(date: string, hour: number): Promise<any | null> {
    const key = CACHE_KEYS.AGGREGATED_HOURLY(date, hour);
    return this.getWithStats(key);
  }

  /**
   * Set aggregated hourly data in cache
   */
  async setAggregatedHourly(date: string, hour: number, data: any): Promise<void> {
    const key = CACHE_KEYS.AGGREGATED_HOURLY(date, hour);
    await this.setWithStats(key, data, CACHE_TTL.AGGREGATED_HOURLY);
    logger.debug(`Cached hourly aggregation for ${date} hour ${hour}`);
  }

  /**
   * Get aggregated daily data from cache
   */
  async getAggregatedDaily(date: string): Promise<any | null> {
    const key = CACHE_KEYS.AGGREGATED_DAILY(date);
    return this.getWithStats(key);
  }

  /**
   * Set aggregated daily data in cache
   */
  async setAggregatedDaily(date: string, data: any): Promise<void> {
    const key = CACHE_KEYS.AGGREGATED_DAILY(date);
    await this.setWithStats(key, data, CACHE_TTL.AGGREGATED_DAILY);
    logger.debug(`Cached daily aggregation for ${date}`);
  }

  /**
   * Invalidate daily aggregation cache
   */
  async invalidateAggregatedDaily(date: string): Promise<void> {
    const key = CACHE_KEYS.AGGREGATED_DAILY(date);
    await this.deleteWithStats(key);
    logger.debug(`Invalidated daily aggregation cache for ${date}`);
  }

  /**
   * Get aggregated weekly data from cache
   */
  async getAggregatedWeekly(year: number, week: number): Promise<any | null> {
    const key = CACHE_KEYS.AGGREGATED_WEEKLY(year, week);
    return this.getWithStats(key);
  }

  /**
   * Set aggregated weekly data in cache
   */
  async setAggregatedWeekly(year: number, week: number, data: any): Promise<void> {
    const key = CACHE_KEYS.AGGREGATED_WEEKLY(year, week);
    await this.setWithStats(key, data, CACHE_TTL.AGGREGATED_WEEKLY);
    logger.debug(`Cached weekly aggregation for ${year} week ${week}`);
  }

  /**
   * Get aggregated monthly data from cache
   */
  async getAggregatedMonthly(year: number, month: number): Promise<any | null> {
    const key = CACHE_KEYS.AGGREGATED_MONTHLY(year, month);
    return this.getWithStats(key);
  }

  /**
   * Set aggregated monthly data in cache
   */
  async setAggregatedMonthly(year: number, month: number, data: any): Promise<void> {
    const key = CACHE_KEYS.AGGREGATED_MONTHLY(year, month);
    await this.setWithStats(key, data, CACHE_TTL.AGGREGATED_MONTHLY);
    logger.debug(`Cached monthly aggregation for ${year}-${month}`);
  }

  /**
   * Get aggregated yearly data from cache
   */
  async getAggregatedYearly(year: number): Promise<any | null> {
    const key = CACHE_KEYS.AGGREGATED_YEARLY(year);
    return this.getWithStats(key);
  }

  /**
   * Set aggregated yearly data in cache
   */
  async setAggregatedYearly(year: number, data: any): Promise<void> {
    const key = CACHE_KEYS.AGGREGATED_YEARLY(year);
    await this.setWithStats(key, data, CACHE_TTL.AGGREGATED_YEARLY);
    logger.debug(`Cached yearly aggregation for ${year}`);
  }

  /**
   * Invalidate all analytics cache for a specific entity
   */
  async invalidateAllForEntity(entityType: 'creator' | 'event' | 'user', entityId: string): Promise<void> {
    switch (entityType) {
      case 'creator':
        await this.invalidateCreatorAnalytics(entityId);
        break;
      case 'event':
        await this.invalidateEventAnalytics(entityId);
        await this.invalidateStreamingAnalytics(entityId);
        await this.invalidateChatAnalytics(entityId);
        break;
      case 'user':
        await this.invalidateUserAnalytics(entityId);
        break;
    }
  }

  /**
   * Invalidate all analytics cache (use with caution)
   */
  async invalidateAll(): Promise<void> {
    const pattern = 'analytics:*';
    await deleteCachePattern(pattern);
    this.cacheStats.deletes++;
    logger.warn('Invalidated all analytics cache');
  }
}

export const analyticsCacheService = new AnalyticsCacheService();
