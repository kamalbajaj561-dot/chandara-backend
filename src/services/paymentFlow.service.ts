import { TicketingOrder, Payment, PaymentProvider } from '../types';
import { orderRepository } from '../repositories/order.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { paymentService } from './payment.service';
import { fulfillPaidOrder } from './orderFulfillment.service';
import { AppError } from '../middleware/errorHandler';
import config from '../config';

export interface PaymentFlowDeps {
  getOrder: (id: string) => Promise<TicketingOrder | null>;
  linkPaymentToOrder: (orderId: string, paymentId: string) => Promise<unknown>;
  createPayment: typeof paymentService.createPayment;
  findPaymentByProviderId: (id: string) => Promise<Payment | null>;
  verify: typeof paymentService.verifyPayment;
  fulfill: (orderId: string) => Promise<{ fulfilled: boolean; error?: string }>;
}

const defaultDeps: PaymentFlowDeps = {
  getOrder: (id) => orderRepository.findById(id),
  linkPaymentToOrder: (orderId, paymentId) => orderRepository.update(orderId, { paymentId }),
  createPayment: (...a) => paymentService.createPayment(...a),
  findPaymentByProviderId: (id) => paymentRepository.findByProviderPaymentId(id),
  verify: (...a) => paymentService.verifyPayment(...a),
  fulfill: (id) => fulfillPaidOrder(id),
};

export interface Actor {
  userId: string;
  role: string;
}
const isAdmin = (a: Actor) => a.role === 'administrator';

/**
 * Starts a payment for an existing order. Amount, currency and provider come from the stored order
 * (which was priced server-side) - nothing about money is taken from the request.
 */
export async function createPaymentForOrder(actor: Actor, orderId: string, deps: PaymentFlowDeps = defaultDeps) {
  const order = await deps.getOrder(orderId);
  if (!order || (order.userId !== actor.userId && !isAdmin(actor))) {
    throw new AppError('Order not found', 404); // same answer for "not yours" to avoid leaking ids
  }
  if (order.status !== 'pending') {
    throw new AppError(`Order is already ${order.status}`, 409);
  }
  if (config.nodeEnv === 'production' && order.paymentProvider === 'mock') {
    throw new AppError('Mock payments are disabled in production', 400);
  }

  // One payment per order: repeated clicks / retries return the same payment instead of charging twice.
  const result = await deps.createPayment(
    order.orderId,
    order.userId,
    order.total,
    order.currency,
    order.paymentProvider,
    `Chandara tickets (order ${order.orderId})`,
    { orderId: order.orderId },
    `order:${order.orderId}`
  );
  if (!result.success || !result.providerPaymentId) {
    throw new AppError(result.error || 'Could not start payment', 502);
  }

  const payment = await deps.findPaymentByProviderId(result.providerPaymentId);
  if (payment && order.paymentId !== payment.paymentId) {
    await deps.linkPaymentToOrder(order.orderId, payment.paymentId);
  }
  return { orderId: order.orderId, providerPaymentId: result.providerPaymentId, paymentUrl: result.paymentUrl };
}

/** Verifies a payment with the provider and, if it succeeded, issues the tickets (idempotent). */
export async function verifyAndFulfill(
  actor: Actor | null, // null = trusted internal caller (signature-verified webhook)
  providerPaymentId: string,
  provider: PaymentProvider,
  deps: PaymentFlowDeps = defaultDeps
) {
  const payment = await deps.findPaymentByProviderId(providerPaymentId);
  if (!payment || payment.provider !== provider) {
    throw new AppError('Payment not found', 404);
  }
  if (actor && payment.userId !== actor.userId && !isAdmin(actor)) {
    throw new AppError('Payment not found', 404);
  }

  const verification = await deps.verify(providerPaymentId, provider);
  let ticketsIssued = false;
  if (verification.success && verification.status === 'paid') {
    const result = await deps.fulfill(payment.orderId);
    ticketsIssued = result.fulfilled;
  }
  return { ...verification, orderId: payment.orderId, ticketsIssued };
}
