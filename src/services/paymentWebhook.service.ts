import { verifyRazorpaySignature, verifyStripeSignature } from '../utils/webhookSignature';
import { verifyAndFulfill } from './paymentFlow.service';
import config from '../config';
import logger from '../utils/logger';

export interface WebhookResult {
  status: number;
  body: { received: boolean; error?: string };
}

export interface WebhookDeps {
  razorpaySecret: string;
  stripeSecret: string;
  process: (providerPaymentId: string, provider: 'razorpay' | 'stripe') => Promise<unknown>;
}

const defaultDeps = (): WebhookDeps => ({
  razorpaySecret: config.razorpay.webhookSecret,
  stripeSecret: config.stripe.webhookSecret,
  process: (id, provider) => verifyAndFulfill(null, id, provider),
});

/**
 * Handles a payment-provider webhook. The signature is checked over the exact raw bytes; the payload is
 * then used only to find WHICH payment to re-verify - the provider's own API decides whether it was paid.
 * Redelivery is harmless: verification and ticket issuance are idempotent.
 */
export async function handlePaymentWebhook(
  provider: string,
  rawBody: Buffer | undefined,
  headers: Record<string, string | string[] | undefined>,
  deps: WebhookDeps = defaultDeps()
): Promise<WebhookResult> {
  if (provider !== 'razorpay' && provider !== 'stripe') {
    return { status: 404, body: { received: false, error: 'Unknown provider' } };
  }
  if (!rawBody || rawBody.length === 0) {
    return { status: 400, body: { received: false, error: 'Empty body' } };
  }
  const header = (name: string) => {
    const v = headers[name];
    return Array.isArray(v) ? v[0] : v;
  };

  const valid =
    provider === 'razorpay'
      ? verifyRazorpaySignature(rawBody, header('x-razorpay-signature'), deps.razorpaySecret)
      : verifyStripeSignature(rawBody, header('stripe-signature'), deps.stripeSecret);
  if (!valid) {
    logger.warn(`Rejected ${provider} webhook with invalid signature`);
    return { status: 400, body: { received: false, error: 'Invalid signature' } };
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return { status: 400, body: { received: false, error: 'Invalid JSON' } };
  }

  let providerPaymentId: string | undefined;
  if (provider === 'stripe' && ['payment_intent.succeeded', 'payment_intent.payment_failed'].includes(event?.type)) {
    providerPaymentId = event?.data?.object?.id;
  } else if (provider === 'razorpay' && ['payment.captured', 'payment.failed'].includes(event?.event)) {
    providerPaymentId = event?.payload?.payment?.entity?.id;
  }
  if (!providerPaymentId) {
    return { status: 200, body: { received: true } }; // event type we don't act on
  }

  try {
    await deps.process(providerPaymentId, provider);
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return { status: 200, body: { received: true } }; // not one of our payments; don't make the provider retry
    }
    logger.error(`Webhook processing failed for ${provider}:`, error);
    return { status: 500, body: { received: false, error: 'Processing failed' } }; // provider will retry
  }
  return { status: 200, body: { received: true } };
}
