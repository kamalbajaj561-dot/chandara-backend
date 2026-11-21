import { getFirestore } from '../services/firebase';
import { CreatorAnalytics } from '../types';
import logger from '../utils/logger';

/**
 * Creator Analytics Repository
 * Handles creator analytics storage and retrieval
 */
export class CreatorAnalyticsRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'analytics_creator';

  /**
   * Create or update creator analytics for a date
   */
  async upsert(creatorId: string, date: string, data: Partial<CreatorAnalytics>): Promise<void> {
    const id = `creator-${creatorId}-${date}`;
    const existing = await this.findById(id);
    const analytics: CreatorAnalytics = existing
      ? { ...existing, ...data, updatedAt: new Date() }
      : {
          id,
          creatorId,
          date,
          followers: 0,
          newFollowers: 0,
          revenue: 0,
          ticketsSold: 0,
          eventsHosted: 0,
          liveStreams: 0,
          averageAttendance: 0,
          totalViews: 0,
          rating: 0,
          reviewCount: 0,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    await this.db.collection(this.collection).doc(id).set(analytics);
    logger.debug(`Creator analytics updated for ${creatorId} on ${date}`);
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<CreatorAnalytics | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as CreatorAnalytics;
  }

  /**
   * Find by creator and date
   */
  async findByCreatorAndDate(creatorId: string, date: string): Promise<CreatorAnalytics | null> {
    return this.findById(`creator-${creatorId}-${date}`);
  }

  /**
   * Get analytics by creator
   */
  async getByCreator(creatorId: string, startDate: Date, endDate: Date): Promise<CreatorAnalytics[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('creatorId', '==', creatorId)
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .orderBy('date')
      .get();

    return snapshot.docs.map((doc) => doc.data() as CreatorAnalytics);
  }

  /**
   * Get analytics by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<CreatorAnalytics[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .orderBy('date')
      .get();

    return snapshot.docs.map((doc) => doc.data() as CreatorAnalytics);
  }

  /**
   * Aggregate creator analytics
   */
  async aggregateByCreator(creatorId: string, startDate: Date, endDate: Date): Promise<{
    totalFollowers: number;
    newFollowers: number;
    totalRevenue: number;
    totalTicketsSold: number;
    totalEventsHosted: number;
    totalLiveStreams: number;
    averageAttendance: number;
    totalViews: number;
    averageRating: number;
    totalReviews: number;
  }> {
    const analytics = await this.getByCreator(creatorId, startDate, endDate);

    const aggregated = {
      totalFollowers: 0,
      newFollowers: 0,
      totalRevenue: 0,
      totalTicketsSold: 0,
      totalEventsHosted: 0,
      totalLiveStreams: 0,
      averageAttendance: 0,
      totalViews: 0,
      averageRating: 0,
      totalReviews: 0,
    };

    let totalAttendance = 0;
    let attendanceCount = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (const a of analytics) {
      aggregated.totalFollowers = Math.max(aggregated.totalFollowers, a.followers);
      aggregated.newFollowers += a.newFollowers;
      aggregated.totalRevenue += a.revenue;
      aggregated.totalTicketsSold += a.ticketsSold;
      aggregated.totalEventsHosted += a.eventsHosted;
      aggregated.totalLiveStreams += a.liveStreams;
      aggregated.totalViews += a.totalViews;
      aggregated.totalReviews += a.reviewCount;

      if (a.averageAttendance > 0) {
        totalAttendance += a.averageAttendance;
        attendanceCount++;
      }
      if (a.rating > 0) {
        totalRating += a.rating;
        ratingCount++;
      }
    }

    if (attendanceCount > 0) {
      aggregated.averageAttendance = totalAttendance / attendanceCount;
    }
    if (ratingCount > 0) {
      aggregated.averageRating = totalRating / ratingCount;
    }

    return aggregated;
  }

  /**
   * Get top creators by revenue
   */
  async getTopCreatorsByRevenue(startDate: Date, endDate: Date, limit: number = 10): Promise<Array<{
    creatorId: string;
    revenue: number;
    ticketsSold: number;
  }>> {
    const analytics = await this.getByDateRange(startDate, endDate);
    const creatorMap = new Map<string, { revenue: number; ticketsSold: number }>();

    for (const a of analytics) {
      const existing = creatorMap.get(a.creatorId) || { revenue: 0, ticketsSold: 0 };
      creatorMap.set(a.creatorId, {
        revenue: existing.revenue + a.revenue,
        ticketsSold: existing.ticketsSold + a.ticketsSold,
      });
    }

    return Array.from(creatorMap.entries())
      .map(([creatorId, data]) => ({ creatorId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  /**
   * Get top creators by followers
   */
  async getTopCreatorsByFollowers(startDate: Date, endDate: Date, limit: number = 10): Promise<Array<{
    creatorId: string;
    followers: number;
    newFollowers: number;
  }>> {
    const analytics = await this.getByDateRange(startDate, endDate);
    const creatorMap = new Map<string, { followers: number; newFollowers: number }>();

    for (const a of analytics) {
      const existing = creatorMap.get(a.creatorId) || { followers: 0, newFollowers: 0 };
      creatorMap.set(a.creatorId, {
        followers: Math.max(existing.followers, a.followers),
        newFollowers: existing.newFollowers + a.newFollowers,
      });
    }

    return Array.from(creatorMap.entries())
      .map(([creatorId, data]) => ({ creatorId, ...data }))
      .sort((a, b) => b.newFollowers - a.newFollowers)
      .slice(0, limit);
  }

  /**
   * Get statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    totalCreators: number;
    totalRevenue: number;
    totalTicketsSold: number;
    totalEvents: number;
    totalStreams: number;
    averageRating: number;
  }> {
    const analytics = await this.getByDateRange(startDate, endDate);
    const uniqueCreators = new Set<string>();

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalEvents = 0;
    let totalStreams = 0;
    let totalRating = 0;
    let ratingCount = 0;

    for (const a of analytics) {
      uniqueCreators.add(a.creatorId);
      totalRevenue += a.revenue;
      totalTicketsSold += a.ticketsSold;
      totalEvents += a.eventsHosted;
      totalStreams += a.liveStreams;

      if (a.rating > 0) {
        totalRating += a.rating;
        ratingCount++;
      }
    }

    return {
      totalCreators: uniqueCreators.size,
      totalRevenue,
      totalTicketsSold,
      totalEvents,
      totalStreams,
      averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    };
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

export const creatorAnalyticsRepository = new CreatorAnalyticsRepository();
