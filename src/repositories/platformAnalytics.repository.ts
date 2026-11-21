import { getFirestore } from '../services/firebase';
import { PlatformAnalytics } from '../types';
import logger from '../utils/logger';

/**
 * Platform Analytics Repository
 * Handles platform-wide analytics storage and retrieval
 */
export class PlatformAnalyticsRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'analytics_platform';

  /**
   * Create or update platform analytics for a date
   */
  async upsert(date: string, data: Partial<PlatformAnalytics>): Promise<void> {
    const id = `platform-${date}`;
    const existing = await this.findById(id);
    const analytics: PlatformAnalytics = existing
      ? { ...existing, ...data, updatedAt: new Date() }
      : {
          id,
          date,
          totalUsers: 0,
          activeUsers: 0,
          newUsers: 0,
          totalCreators: 0,
          activeCreators: 0,
          totalEvents: 0,
          activeEvents: 0,
          totalRevenue: 0,
          totalTicketsSold: 0,
          totalStreamMinutes: 0,
          totalMessages: 0,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    await this.db.collection(this.collection).doc(id).set(analytics);
    logger.debug(`Platform analytics updated for ${date}`);
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<PlatformAnalytics | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as PlatformAnalytics;
  }

  /**
   * Find by date
   */
  async findByDate(date: string): Promise<PlatformAnalytics | null> {
    return this.findById(`platform-${date}`);
  }

  /**
   * Get analytics by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<PlatformAnalytics[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .orderBy('date')
      .get();

    return snapshot.docs.map((doc) => doc.data() as PlatformAnalytics);
  }

  /**
   * Aggregate platform analytics
   */
  async aggregateByDateRange(startDate: Date, endDate: Date): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    totalCreators: number;
    activeCreators: number;
    totalEvents: number;
    activeEvents: number;
    totalRevenue: number;
    totalTicketsSold: number;
    totalStreamMinutes: number;
    totalMessages: number;
  }> {
    const analytics = await this.getByDateRange(startDate, endDate);

    const aggregated = {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalCreators: 0,
      activeCreators: 0,
      totalEvents: 0,
      activeEvents: 0,
      totalRevenue: 0,
      totalTicketsSold: 0,
      totalStreamMinutes: 0,
      totalMessages: 0,
    };

    for (const a of analytics) {
      aggregated.totalUsers = Math.max(aggregated.totalUsers, a.totalUsers);
      aggregated.activeUsers += a.activeUsers;
      aggregated.newUsers += a.newUsers;
      aggregated.totalCreators = Math.max(aggregated.totalCreators, a.totalCreators);
      aggregated.activeCreators += a.activeCreators;
      aggregated.totalEvents = Math.max(aggregated.totalEvents, a.totalEvents);
      aggregated.activeEvents += a.activeEvents;
      aggregated.totalRevenue += a.totalRevenue;
      aggregated.totalTicketsSold += a.totalTicketsSold;
      aggregated.totalStreamMinutes += a.totalStreamMinutes;
      aggregated.totalMessages += a.totalMessages;
    }

    return aggregated;
  }

  /**
   * Get daily averages
   */
  async getDailyAverages(startDate: Date, endDate: Date): Promise<{
    averageActiveUsers: number;
    averageActiveCreators: number;
    averageActiveEvents: number;
    averageRevenue: number;
    averageTicketsSold: number;
    averageStreamMinutes: number;
    averageMessages: number;
  }> {
    const analytics = await this.getByDateRange(startDate, endDate);
    const days = analytics.length;

    if (days === 0) {
      return {
        averageActiveUsers: 0,
        averageActiveCreators: 0,
        averageActiveEvents: 0,
        averageRevenue: 0,
        averageTicketsSold: 0,
        averageStreamMinutes: 0,
        averageMessages: 0,
      };
    }

    const sums = {
      activeUsers: 0,
      activeCreators: 0,
      activeEvents: 0,
      revenue: 0,
      ticketsSold: 0,
      streamMinutes: 0,
      messages: 0,
    };

    for (const a of analytics) {
      sums.activeUsers += a.activeUsers;
      sums.activeCreators += a.activeCreators;
      sums.activeEvents += a.activeEvents;
      sums.revenue += a.totalRevenue;
      sums.ticketsSold += a.totalTicketsSold;
      sums.streamMinutes += a.totalStreamMinutes;
      sums.messages += a.totalMessages;
    }

    return {
      averageActiveUsers: sums.activeUsers / days,
      averageActiveCreators: sums.activeCreators / days,
      averageActiveEvents: sums.activeEvents / days,
      averageRevenue: sums.revenue / days,
      averageTicketsSold: sums.ticketsSold / days,
      averageStreamMinutes: sums.streamMinutes / days,
      averageMessages: sums.messages / days,
    };
  }

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(startDate: Date, endDate: Date): Promise<{
    userGrowth: number;
    creatorGrowth: number;
    eventGrowth: number;
    revenueGrowth: number;
  }> {
    const analytics = await this.getByDateRange(startDate, endDate);

    if (analytics.length < 2) {
      return {
        userGrowth: 0,
        creatorGrowth: 0,
        eventGrowth: 0,
        revenueGrowth: 0,
      };
    }

    const first = analytics[0];
    const last = analytics[analytics.length - 1];

    const userGrowth = first.totalUsers > 0 ? ((last.totalUsers - first.totalUsers) / first.totalUsers) * 100 : 0;
    const creatorGrowth = first.totalCreators > 0 ? ((last.totalCreators - first.totalCreators) / first.totalCreators) * 100 : 0;
    const eventGrowth = first.totalEvents > 0 ? ((last.totalEvents - first.totalEvents) / first.totalEvents) * 100 : 0;
    const revenueGrowth = first.totalRevenue > 0 ? ((last.totalRevenue - first.totalRevenue) / first.totalRevenue) * 100 : 0;

    return {
      userGrowth,
      creatorGrowth,
      eventGrowth,
      revenueGrowth,
    };
  }

  /**
   * Get latest analytics
   */
  async getLatest(): Promise<PlatformAnalytics | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as PlatformAnalytics;
  }

  /**
   * Delete old data
   */
  async deleteOld(beforeDate: Date): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('date', '<', beforeDate.toISOString().split('T')[0])
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }
}

export const platformAnalyticsRepository = new PlatformAnalyticsRepository();
