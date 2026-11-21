import { analyticsRepository } from '../repositories/analytics.repository';
import { revenueAnalyticsRepository } from '../repositories/revenueAnalytics.repository';
import { creatorAnalyticsRepository } from '../repositories/creatorAnalytics.repository';
import { platformAnalyticsRepository } from '../repositories/platformAnalytics.repository';
import { analyticsCacheService } from './analyticsCache.service';
import logger from '../utils/logger';

/**
 * Analytics Aggregation Service
 * Handles background aggregation jobs for analytics data
 * Supports hourly, daily, weekly, monthly, and yearly aggregations
 */
export class AnalyticsAggregationService {
  /**
   * Aggregate hourly analytics
   */
  async aggregateHourly(date: string, hour: number): Promise<void> {
    try {
      logger.info(`Starting hourly aggregation for ${date} hour ${hour}`);

      const startDate = new Date(date);
      startDate.setHours(hour, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(hour + 1, 0, 0, 0);

      // Get statistics for the hour
      const stats = await analyticsRepository.getStatistics(startDate, endDate);

      // Cache the aggregated data
      await analyticsCacheService.setAggregatedHourly(date, hour, stats);

      logger.info(`Completed hourly aggregation for ${date} hour ${hour}`);
    } catch (error) {
      logger.error(`Failed hourly aggregation for ${date} hour ${hour}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate daily analytics
   */
  async aggregateDaily(date: string): Promise<void> {
    try {
      logger.info(`Starting daily aggregation for ${date}`);

      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Aggregate platform analytics
      await this.aggregatePlatformDaily(date, startDate, endDate);

      // Aggregate revenue analytics
      await this.aggregateRevenueDaily(date, startDate, endDate);

      // Aggregate creator analytics
      await this.aggregateCreatorsDaily(date, startDate, endDate);

      // Invalidate cache for the date
      await analyticsCacheService.invalidateAggregatedDaily(date);

      logger.info(`Completed daily aggregation for ${date}`);
    } catch (error) {
      logger.error(`Failed daily aggregation for ${date}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate platform daily analytics
   */
  private async aggregatePlatformDaily(date: string, startDate: Date, endDate: Date): Promise<void> {
    const stats = await analyticsRepository.getStatistics(startDate, endDate);

    const platformData = {
      id: `platform-${date}`,
      date,
      totalUsers: stats.uniqueUsers,
      activeUsers: stats.uniqueUsers, // Simplified - could be more sophisticated
      newUsers: stats.eventsByType['user_registered'] || 0,
      totalCreators: stats.uniqueCreators,
      activeCreators: stats.uniqueCreators,
      totalEvents: stats.uniqueEvents,
      activeEvents: stats.uniqueEvents,
      totalTicketsSold: stats.eventsByType['ticket_purchase'] || 0,
      totalRevenue: stats.eventsByType['payment_success'] || 0,
      totalStreamMinutes: stats.eventsByType['stream_ended'] || 0,
      totalMessages: stats.eventsByType['chat_message'] || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await platformAnalyticsRepository.upsert(date, platformData);
    await analyticsCacheService.setPlatformDashboard(date, platformData);
  }

  /**
   * Aggregate revenue daily analytics
   */
  private async aggregateRevenueDaily(date: string, startDate: Date, endDate: Date): Promise<void> {
    const paymentEvents = await analyticsRepository.getEventsByType('payment_success', startDate, endDate);
    const refundEvents = await analyticsRepository.getEventsByType('refund', startDate, endDate);

    let grossRevenue = 0;
    let netRevenue = 0;
    const revenueByEvent: Record<string, number> = {};
    const revenueByCreator: Record<string, number> = {};
    const revenueByCountry: Record<string, number> = {};
    const revenueByCurrency: Record<string, number> = {};

    for (const event of paymentEvents) {
      if (event.data?.amount) {
        const amount = event.data.amount;
        grossRevenue += amount;
        netRevenue += amount;

        if (event.eventId) {
          revenueByEvent[event.eventId] = (revenueByEvent[event.eventId] || 0) + amount;
        }
        if (event.creatorId) {
          revenueByCreator[event.creatorId] = (revenueByCreator[event.creatorId] || 0) + amount;
        }
        if (event.data?.country) {
          revenueByCountry[event.data.country] = (revenueByCountry[event.data.country] || 0) + amount;
        }
        if (event.data?.currency) {
          revenueByCurrency[event.data.currency] = (revenueByCurrency[event.data.currency] || 0) + amount;
        }
      }
    }

    for (const event of refundEvents) {
      if (event.data?.amount) {
        netRevenue -= event.data.amount;
      }
    }

    const revenueData = {
      id: `revenue-${date}`,
      date,
      grossRevenue,
      netRevenue,
      platformFees: grossRevenue * 0.05, // 5% platform fee
      taxes: grossRevenue * 0.1, // 10% tax estimate
      refunds: refundEvents.length,
      coupons: 0,
      averageOrderValue: paymentEvents.length > 0 ? grossRevenue / paymentEvents.length : 0,
      revenueByEvent,
      revenueByCreator,
      revenueByCountry,
      revenueByCurrency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await revenueAnalyticsRepository.upsert(date, revenueData);
    await analyticsCacheService.setRevenueDashboard(date, revenueData);
  }

  /**
   * Aggregate creator daily analytics
   */
  private async aggregateCreatorsDaily(date: string, startDate: Date, endDate: Date): Promise<void> {
    const followEvents = await analyticsRepository.getEventsByType('follow', startDate, endDate);
    const creatorIds = new Set(followEvents.map(e => e.creatorId).filter((id): id is string => Boolean(id)));

    for (const creatorId of creatorIds) {
      const creatorEvents = await analyticsRepository.getEventsByCreator(creatorId, startDate, endDate);
      
      const followers = creatorEvents.filter(e => e.eventType === 'follow').length;
      const revenue = creatorEvents
        .filter(e => e.eventType === 'payment_success' && e.data?.amount)
        .reduce((sum, e) => sum + (e.data?.amount || 0), 0);
      const ticketsSold = creatorEvents.filter(e => e.eventType === 'ticket_purchase').length;
      const eventsHosted = new Set(creatorEvents.filter(e => e.eventId).map(e => e.eventId)).size;

      const creatorData = {
        followers,
        newFollowers: followers,
        revenue,
        ticketsSold,
        eventsHosted,
        liveStreams: creatorEvents.filter(e => e.eventType === 'stream_started').length,
        averageAttendance: 0,
        totalViews: creatorEvents.filter(e => e.eventType === 'viewer_joined').length,
        rating: 0,
        reviewCount: 0,
      };

      await creatorAnalyticsRepository.upsert(creatorId, date, creatorData);
      await analyticsCacheService.setCreatorAnalytics(creatorId, date, creatorData);
    }
  }

  /**
   * Aggregate weekly analytics
   */
  async aggregateWeekly(year: number, week: number): Promise<void> {
    try {
      logger.info(`Starting weekly aggregation for ${year} week ${week}`);

      // Get the start and end dates for the week
      const startDate = this.getWeekStartDate(year, week);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      // Aggregate daily data for the week
      const weekData = {
        year,
        week,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalRevenue: 0,
        totalUsers: 0,
        totalEvents: 0,
        totalCreators: 0,
      };

      // Sum up daily aggregations for the week
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];

        const dailyData = await analyticsCacheService.getAggregatedDaily(dateStr);
        if (dailyData) {
          weekData.totalRevenue += dailyData.totalRevenue || 0;
          weekData.totalUsers += dailyData.totalUsers || 0;
          weekData.totalEvents += dailyData.totalEvents || 0;
          weekData.totalCreators += dailyData.totalCreators || 0;
        }
      }

      await analyticsCacheService.setAggregatedWeekly(year, week, weekData);

      logger.info(`Completed weekly aggregation for ${year} week ${week}`);
    } catch (error) {
      logger.error(`Failed weekly aggregation for ${year} week ${week}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate monthly analytics
   */
  async aggregateMonthly(year: number, month: number): Promise<void> {
    try {
      logger.info(`Starting monthly aggregation for ${year}-${month}`);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const monthData = {
        year,
        month,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalRevenue: 0,
        totalUsers: 0,
        totalEvents: 0,
        totalCreators: 0,
      };

      // Sum up weekly aggregations for the month
      const weeks = this.getWeeksInMonth(year, month);
      for (const week of weeks) {
        const weeklyData = await analyticsCacheService.getAggregatedWeekly(year, week);
        if (weeklyData) {
          monthData.totalRevenue += weeklyData.totalRevenue || 0;
          monthData.totalUsers += weeklyData.totalUsers || 0;
          monthData.totalEvents += weeklyData.totalEvents || 0;
          monthData.totalCreators += weeklyData.totalCreators || 0;
        }
      }

      await analyticsCacheService.setAggregatedMonthly(year, month, monthData);

      logger.info(`Completed monthly aggregation for ${year}-${month}`);
    } catch (error) {
      logger.error(`Failed monthly aggregation for ${year}-${month}:`, error);
      throw error;
    }
  }

  /**
   * Aggregate yearly analytics
   */
  async aggregateYearly(year: number): Promise<void> {
    try {
      logger.info(`Starting yearly aggregation for ${year}`);

      const yearData = {
        year,
        totalRevenue: 0,
        totalUsers: 0,
        totalEvents: 0,
        totalCreators: 0,
      };

      // Sum up monthly aggregations for the year
      for (let month = 1; month <= 12; month++) {
        const monthlyData = await analyticsCacheService.getAggregatedMonthly(year, month);
        if (monthlyData) {
          yearData.totalRevenue += monthlyData.totalRevenue || 0;
          yearData.totalUsers += monthlyData.totalUsers || 0;
          yearData.totalEvents += monthlyData.totalEvents || 0;
          yearData.totalCreators += monthlyData.totalCreators || 0;
        }
      }

      await analyticsCacheService.setAggregatedYearly(year, yearData);

      logger.info(`Completed yearly aggregation for ${year}`);
    } catch (error) {
      logger.error(`Failed yearly aggregation for ${year}:`, error);
      throw error;
    }
  }

  /**
   * Get week start date for a given year and week number
   */
  private getWeekStartDate(year: number, week: number): Date {
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  /**
   * Get week numbers for a given month
   */
  private getWeeksInMonth(year: number, month: number): number[] {
    const weeks: number[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let currentWeek = this.getWeekNumber(firstDay);
    let lastWeek = this.getWeekNumber(lastDay);

    for (let week = currentWeek; week <= lastWeek; week++) {
      weeks.push(week);
    }

    return weeks;
  }

  /**
   * Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Trigger daily aggregation for yesterday
   */
  async triggerDailyAggregation(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    await this.aggregateDaily(dateStr);
  }

  /**
   * Trigger hourly aggregation for the previous hour
   */
  async triggerHourlyAggregation(): Promise<void> {
    const now = new Date();
    const previousHour = new Date(now);
    previousHour.setHours(now.getHours() - 1);

    const dateStr = previousHour.toISOString().split('T')[0];
    const hour = previousHour.getHours();

    await this.aggregateHourly(dateStr, hour);
  }

  /**
   * Trigger weekly aggregation for the previous week
   */
  async triggerWeeklyAggregation(): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now) - 1;

    if (week > 0) {
      await this.aggregateWeekly(year, week);
    }
  }

  /**
   * Trigger monthly aggregation for the previous month
   */
  async triggerMonthlyAggregation(): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (month === 0) {
      await this.aggregateMonthly(year - 1, 12);
    } else {
      await this.aggregateMonthly(year, month);
    }
  }

  /**
   * Trigger yearly aggregation for the previous year
   */
  async triggerYearlyAggregation(): Promise<void> {
    const now = new Date();
    const year = now.getFullYear() - 1;

    await this.aggregateYearly(year);
  }
}

export const analyticsAggregationService = new AnalyticsAggregationService();
