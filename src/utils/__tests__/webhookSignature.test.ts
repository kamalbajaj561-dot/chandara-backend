import crypto from 'crypto';
import { verifyRazorpaySignature, verifyStripeSignature } from '../webhookSignature';

const hmac = (secret: string, data: string) => crypto.createHmac('sha256', secret).update(data).digest('hex');

describe('webhook signatures', () => {
  const body = JSON.stringify({ id: 'evt_1' });
  const secret = 'whsec_test_secret';

  it('accepts a valid Razorpay signature and rejects tampering/missing/empty secret', () => {
    const sig = hmac(secret, body);
    expect(verifyRazorpaySignature(body, sig, secret)).toBe(true);
    expect(verifyRazorpaySignature(body + ' ', sig, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, hmac('other', body), secret)).toBe(false);
    expect(verifyRazorpaySignature(body, undefined, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, sig, '')).toBe(false);
    expect(verifyRazorpaySignature(body, 'zz', secret)).toBe(false);
  });

  it('accepts a valid Stripe signature within tolerance', () => {
    const t = 1_700_000_000;
    const header = `t=${t},v1=${hmac(secret, `${t}.${body}`)}`;
    expect(verifyStripeSignature(body, header, secret, 300, t + 10)).toBe(true);
  });

  it('rejects stale (replayed), tampered, malformed Stripe signatures and empty secrets', () => {
    const t = 1_700_000_000;
    const header = `t=${t},v1=${hmac(secret, `${t}.${body}`)}`;
    expect(verifyStripeSignature(body, header, secret, 300, t + 301)).toBe(false);
    expect(verifyStripeSignature(body + 'x', header, secret, 300, t)).toBe(false);
    expect(verifyStripeSignature(body, 'v1=abc', secret, 300, t)).toBe(false);
    expect(verifyStripeSignature(body, header, '', 300, t)).toBe(false);
    expect(verifyStripeSignature(body, undefined, secret, 300, t)).toBe(false);
  });
});
