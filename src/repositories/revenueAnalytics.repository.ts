import { getFirestore } from '../services/firebase';
import { RevenueAnalytics } from '../types';
import logger from '../utils/logger';

/**
 * Revenue Analytics Repository
 * Handles revenue analytics storage and retrieval
 */
export class RevenueAnalyticsRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'analytics_revenue';

  /**
   * Create or update revenue analytics for a date
   */
  async upsert(date: string, data: Partial<RevenueAnalytics>): Promise<void> {
    const id = `revenue-${date}`;
    const existing = await this.findById(id);
    const revenue: RevenueAnalytics = existing
      ? { ...existing, ...data, updatedAt: new Date() }
      : {
          id,
          date,
          grossRevenue: 0,
          netRevenue: 0,
          platformFees: 0,
          taxes: 0,
          refunds: 0,
          coupons: 0,
          averageOrderValue: 0,
          revenueByEvent: {},
          revenueByCreator: {},
          revenueByCountry: {},
          revenueByCurrency: {},
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    await this.db.collection(this.collection).doc(id).set(revenue);
    logger.debug(`Revenue analytics updated for ${date}`);
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<RevenueAnalytics | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as RevenueAnalytics;
  }

  /**
   * Find by date
   */
  async findByDate(date: string): Promise<RevenueAnalytics | null> {
    return this.findById(`revenue-${date}`);
  }

  /**
   * Get revenue by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<RevenueAnalytics[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .orderBy('date')
      .get();

    return snapshot.docs.map((doc) => doc.data() as RevenueAnalytics);
  }

  /**
   * Get revenue by event
   */
  async getByEvent(eventId: string, startDate: Date, endDate: Date): Promise<number> {
    const analytics = await this.getByDateRange(startDate, endDate);
    let total = 0;
    for (const a of analytics) {
      total += a.revenueByEvent[eventId] || 0;
    }
    return total;
  }

  /**
   * Get revenue by creator
   */
  async getByCreator(creatorId: string, startDate: Date, endDate: Date): Promise<number> {
    const analytics = await this.getByDateRange(startDate, endDate);
    let total = 0;
    for (const a of analytics) {
      total += a.revenueByCreator[creatorId] || 0;
    }
    return total;
  }

  /**
   * Get revenue by country
   */
  async getByCountry(country: string, startDate: Date, endDate: Date): Promise<number> {
    const analytics = await this.getByDateRange(startDate, endDate);
    let total = 0;
    for (const a of analytics) {
      total += a.revenueByCountry[country] || 0;
    }
    return total;
  }

  /**
   * Get revenue by currency
   */
  async getByCurrency(currency: string, startDate: Date, endDate: Date): Promise<number> {
    const analytics = await this.getByDateRange(startDate, endDate);
    let total = 0;
    for (const a of analytics) {
      total += a.revenueByCurrency[currency] || 0;
    }
    return total;
  }

  /**
   * Aggregate revenue by period
   */
  async aggregateByPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<{
    grossRevenue: number;
    netRevenue: number;
    platformFees: number;
    taxes: number;
    refunds: number;
    coupons: number;
    averageOrderValue: number;
    revenueByEvent: Record<string, number>;
    revenueByCreator: Record<string, number>;
    revenueByCountry: Record<string, number>;
    revenueByCurrency: Record<string, number>;
  }> {
    const analytics = await this.getByDateRange(startDate, endDate);

    const aggregated = {
      grossRevenue: 0,
      netRevenue: 0,
      platformFees: 0,
      taxes: 0,
      refunds: 0,
      coupons: 0,
      averageOrderValue: 0,
      revenueByEvent: {} as Record<string, number>,
      revenueByCreator: {} as Record<string, number>,
      revenueByCountry: {} as Record<string, number>,
      revenueByCurrency: {} as Record<string, number>,
    };

    let totalOrders = 0;

    for (const a of analytics) {
      aggregated.grossRevenue += a.grossRevenue;
      aggregated.netRevenue += a.netRevenue;
      aggregated.platformFees += a.platformFees;
      aggregated.taxes += a.taxes;
      aggregated.refunds += a.refunds;
      aggregated.coupons += a.coupons;

      // Aggregate nested objects
      for (const [key, value] of Object.entries(a.revenueByEvent)) {
        aggregated.revenueByEvent[key] = (aggregated.revenueByEvent[key] || 0) + value;
      }
      for (const [key, value] of Object.entries(a.revenueByCreator)) {
        aggregated.revenueByCreator[key] = (aggregated.revenueByCreator[key] || 0) + value;
      }
      for (const [key, value] of Object.entries(a.revenueByCountry)) {
        aggregated.revenueByCountry[key] = (aggregated.revenueByCountry[key] || 0) + value;
      }
      for (const [key, value] of Object.entries(a.revenueByCurrency)) {
        aggregated.revenueByCurrency[key] = (aggregated.revenueByCurrency[key] || 0) + value;
      }

      totalOrders += Object.keys(a.revenueByEvent).length;
    }

    if (totalOrders > 0) {
      aggregated.averageOrderValue = aggregated.grossRevenue / totalOrders;
    }

    return aggregated;
  }

  /**
   * Get statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    totalGrossRevenue: number;
    totalNetRevenue: number;
    totalPlatformFees: number;
    totalRefunds: number;
    refundRate: number;
    topEvents: Array<{ eventId: string; revenue: number }>;
    topCreators: Array<{ creatorId: string; revenue: number }>;
    topCountries: Array<{ country: string; revenue: number }>;
  }> {
    const aggregated = await this.aggregateByPeriod(startDate, endDate);
    const refundRate = aggregated.grossRevenue > 0 ? (aggregated.refunds / aggregated.grossRevenue) * 100 : 0;

    // Sort and get top performers
    const topEvents = Object.entries(aggregated.revenueByEvent)
      .map(([eventId, revenue]) => ({ eventId, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topCreators = Object.entries(aggregated.revenueByCreator)
      .map(([creatorId, revenue]) => ({ creatorId, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topCountries = Object.entries(aggregated.revenueByCountry)
      .map(([country, revenue]) => ({ country, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalGrossRevenue: aggregated.grossRevenue,
      totalNetRevenue: aggregated.netRevenue,
      totalPlatformFees: aggregated.platformFees,
      totalRefunds: aggregated.refunds,
      refundRate,
      topEvents,
      topCreators,
      topCountries,
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

export const revenueAnalyticsRepository = new RevenueAnalyticsRepository();
