const mockDb: any = { collection: jest.fn() };
jest.mock('../firebase', () => ({ getFirestore: () => mockDb }));
jest.mock('firebase-admin/firestore', () => ({ AggregateField: { sum: (f: string) => ({ sum: f }) } }));

import { AnalyticsSummaryService } from '../analyticsSummary.service';

type Spec = { count?: number | Error; agg?: Record<string, number> | Error; docs?: any[] };

/** Fake query builder: every .where/.orderBy/.limit returns itself; terminal calls read from the spec. */
const query = (spec: Spec) => {
  const q: any = {};
  ['where', 'orderBy', 'limit'].forEach((m) => (q[m] = jest.fn(() => q)));
  q.count = () => ({ get: async () => { if (spec.count instanceof Error) throw spec.count; return { data: () => ({ count: spec.count ?? 0 }) }; } });
  q.aggregate = () => ({ get: async () => { if (spec.agg instanceof Error) throw spec.agg; return { data: () => spec.agg ?? {} }; } });
  q.get = async () => ({ docs: (spec.docs || []).map((d) => ({ data: () => d })), size: (spec.docs || []).length });
  return q;
};
const range = { start: new Date('2026-01-01'), end: new Date('2026-02-01') };

describe('AnalyticsSummaryService', () => {
  const svc = new AnalyticsSummaryService();

  it('computes creator sales from aggregation queries (gross = subtotal - discount)', async () => {
    mockDb.collection.mockImplementation((name: string) =>
      name === 'orders' ? query({ count: 4, agg: { subtotal: 100, discount: 10.5 } })
      : name === 'tickets' ? query({ count: 6 })
      : name === 'streams' ? query({ count: 0, docs: [] })
      : query({ count: 2 }));
    const r = await svc.getCreatorSummary('c1', range);
    expect(r.sales).toEqual({ paidOrders: 4, ticketsSold: 6, grossSales: 89.5 });
    expect(r.eventsByStatus.pending).toBe(2);
  });

  it('sums stream minutes and peak viewers from recorded streams', async () => {
    const t = (s: string) => new Date(s);
    mockDb.collection.mockImplementation((name: string) =>
      name === 'streams'
        ? query({ count: 2, docs: [
            { startedAt: t('2026-01-05T10:00:00Z'), endedAt: t('2026-01-05T11:30:00Z'), peakViewers: 40 },
            { startedAt: t('2026-01-06T10:00:00Z'), endedAt: t('2026-01-06T10:30:00Z'), peakViewers: 75 },
            { startedAt: t('2026-01-07T10:00:00Z'), peakViewers: 3 }, // never ended: not counted as duration
          ] })
        : query({ count: 0, agg: {} }));
    const r = await svc.getEventSummary('e1', range);
    expect(r.streams).toEqual({ streamsStarted: 2, totalStreamMinutes: 120, peakRecordedViewers: 75, truncated: false });
  });

  it('returns null (never a fake 0) for metrics whose query fails', async () => {
    mockDb.collection.mockImplementation((name: string) =>
      name === 'orders' ? query({ count: new Error('index missing'), agg: new Error('index missing') }) : query({ count: 3 }));
    const r = await svc.getEventSummary('e1', range);
    expect(r.sales.paidOrders).toBeNull();
    expect(r.sales.grossSales).toBeNull();
    expect(r.sales.ticketsSold).toBe(3);
  });

  it('reports everything as unavailable when Firestore is not initialised', async () => {
    const s2 = new AnalyticsSummaryService();
    jest.spyOn(s2 as any, 'db', 'get').mockReturnValue(null);
    const r = await s2.getPlatformSummary(range);
    expect(r.sales).toEqual({ paidOrders: null, ticketsSold: null, grossSales: null });
    expect(r.newUsers).toBeNull();
  });
});
