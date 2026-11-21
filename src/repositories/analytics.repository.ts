import { getFirestore } from '../services/firebase';
import { AnalyticsEvent, AnalyticsDaily } from '../types';
import logger from '../utils/logger';

/**
 * Analytics Repository
 * Handles analytics event storage and aggregation
 */
export class AnalyticsRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private eventsCollection = 'analytics_events';
  private dailyCollection = 'analytics_daily';

  /**
   * Track an analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'createdAt'>): Promise<string> {
    const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: AnalyticsEvent = {
      ...event,
      id,
      createdAt: new Date(),
    };

    await this.db.collection(this.eventsCollection).doc(id).set(fullEvent);
    logger.debug(`Analytics event tracked: ${event.eventType}`);
    return id;
  }

  /**
   * Get events by type and date range
   */
  async getEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsEvent[]> {
    const snapshot = await this.db
      .collection(this.eventsCollection)
      .where('eventType', '==', eventType)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AnalyticsEvent);
  }

  /**
   * Get events by user
   */
  async getEventsByUser(userId: string, startDate: Date, endDate: Date): Promise<AnalyticsEvent[]> {
    const snapshot = await this.db
      .collection(this.eventsCollection)
      .where('userId', '==', userId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AnalyticsEvent);
  }

  /**
   * Get events by creator
   */
  async getEventsByCreator(creatorId: string, startDate: Date, endDate: Date): Promise<AnalyticsEvent[]> {
    const snapshot = await this.db
      .collection(this.eventsCollection)
      .where('creatorId', '==', creatorId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AnalyticsEvent);
  }

  /**
   * Get events by event
   */
  async getEventsByEvent(eventId: string, startDate: Date, endDate: Date): Promise<AnalyticsEvent[]> {
    const snapshot = await this.db
      .collection(this.eventsCollection)
      .where('eventId', '==', eventId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return snapshot.docs.map((doc) => doc.data() as AnalyticsEvent);
  }

  /**
   * Get daily analytics
   */
  async getDailyAnalytics(date: string): Promise<AnalyticsDaily | null> {
    const doc = await this.db.collection(this.dailyCollection).doc(date).get();
    if (!doc.exists) return null;
    return doc.data() as AnalyticsDaily;
  }

  /**
   * Create or update daily analytics
   */
  async upsertDailyAnalytics(date: string, metrics: Record<string, number>): Promise<void> {
    const existing = await this.getDailyAnalytics(date);
    const updatedMetrics = existing ? { ...existing.metrics, ...metrics } : metrics;

    await this.db.collection(this.dailyCollection).doc(date).set({
      id: date,
      date,
      metrics: updatedMetrics,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get analytics for date range
   */
  async getAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<AnalyticsDaily[]> {
    const snapshot = await this.db
      .collection(this.dailyCollection)
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .get();

    return snapshot.docs.map((doc) => doc.data() as AnalyticsDaily);
  }

  /**
   * Aggregate metrics by period
   */
  async aggregateMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, number>> {
    const dailyAnalytics = await this.getAnalyticsByDateRange(startDate, endDate);
    const aggregated: Record<string, number> = {};

    for (const daily of dailyAnalytics) {
      for (const [key, value] of Object.entries(daily.metrics)) {
        aggregated[key] = (aggregated[key] || 0) + value;
      }
    }

    return aggregated;
  }

  /**
   * Get statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    uniqueUsers: number;
    uniqueCreators: number;
    uniqueEvents: number;
  }> {
    const events = await this.db
      .collection(this.eventsCollection)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const eventsByType: Record<string, number> = {};
    const uniqueUsers = new Set<string>();
    const uniqueCreators = new Set<string>();
    const uniqueEvents = new Set<string>();

    events.docs.forEach((doc) => {
      const event = doc.data() as AnalyticsEvent;
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      if (event.userId) uniqueUsers.add(event.userId);
      if (event.creatorId) uniqueCreators.add(event.creatorId);
      if (event.eventId) uniqueEvents.add(event.eventId);
    });

    return {
      totalEvents: events.size,
      eventsByType,
      uniqueUsers: uniqueUsers.size,
      uniqueCreators: uniqueCreators.size,
      uniqueEvents: uniqueEvents.size,
    };
  }

  /**
   * Delete old events (cleanup)
   */
  async deleteOldEvents(beforeDate: Date): Promise<number> {
    const snapshot = await this.db
      .collection(this.eventsCollection)
      .where('timestamp', '<', beforeDate)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }
}

export const analyticsRepository = new AnalyticsRepository();
