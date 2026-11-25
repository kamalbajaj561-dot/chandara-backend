import { createPaymentForOrder, verifyAndFulfill, PaymentFlowDeps } from '../paymentFlow.service';
import { fulfillPaidOrder, FulfillmentDeps } from '../orderFulfillment.service';

const order: any = { orderId: 'o1', userId: 'u1', status: 'pending', total: 115, currency: 'USD', paymentProvider: 'razorpay' };
const payment: any = { paymentId: 'p1', orderId: 'o1', userId: 'u1', provider: 'razorpay' };

const deps = (over: Partial<PaymentFlowDeps> = {}): PaymentFlowDeps => ({
  getOrder: jest.fn(async () => order),
  linkPaymentToOrder: jest.fn(async () => undefined),
  createPayment: jest.fn(async () => ({ success: true, providerPaymentId: 'pp1', paymentUrl: 'https://pay' })) as any,
  findPaymentByProviderId: jest.fn(async () => payment),
  verify: jest.fn(async () => ({ success: true, status: 'paid', amount: 115 })) as any,
  fulfill: jest.fn(async () => ({ fulfilled: true })),
  ...over,
});

describe('createPaymentForOrder', () => {
  it('uses the stored order total/currency/provider, never client values, and an idempotency key', async () => {
    const d = deps();
    await createPaymentForOrder({ userId: 'u1', role: 'viewer' }, 'o1', d);
    expect(d.createPayment).toHaveBeenCalledWith('o1', 'u1', 115, 'USD', 'razorpay', expect.any(String), { orderId: 'o1' }, 'order:o1');
    expect(d.linkPaymentToOrder).toHaveBeenCalledWith('o1', 'p1');
  });
  it("hides other users' orders (404) and blocks non-pending orders (409)", async () => {
    await expect(createPaymentForOrder({ userId: 'evil', role: 'viewer' }, 'o1', deps())).rejects.toMatchObject({ statusCode: 404 });
    await expect(createPaymentForOrder({ userId: 'u1', role: 'viewer' }, 'o1', deps({ getOrder: async () => ({ ...order, status: 'paid' }) }))).rejects.toMatchObject({ statusCode: 409 });
    await expect(createPaymentForOrder({ userId: 'u1', role: 'viewer' }, 'nope', deps({ getOrder: async () => null }))).rejects.toMatchObject({ statusCode: 404 });
  });
  it('surfaces provider failure as 502', async () => {
    const d = deps({ createPayment: (async () => ({ success: false, error: 'down' })) as any });
    await expect(createPaymentForOrder({ userId: 'u1', role: 'viewer' }, 'o1', d)).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('verifyAndFulfill', () => {
  it('issues tickets only after a paid verification', async () => {
    const d = deps();
    const r = await verifyAndFulfill({ userId: 'u1', role: 'viewer' }, 'pp1', 'razorpay', d);
    expect(d.fulfill).toHaveBeenCalledWith('o1');
    expect(r.ticketsIssued).toBe(true);
    const d2 = deps({ verify: (async () => ({ success: true, status: 'pending', amount: 1 })) as any });
    await verifyAndFulfill({ userId: 'u1', role: 'viewer' }, 'pp1', 'razorpay', d2);
    expect(d2.fulfill).not.toHaveBeenCalled();
  });
  it("does not let a user verify someone else's payment, or use the wrong provider", async () => {
    await expect(verifyAndFulfill({ userId: 'evil', role: 'viewer' }, 'pp1', 'razorpay', deps())).rejects.toMatchObject({ statusCode: 404 });
    await expect(verifyAndFulfill({ userId: 'u1', role: 'viewer' }, 'pp1', 'stripe', deps())).rejects.toMatchObject({ statusCode: 404 });
  });
  it('allows the trusted internal (webhook) caller', async () => {
    const r = await verifyAndFulfill(null, 'pp1', 'razorpay', deps());
    expect(r.ticketsIssued).toBe(true);
  });
});

describe('fulfillPaidOrder idempotency', () => {
  const paidOrder: any = { orderId: 'o1', userId: 'u1', creatorId: 'c1', eventId: 'e1', currency: 'USD', subtotal: 100, items: [{ ticketType: 'regular', price: 50, quantity: 2 }] };
  const fd = (claim: any, createTickets?: any): FulfillmentDeps => ({
    claim: jest.fn(claim),
    release: jest.fn(async () => undefined),
    createTickets: jest.fn(createTickets || (async () => ({ success: true, tickets: [{ ticketId: 't1' }, { ticketId: 't2' }] }))),
  });
  it('issues once for the claim winner, nothing for losers', async () => {
    const winner = fd(async () => paidOrder);
    expect(await fulfillPaidOrder('o1', winner)).toEqual({ fulfilled: true });
    expect(winner.createTickets).toHaveBeenCalledWith('e1', 'u1', 'c1', 'o1', paidOrder.items, 'USD');
    const loser = fd(async () => null);
    expect(await fulfillPaidOrder('o1', loser)).toEqual({ fulfilled: false });
    expect(loser.createTickets).not.toHaveBeenCalled();
  });
  it('releases the claim when issuance fails so it can be retried', async () => {
    const f = fd(async () => paidOrder, async () => ({ success: false, error: 'sold out', tickets: [] }));
    const r = await fulfillPaidOrder('o1', f);
    expect(r.fulfilled).toBe(false);
    expect(f.release).toHaveBeenCalledWith('o1');
    const g = fd(async () => paidOrder, async () => { throw new Error('boom'); });
    expect((await fulfillPaidOrder('o1', g)).fulfilled).toBe(false);
    expect(g.release).toHaveBeenCalled();
  });
});
