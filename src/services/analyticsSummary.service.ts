import { AggregateField } from 'firebase-admin/firestore';
import { getFirestore } from './firebase';
import logger from '../utils/logger';
import { EVENT_STATUSES, storedValuesFor } from '../utils/eventLifecycle';

/**
 * Real-data analytics summaries computed with Firestore aggregation queries (count/sum) — no collection scans
 * except one bounded read of recent streams for duration. Any metric that cannot be computed is `null`
 * (never a fabricated 0); callers show it as "Unavailable".
 *
 * Revenue = sum over PAID orders of (subtotal - discount): ticket sales before tax and platform fee.
 * Required composite indexes are listed in firestore.indexes.json.
 */

export interface DateRange { start: Date; end: Date }

export interface SalesSummary {
  paidOrders: number | null;
  ticketsSold: number | null;
  grossSales: number | null;
}

export interface StreamSummary {
  streamsStarted: number | null;
  totalStreamMinutes: number | null;
  /** Highest viewer count recorded by the streaming service on any stream in the period. */
  peakRecordedViewers: number | null;
  /** True when more streams exist than the bounded read inspected (minutes/peak are then lower bounds). */
  truncated: boolean;
}

const STREAM_SCAN_LIMIT = 500;

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    logger.error(`analytics summary: ${label} failed`, err);
    return null;
  }
}

export class AnalyticsSummaryService {
  private get db() {
    return getFirestore();
  }

  private async sales(field: 'creatorId' | 'eventId', id: string, range: DateRange): Promise<SalesSummary> {
    const db = this.db;
    if (!db) return { paidOrders: null, ticketsSold: null, grossSales: null };
    const orders = () =>
      db.collection('orders').where(field, '==', id).where('status', '==', 'paid')
        .where('createdAt', '>=', range.start).where('createdAt', '<=', range.end);
    const tickets = () =>
      db.collection('tickets').where(field, '==', id).where('status', 'in', ['active', 'used'])
        .where('createdAt', '>=', range.start).where('createdAt', '<=', range.end);

    const [paidOrders, ticketsSold, sums] = await Promise.all([
      safe('paidOrders', async () => (await orders().count().get()).data().count),
      safe('ticketsSold', async () => (await tickets().count().get()).data().count),
      safe('grossSales', async () => {
        const d = (await orders().aggregate({ subtotal: AggregateField.sum('subtotal'), discount: AggregateField.sum('discount') }).get()).data();
        return Math.round(((d.subtotal || 0) - (d.discount || 0)) * 100) / 100;
      }),
    ]);
    return { paidOrders, ticketsSold, grossSales: sums };
  }

  private async streams(field: 'creatorId' | 'eventId', id: string, range: DateRange): Promise<StreamSummary> {
    const db = this.db;
    if (!db) return { streamsStarted: null, totalStreamMinutes: null, peakRecordedViewers: null, truncated: false };
    const base = () =>
      db.collection('streams').where(field, '==', id).where('startedAt', '>=', range.start).where('startedAt', '<=', range.end);

    const streamsStarted = await safe('streamsStarted', async () => (await base().count().get()).data().count);
    const scanned = await safe('streamScan', async () => {
      const snap = await base().orderBy('startedAt', 'desc').limit(STREAM_SCAN_LIMIT).get();
      let ms = 0;
      let peak = 0;
      snap.docs.forEach((d) => {
        const x: any = d.data();
        const started = x.startedAt?.toDate ? x.startedAt.toDate() : x.startedAt ? new Date(x.startedAt) : null;
        const ended = x.endedAt?.toDate ? x.endedAt.toDate() : x.endedAt ? new Date(x.endedAt) : null;
        if (started && ended && ended > started) ms += ended.getTime() - started.getTime();
        if (typeof x.peakViewers === 'number') peak = Math.max(peak, x.peakViewers);
      });
      return { minutes: Math.round(ms / 60000), peak, size: snap.size };
    });
    return {
      streamsStarted,
      totalStreamMinutes: scanned ? scanned.minutes : null,
      peakRecordedViewers: scanned ? scanned.peak : null,
      truncated: !!scanned && scanned.size >= STREAM_SCAN_LIMIT,
    };
  }

  async getCreatorSummary(creatorId: string, range: DateRange) {
    const db = this.db;
    const eventsByStatus: Record<string, number | null> = {};
    if (db) {
      await Promise.all(
        EVENT_STATUSES.map(async (status) => {
          eventsByStatus[status] = await safe(`events:${status}`, async () => {
            const stored = storedValuesFor(status);
            const q = db.collection('events').where('creatorUid', '==', creatorId);
            const scoped = stored.length > 1 ? q.where('status', 'in', stored) : q.where('status', '==', stored[0]);
            return (await scoped.count().get()).data().count;
          });
        })
      );
    }
    const [sales, streams] = await Promise.all([this.sales('creatorId', creatorId, range), this.streams('creatorId', creatorId, range)]);
    return { range: { start: range.start.toISOString(), end: range.end.toISOString() }, eventsByStatus, sales, streams };
  }

  async getEventSummary(eventId: string, range: DateRange) {
    const [sales, streams] = await Promise.all([this.sales('eventId', eventId, range), this.streams('eventId', eventId, range)]);
    return { range: { start: range.start.toISOString(), end: range.end.toISOString() }, sales, streams };
  }

  async getPlatformSummary(range: DateRange) {
    const db = this.db;
    if (!db) return { range: { start: range.start.toISOString(), end: range.end.toISOString() }, sales: { paidOrders: null, ticketsSold: null, grossSales: null }, newUsers: null, eventsCreated: null };
    const inRange = (col: string) => db.collection(col).where('createdAt', '>=', range.start).where('createdAt', '<=', range.end);
    const [paidOrders, ticketsSold, grossSales, newUsers, eventsCreated] = await Promise.all([
      safe('paidOrders', async () => (await inRange('orders').where('status', '==', 'paid').count().get()).data().count),
      safe('ticketsSold', async () => (await inRange('tickets').where('status', 'in', ['active', 'used']).count().get()).data().count),
      safe('grossSales', async () => {
        const d = (await inRange('orders').where('status', '==', 'paid').aggregate({ subtotal: AggregateField.sum('subtotal'), discount: AggregateField.sum('discount') }).get()).data();
        return Math.round(((d.subtotal || 0) - (d.discount || 0)) * 100) / 100;
      }),
      safe('newUsers', async () => (await inRange('users').count().get()).data().count),
      safe('eventsCreated', async () => (await inRange('events').count().get()).data().count),
    ]);
    return { range: { start: range.start.toISOString(), end: range.end.toISOString() }, sales: { paidOrders, ticketsSold, grossSales }, newUsers, eventsCreated };
  }
}

export const analyticsSummaryService = new AnalyticsSummaryService();
