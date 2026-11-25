import crypto from 'crypto';
import { handlePaymentWebhook, WebhookDeps } from '../paymentWebhook.service';

const hmac = (s: string, d: string) => crypto.createHmac('sha256', s).update(d).digest('hex');
const mk = (process: any = jest.fn(async () => ({}))): WebhookDeps => ({ razorpaySecret: 'rz', stripeSecret: 'st', process });

describe('handlePaymentWebhook', () => {
  const rzBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } }));
  const stBody = Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1' } } }));

  it('rejects unsigned / badly signed requests without processing', async () => {
    const deps = mk();
    expect((await handlePaymentWebhook('razorpay', rzBody, {}, deps)).status).toBe(400);
    expect((await handlePaymentWebhook('razorpay', rzBody, { 'x-razorpay-signature': hmac('wrong', rzBody.toString()) }, deps)).status).toBe(400);
    expect((await handlePaymentWebhook('stripe', stBody, { 'stripe-signature': 't=1,v1=00' }, deps)).status).toBe(400);
    expect(deps.process).not.toHaveBeenCalled();
  });

  it('is disabled (rejects everything) when no webhook secret is configured', async () => {
    const deps = { ...mk(), razorpaySecret: '' };
    expect((await handlePaymentWebhook('razorpay', rzBody, { 'x-razorpay-signature': hmac('', rzBody.toString()) }, deps)).status).toBe(400);
  });

  it('processes a correctly signed Razorpay event', async () => {
    const deps = mk();
    const r = await handlePaymentWebhook('razorpay', rzBody, { 'x-razorpay-signature': hmac('rz', rzBody.toString()) }, deps);
    expect(r.status).toBe(200);
    expect(deps.process).toHaveBeenCalledWith('pay_1', 'razorpay');
  });

  it('processes a correctly signed Stripe event', async () => {
    const deps = mk();
    const t = Math.floor(Date.now() / 1000);
    const r = await handlePaymentWebhook('stripe', stBody, { 'stripe-signature': `t=${t},v1=${hmac('st', `${t}.${stBody}`)}` }, deps);
    expect(r.status).toBe(200);
    expect(deps.process).toHaveBeenCalledWith('pi_1', 'stripe');
  });

  it('acknowledges unrelated events and unknown payments, retries on real failures, rejects unknown providers', async () => {
    const other = Buffer.from(JSON.stringify({ event: 'refund.created' }));
    const deps = mk();
    expect((await handlePaymentWebhook('razorpay', other, { 'x-razorpay-signature': hmac('rz', other.toString()) }, deps)).status).toBe(200);
    expect(deps.process).not.toHaveBeenCalled();
    const sig = { 'x-razorpay-signature': hmac('rz', rzBody.toString()) };
    expect((await handlePaymentWebhook('razorpay', rzBody, sig, mk(jest.fn(async () => { throw Object.assign(new Error('x'), { statusCode: 404 }); })))).status).toBe(200);
    expect((await handlePaymentWebhook('razorpay', rzBody, sig, mk(jest.fn(async () => { throw new Error('db down'); })))).status).toBe(500);
    expect((await handlePaymentWebhook('paypal', rzBody, sig, mk())).status).toBe(404);
  });
});
