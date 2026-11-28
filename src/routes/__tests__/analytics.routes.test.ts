import express from 'express';
import request from 'supertest';

let currentUser: any = null;
jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    if (!currentUser) return next(new (require('../../middleware/errorHandler').AppError)('Authentication required', 401));
    req.user = currentUser;
    next();
  },
  optionalAuth: (req: any, _res: any, next: any) => { if (currentUser) req.user = currentUser; next(); },
  requireRole: (...roles: string[]) => (req: any, _res: any, next: any) =>
    roles.includes(req.user.role) ? next() : next(new (require('../../middleware/errorHandler').AppError)('Insufficient permissions', 403)),
}));
jest.mock('../../services/event.service', () => ({
  eventService: { getEvent: async (id: string) => { if (id === 'e1') return { id: 'e1', creatorUid: 'c1' }; throw new Error('nf'); } },
}));
const summary = { getCreatorSummary: jest.fn(async () => ({ ok: 'creator' })), getEventSummary: jest.fn(async () => ({ ok: 'event' })), getPlatformSummary: jest.fn(async () => ({ ok: 'platform' })) };
jest.mock('../../services/analyticsSummary.service', () => ({ analyticsSummaryService: summary }));
jest.mock('../../controllers/analytics.controller', () => {
  const h = (_q: any, res: any) => res.json({ success: true });
  return { analyticsController: new Proxy({}, { get: () => ({ bind: () => h }) }), CLIENT_REPORTABLE_EVENT_TYPES: ['page_view'] };
});

import analyticsRoutes from '../analytics.routes';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/analytics', analyticsRoutes);
app.use(errorHandler);

const as = (u: any) => { currentUser = u; };

describe('analytics route authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires authentication', async () => {
    as(null);
    expect((await request(app).get('/analytics/summary/creator/c1')).status).toBe(401);
    expect((await request(app).get('/analytics/creator/c1')).status).toBe(401);
  });

  it("lets a creator read only their own analytics", async () => {
    as({ id: 'c1', role: 'creator' });
    expect((await request(app).get('/analytics/summary/creator/c1')).status).toBe(200);
    expect((await request(app).get('/analytics/creator/c1')).status).toBe(200);
    expect((await request(app).get('/analytics/summary/creator/c2')).status).toBe(403);
    expect((await request(app).get('/analytics/creator/c2')).status).toBe(403);
    expect(summary.getCreatorSummary).toHaveBeenCalledTimes(1);
  });

  it("lets only the event owner or an admin read event analytics (summary, stream and chat)", async () => {
    as({ id: 'c1', role: 'creator' });
    for (const p of ['/analytics/summary/event/e1', '/analytics/event/e1', '/analytics/stream/e1', '/analytics/chat/e1']) {
      expect((await request(app).get(p)).status).toBe(200);
    }
    as({ id: 'c2', role: 'creator' });
    for (const p of ['/analytics/summary/event/e1', '/analytics/event/e1', '/analytics/stream/e1', '/analytics/chat/e1']) {
      expect((await request(app).get(p)).status).toBe(403);
    }
    as({ id: 'a1', role: 'administrator' });
    expect((await request(app).get('/analytics/summary/event/e1')).status).toBe(200);
  });

  it('keeps platform-wide analytics administrator-only', async () => {
    as({ id: 'c1', role: 'creator' });
    for (const p of ['/analytics/summary/platform', '/analytics/platform', '/analytics/revenue', '/analytics/dashboard', '/analytics/trends', '/analytics/user']) {
      expect((await request(app).get(p)).status).toBe(403);
    }
    as({ id: 'a1', role: 'administrator' });
    expect((await request(app).get('/analytics/summary/platform')).status).toBe(200);
    expect((await request(app).get('/analytics/dashboard')).status).toBe(200);
  });

  it('validates the date range', async () => {
    as({ id: 'a1', role: 'administrator' });
    expect((await request(app).get('/analytics/summary/platform?startDate=nope')).status).toBe(400);
    expect((await request(app).get('/analytics/summary/platform?startDate=2026-03-01&endDate=2026-01-01')).status).toBe(400);
    expect((await request(app).get('/analytics/summary/platform?startDate=2020-01-01&endDate=2026-01-01')).status).toBe(400);
    expect((await request(app).get('/analytics/summary/platform?startDate=2026-01-01&endDate=2026-02-01')).status).toBe(200);
  });
});
