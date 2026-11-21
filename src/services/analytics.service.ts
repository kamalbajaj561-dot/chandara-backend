import { analyticsRepository } from '../repositories/analytics.repository';
import { revenueAnalyticsRepository } from '../repositories/revenueAnalytics.repository';
import { creatorAnalyticsRepository } from '../repositories/creatorAnalytics.repository';
import { platformAnalyticsRepository } from '../repositories/platformAnalytics.repository';
import { analyticsCacheService } from './analyticsCache.service';
import { analyticsAggregationService } from './analyticsAggregation.service';
import logger from '../utils/logger';

/**
 * Analytics Service
 * Handles event tracking and analytics aggregation
 * Uses adapter pattern for extensibility
 */
export class AnalyticsService {
  private metricCollectors: Map<string, (data: any) => Promise<void>> = new Map();

  constructor() {
    this.initializeCollectors();
  }

  /**
   * Initialize metric collectors
   * Allows adding new metrics without changing existing code
   */
  private initializeCollectors(): void {
    this.metricCollectors.set('page_view', this.trackPageView.bind(this));
    this.metricCollectors.set('ticket_purchase', this.trackTicketPurchase.bind(this));
    this.metricCollectors.set('payment', this.trackPayment.bind(this));
    this.metricCollectors.set('refund', this.trackRefund.bind(this));
    this.metricCollectors.set('stream_started', this.trackStreamStarted.bind(this));
    this.metricCollectors.set('stream_ended', this.trackStreamEnded.bind(this));
    this.metricCollectors.set('viewer_joined', this.trackViewerJoined.bind(this));
    this.metricCollectors.set('viewer_left', this.trackViewerLeft.bind(this));
    this.metricCollectors.set('chat_message', this.trackChatMessage.bind(this));
    this.metricCollectors.set('creator_follow', this.trackCreatorFollow.bind(this));
    this.metricCollectors.set('login', this.trackLogin.bind(this));
    this.metricCollectors.set('signup', this.trackSignup.bind(this));
    this.metricCollectors.set('event_creation', this.trackEventCreation.bind(this));
    this.metricCollectors.set('event_publish', this.trackEventPublish.bind(this));
  }

  /**
   * Track a generic event
   */
  async trackEvent(eventType: string, data: {
    userId?: string;
    creatorId?: string;
    eventId?: string;
    [key: string]: any;
  }): Promise<string> {
    const eventId = await analyticsRepository.trackEvent({
      eventType,
      userId: data.userId,
      creatorId: data.creatorId,
      eventId: data.eventId,
      data,
      timestamp: new Date(),
    });

    // Invalidate relevant cache asynchronously in background for better performance
    setImmediate(async () => {
      try {
        const invalidations: Promise<void>[] = [];
        
        if (data.creatorId) {
          invalidations.push(analyticsCacheService.invalidateCreatorAnalytics(data.creatorId));
        }
        if (data.eventId) {
          invalidations.push(
            analyticsCacheService.invalidateEventAnalytics(data.eventId),
            analyticsCacheService.invalidateStreamingAnalytics(data.eventId),
            analyticsCacheService.invalidateChatAnalytics(data.eventId)
          );
        }
        if (data.userId) {
          invalidations.push(analyticsCacheService.invalidateUserAnalytics(data.userId));
        }
        invalidations.push(analyticsCacheService.invalidateTrends());

        await Promise.all(invalidations);
      } catch (error) {
        logger.error('Cache invalidation error (non-blocking):', error);
      }
    });

    return eventId;
  }

  /**
   * Track page view
   */
  async trackPageView(data: {
    userId?: string;
    page: string;
    referrer?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.trackEvent('page_view', data);
  }

  /**
   * Track ticket purchase
   */
  async trackTicketPurchase(data: {
    userId: string;
    eventId: string;
    creatorId: string;
    ticketId: string;
    amount: number;
    currency: string;
    ticketType: string;
  }): Promise<void> {
    await this.trackEvent('ticket_purchase', data);
  }

  /**
   * Track payment
   */
  async trackPayment(data: {
    userId: string;
    eventId: string;
    creatorId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    platformFee: number;
    tax: number;
  }): Promise<void> {
    await this.trackEvent('payment', data);
  }

  /**
   * Track refund
   */
  async trackRefund(data: {
    userId: string;
    eventId: string;
    amount: number;
    currency: string;
    reason: string;
  }): Promise<void> {
    await this.trackEvent('refund', data);
  }

  /**
   * Track stream started
   */
  async trackStreamStarted(data: {
    streamId: string;
    eventId: string;
    creatorId: string;
  }): Promise<void> {
    await this.trackEvent('stream_started', data);
  }

  /**
   * Track stream ended
   */
  async trackStreamEnded(data: {
    streamId: string;
    eventId: string;
    creatorId: string;
    duration: number;
    peakViewers: number;
  }): Promise<void> {
    await this.trackEvent('stream_ended', data);
  }

  /**
   * Track viewer joined
   */
  async trackViewerJoined(data: {
    userId: string;
    streamId: string;
    eventId: string;
    creatorId: string;
  }): Promise<void> {
    await this.trackEvent('viewer_joined', data);
  }

  /**
   * Track viewer left
   */
  async trackViewerLeft(data: {
    userId: string;
    streamId: string;
    eventId: string;
    creatorId: string;
    watchTime: number;
  }): Promise<void> {
    await this.trackEvent('viewer_left', data);
  }

  /**
   * Track chat message
   */
  async trackChatMessage(data: {
    userId: string;
    eventId: string;
    creatorId: string;
    messageId: string;
  }): Promise<void> {
    await this.trackEvent('chat_message', data);
  }

  /**
   * Track creator follow
   */
  async trackCreatorFollow(data: {
    userId: string;
    creatorId: string;
  }): Promise<void> {
    await this.trackEvent('creator_follow', data);
  }

  /**
   * Track login
   */
  async trackLogin(data: {
    userId: string;
    method: string;
  }): Promise<void> {
    await this.trackEvent('login', data);
  }

  /**
   * Track signup
   */
  async trackSignup(data: {
    userId: string;
    method: string;
  }): Promise<void> {
    await this.trackEvent('signup', data);
  }

  /**
   * Track event creation
   */
  async trackEventCreation(data: {
    creatorId: string;
    eventId: string;
    eventType: string;
  }): Promise<void> {
    await this.trackEvent('event_creation', data);
  }

  /**
   * Track event publish
   */
  async trackEventPublish(data: {
    creatorId: string;
    eventId: string;
  }): Promise<void> {
    await this.trackEvent('event_publish', data);
  }

  /**
   * Aggregate daily analytics
   */
  async aggregateDaily(date: string): Promise<void> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const stats = await analyticsRepository.getStatistics(startDate, endDate);

    // Update platform analytics
    await platformAnalyticsRepository.upsert(date, {
      activeUsers: stats.uniqueUsers,
      totalMessages: stats.totalEvents,
    });

    logger.info(`Daily analytics aggregated for ${date}`);
  }

  /**
   * Aggregate revenue analytics
   */
  async aggregateRevenue(date: string): Promise<void> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const paymentEvents = await analyticsRepository.getEventsByType('payment', startDate, endDate);
    const refundEvents = await analyticsRepository.getEventsByType('refund', startDate, endDate);

    let grossRevenue = 0;
    let netRevenue = 0;
    let platformFees = 0;
    let taxes = 0;
    let refunds = 0;
    const revenueByEvent: Record<string, number> = {};
    const revenueByCreator: Record<string, number> = {};
    const revenueByCountry: Record<string, number> = {};
    const revenueByCurrency: Record<string, number> = {};
    let orderCount = 0;

    for (const event of paymentEvents) {
      const data = event.data || {};
      const amount = data.amount || 0;
      grossRevenue += amount;
      platformFees += data.platformFee || 0;
      taxes += data.tax || 0;
      netRevenue += amount - (data.platformFee || 0) - (data.tax || 0);

      if (event.eventId) {
        revenueByEvent[event.eventId] = (revenueByEvent[event.eventId] || 0) + amount;
      }
      if (event.creatorId) {
        revenueByCreator[event.creatorId] = (revenueByCreator[event.creatorId] || 0) + amount;
      }
      if (data.currency) {
        revenueByCurrency[data.currency] = (revenueByCurrency[data.currency] || 0) + amount;
      }

      orderCount++;
    }

    for (const event of refundEvents) {
      const data = event.data || {};
      refunds += data.amount || 0;
    }

    await revenueAnalyticsRepository.upsert(date, {
      grossRevenue,
      netRevenue,
      platformFees,
      taxes,
      refunds,
      averageOrderValue: orderCount > 0 ? grossRevenue / orderCount : 0,
      revenueByEvent,
      revenueByCreator,
      revenueByCountry,
      revenueByCurrency,
    });

    logger.info(`Revenue analytics aggregated for ${date}`);
  }

  /**
   * Aggregate creator analytics
   */
  async aggregateCreatorAnalytics(date: string): Promise<void> {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const followEvents = await analyticsRepository.getEventsByType('creator_follow', startDate, endDate);
    const creatorMap = new Map<string, { newFollowers: number; revenue: number; ticketsSold: number }>();

    for (const event of followEvents) {
      if (event.creatorId) {
        const existing = creatorMap.get(event.creatorId) || { newFollowers: 0, revenue: 0, ticketsSold: 0 };
        creatorMap.set(event.creatorId, {
          newFollowers: existing.newFollowers + 1,
          revenue: existing.revenue,
          ticketsSold: existing.ticketsSold,
        });
      }
    }

    const ticketEvents = await analyticsRepository.getEventsByType('ticket_purchase', startDate, endDate);
    for (const event of ticketEvents) {
      const data = event.data || {};
      if (event.creatorId) {
        const existing = creatorMap.get(event.creatorId) || { newFollowers: 0, revenue: 0, ticketsSold: 0 };
        creatorMap.set(event.creatorId, {
          newFollowers: existing.newFollowers,
          revenue: existing.revenue + (data.amount || 0),
          ticketsSold: existing.ticketsSold + 1,
        });
      }
    }

    for (const [creatorId, data] of creatorMap.entries()) {
      await creatorAnalyticsRepository.upsert(creatorId, date, {
        newFollowers: data.newFollowers,
        revenue: data.revenue,
        ticketsSold: data.ticketsSold,
      });
    }

    logger.info(`Creator analytics aggregated for ${date}`);
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getPlatformDashboard(dateStr);
    if (cached) {
      return cached;
    }

    const aggregated = await platformAnalyticsRepository.aggregateByDateRange(startDate, endDate);
    const growth = await platformAnalyticsRepository.getGrowthMetrics(startDate, endDate);
    const averages = await platformAnalyticsRepository.getDailyAverages(startDate, endDate);

    const result = {
      ...aggregated,
      growth,
      averages,
    };

    // Cache the result
    await analyticsCacheService.setPlatformDashboard(dateStr, result);

    return result;
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getRevenueDashboard(dateStr);
    if (cached) {
      return cached;
    }

    const result = await revenueAnalyticsRepository.getStatistics(startDate, endDate);
    
    // Cache the result
    await analyticsCacheService.setRevenueDashboard(dateStr, result);

    return result;
  }

  /**
   * Get creator analytics
   */
  async getCreatorAnalytics(creatorId: string, startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getCreatorAnalytics(creatorId, dateStr);
    if (cached) {
      return cached;
    }

    const result = await creatorAnalyticsRepository.aggregateByCreator(creatorId, startDate, endDate);
    
    // Cache the result
    await analyticsCacheService.setCreatorAnalytics(creatorId, dateStr, result);

    return result;
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(eventId: string, startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getEventAnalytics(eventId, dateStr);
    if (cached) {
      return cached;
    }

    const events = await analyticsRepository.getEventsByEvent(eventId, startDate, endDate);
    const revenue = await revenueAnalyticsRepository.getByEvent(eventId, startDate, endDate);

    const result = {
      totalEvents: events.length,
      revenue,
      eventsByType: events.reduce((acc, e) => {
        acc[e.eventType] = (acc[e.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Cache the result
    await analyticsCacheService.setEventAnalytics(eventId, dateStr, result);

    return result;
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getUserAnalytics(userId, dateStr);
    if (cached) {
      return cached;
    }

    const signupEvents = await analyticsRepository.getEventsByType('signup', startDate, endDate);
    const loginEvents = await analyticsRepository.getEventsByType('login', startDate, endDate);

    const uniqueUsers = new Set<string>();
    const returningUsers = new Set<string>();

    for (const event of loginEvents) {
      if (event.userId) {
        uniqueUsers.add(event.userId);
      }
    }

    for (const event of signupEvents) {
      if (event.userId) {
        returningUsers.add(event.userId);
      }
    }

    const result = {
      newUsers: signupEvents.length,
      activeUsers: uniqueUsers.size,
      returningUsers: returningUsers.size,
    };

    // Cache the result
    await analyticsCacheService.setUserAnalytics(userId, dateStr, result);

    return result;
  }

  /**
   * Get streaming analytics
   */
  async getStreamingAnalytics(eventId: string, startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getStreamingAnalytics(eventId, dateStr);
    if (cached) {
      return cached;
    }

    const streamStartedEvents = await analyticsRepository.getEventsByType('stream_started', startDate, endDate);
    const viewerJoinedEvents = await analyticsRepository.getEventsByType('viewer_joined', startDate, endDate);
    const viewerLeftEvents = await analyticsRepository.getEventsByType('viewer_left', startDate, endDate);

    const eventStreams = streamStartedEvents.filter(e => e.eventId === eventId);
    const eventJoins = viewerJoinedEvents.filter(e => e.eventId === eventId);
    const eventLeaves = viewerLeftEvents.filter(e => e.eventId === eventId);

    let totalWatchTime = 0;
    for (const leave of eventLeaves) {
      const data = leave.data || {};
      totalWatchTime += data.watchTime || 0;
    }

    const result = {
      totalStreams: eventStreams.length,
      totalViewers: eventJoins.length,
      totalWatchTime,
      averageWatchTime: eventLeaves.length > 0 ? totalWatchTime / eventLeaves.length : 0,
    };

    // Cache the result
    await analyticsCacheService.setStreamingAnalytics(eventId, dateStr, result);

    return result;
  }

  /**
   * Get chat analytics
   */
  async getChatAnalytics(eventId: string, startDate: Date, endDate: Date): Promise<any> {
    const dateStr = startDate.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getChatAnalytics(eventId, dateStr);
    if (cached) {
      return cached;
    }

    const chatEvents = await analyticsRepository.getEventsByType('chat_message', startDate, endDate);
    const eventChats = chatEvents.filter(e => e.eventId === eventId);

    const uniqueSenders = new Set<string>();
    for (const chat of eventChats) {
      if (chat.userId) {
        uniqueSenders.add(chat.userId);
      }
    }

    const result = {
      totalMessages: eventChats.length,
      uniqueSenders: uniqueSenders.size,
      averageMessagesPerUser: uniqueSenders.size > 0 ? eventChats.length / uniqueSenders.size : 0,
    };

    // Cache the result
    await analyticsCacheService.setChatAnalytics(eventId, dateStr, result);

    return result;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(): Promise<any> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Try cache first
    const cached = await analyticsCacheService.getPlatformDashboard(dateStr);
    if (cached) {
      return cached;
    }

    const platformData = await platformAnalyticsRepository.getLatest();
    const revenueStats = await revenueAnalyticsRepository.getStatistics(
      new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      today
    );

    const result = {
      ...platformData,
      revenue: revenueStats,
    };

    // Cache the result
    await analyticsCacheService.setPlatformDashboard(dateStr, result);

    return result;
  }

  /**
   * Get trends
   */
  async getTrends(period: string): Promise<any> {
    // Try cache first
    const cached = await analyticsCacheService.getTrends(period);
    if (cached) {
      return cached;
    }

    const endDate = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const platformGrowth = await platformAnalyticsRepository.getGrowthMetrics(startDate, endDate);
    const revenueGrowth = await revenueAnalyticsRepository.getStatistics(startDate, endDate);

    const result = {
      userGrowth: platformGrowth.userGrowth || 0,
      revenueGrowth: revenueGrowth.totalGrossRevenue || 0,
      eventGrowth: platformGrowth.eventGrowth || 0,
    };

    // Cache the result
    await analyticsCacheService.setTrends(period, result);

    return result;
  }

  /**
   * Trigger aggregation for a specific date
   */
  async triggerAggregation(date: string): Promise<void> {
    await analyticsAggregationService.aggregateDaily(date);
  }
}

export const analyticsService = new AnalyticsService();
