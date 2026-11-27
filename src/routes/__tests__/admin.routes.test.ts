import express from 'express';
import request from 'supertest';

let currentUser: any = null;
jest.mock('../../middleware/auth', () => {
  const actual = jest.requireActual('../../middleware/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      if (!currentUser) return next(new (require('../../middleware/errorHandler').AppError)('No token provided', 401));
      req.user = currentUser;
      next();
    },
  };
});

const handled = jest.fn();
jest.mock('../../controllers/admin.controller', () => {
  const handler = async (_req: any, res: any) => { handled(); res.json({ ok: true }); };
  return {
    AdminController: class {
      [k: string]: any;
      constructor() {
        return new Proxy(this, { get: (_t, prop) => (typeof prop === 'string' ? handler : undefined) });
      }
    },
  };
});

import adminRoutes from '../admin.routes';
import { errorHandler } from '../../middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use(errorHandler);

// Sensitive, representative endpoints across every admin area.
const endpoints: Array<[string, string]> = [
  ['get', '/admin/dashboard'],
  ['get', '/admin/users'],
  ['get', '/admin/events'],
  ['get', '/admin/users/search'],
  ['post', '/admin/users/u1/ban'],
  ['post', '/admin/users/u1/role'],
  ['post', '/admin/events/e1/approve'],
  ['delete', '/admin/events/e1'],
  ['post', '/admin/streams/s1/stop'],
  ['delete', '/admin/chat/messages/m1'],
  ['post', '/admin/refunds/r1/approve'],
  ['post', '/admin/payments/p1/adjust'],
  ['post', '/admin/tickets/t1/void'],
  ['post', '/admin/coupons'],
  ['post', '/admin/notifications/broadcast'],
  ['put', '/admin/settings'],
  ['get', '/admin/audit'],
];

describe('admin routes authorization', () => {
  beforeEach(() => { handled.mockClear(); });

  it.each(endpoints)('rejects anonymous %s %s with 401', async (method, path) => {
    currentUser = null;
    const res = await (request(app) as any)[method](path).send({});
    expect(res.status).toBe(401);
    expect(handled).not.toHaveBeenCalled();
  });

  it.each(['viewer', 'creator', 'moderator'])('rejects the %s role with 403 on every endpoint', async (role) => {
    currentUser = { userId: 'u1', role };
    for (const [method, path] of endpoints) {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(403);
    }
    expect(handled).not.toHaveBeenCalled();
  });

  it('lets administrators through', async () => {
    currentUser = { userId: 'a1', role: 'administrator' };
    for (const [method, path] of endpoints) {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(200);
    }
    expect(handled).toHaveBeenCalledTimes(endpoints.length);
  });
});
