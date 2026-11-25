import express from 'express';
import request from 'supertest';

let currentUser: any = { userId: 'u1', role: 'viewer' };

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
jest.mock('../../services/order.service', () => ({
  orderService: {
    createOrder: jest.fn(async () => ({ success: true, order: { orderId: 'o1' } })),
    updateOrderStatus: jest.fn(async () => ({ orderId: 'o1', status: 'paid' })),
  },
}));
jest.mock('../../services/paymentFlow.service', () => ({
  createPaymentForOrder: jest.fn(async () => ({ orderId: 'o1', providerPaymentId: 'pp1' })),
  verifyAndFulfill: jest.fn(),
}));
const processRefund = jest.fn();
jest.mock('../../services/payment.service', () => ({ paymentService: { processRefund: (...a: any[]) => processRefund(...a) } }));

import orderRoutes from '../order.routes';
import paymentRoutes from '../payment.routes';
import { errorHandler } from '../../middleware/errorHandler';
import { orderService } from '../../services/order.service';

const app = express();
app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
app.use('/orders', orderRoutes);
app.use('/payments', paymentRoutes);
app.use(errorHandler);

const goodOrder = { eventId: 'e1', items: [{ ticketType: 'general', price: 10, quantity: 1 }], currency: 'USD', paymentProvider: 'razorpay' };

beforeEach(() => {
  currentUser = { userId: 'u1', role: 'viewer' };
  jest.clearAllMocks();
});

describe('checkout routes (real Express stack)', () => {
  it('requires authentication', async () => {
    currentUser = null;
    await request(app).post('/orders').send(goodOrder).expect(401);
  });

  it('accepts a valid order body (validator runs on the body, not the request)', async () => {
    await request(app).post('/orders').send(goodOrder).expect(201);
    expect(orderService.createOrder).toHaveBeenCalled();
  });

  it('rejects an invalid order body with 400 before reaching the service', async () => {
    await request(app).post('/orders').send({ eventId: 'e1' }).expect(400);
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it('lets only administrators change order status', async () => {
    await request(app).put('/orders/o1/status').send({ status: 'paid' }).expect(403);
    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
    currentUser = { userId: 'a1', role: 'administrator' };
    await request(app).put('/orders/o1/status').send({ status: 'paid' }).expect(200);
  });

  it('lets only administrators issue direct refunds', async () => {
    await request(app).post('/payments/refund').send({ paymentId: 'p1', amount: 5 }).expect(403);
    expect(processRefund).not.toHaveBeenCalled();
  });

  it('creates a payment from an order id', async () => {
    await request(app).post('/payments').send({ orderId: 'o1', amount: 1, currency: 'USD', provider: 'mock' }).expect(201);
  });

  it('rejects unsigned webhooks without authentication being required', async () => {
    await request(app).post('/payments/webhook/razorpay').send({ event: 'payment.captured' }).expect(400);
    await request(app).post('/payments/webhook/unknown').send({}).expect(404);
  });
});
