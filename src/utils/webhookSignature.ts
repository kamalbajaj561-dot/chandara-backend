import crypto from 'crypto';

const safeEqualHex = (a: string, b: string): boolean => {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
};

/** Razorpay: hex HMAC-SHA256 of the raw request body, sent in X-Razorpay-Signature. */
export function verifyRazorpaySignature(rawBody: Buffer | string, signature: string | undefined, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(signature, expected);
}

/** Stripe: header `t=<unix>,v1=<hex>[,v1=...]`; HMAC-SHA256 of `${t}.${rawBody}`; reject stale timestamps (replay). */
export function verifyStripeSignature(
  rawBody: Buffer | string,
  header: string | undefined,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret || !header) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || sigs.length === 0 || !/^\d+$/.test(t)) return false;
  if (Math.abs(nowSeconds - Number(t)) > toleranceSeconds) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody.toString()}`).digest('hex');
  return sigs.some((s) => safeEqualHex(s, expected));
}
