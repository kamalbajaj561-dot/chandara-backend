import { getFirestore } from '../services/firebase';
import { TicketingOrder, OrderStatus } from '../types';
import admin from 'firebase-admin';

export class OrderRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'orders';

  async create(orderData: Omit<TicketingOrder, 'orderId' | 'createdAt' | 'updatedAt'>): Promise<TicketingOrder> {
    const now = new Date();
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.collection(this.collection).doc(orderId).set({
      ...orderData,
      orderId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(orderId).get();
    return this.mapDocToOrder(doc);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<TicketingOrder | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToOrder(snapshot.docs[0]);
  }

  async createWithIdempotency(
    orderData: Omit<TicketingOrder, 'orderId' | 'createdAt' | 'updatedAt'> & { idempotencyKey: string }
  ): Promise<{ order: TicketingOrder; created: boolean }> {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    const now = new Date();
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await db!.runTransaction(async (transaction: admin.firestore.Transaction) => {
      const idempotencyRef = db!.collection(this.collection).where('idempotencyKey', '==', orderData.idempotencyKey).limit(1);
      const snapshot = await transaction.get(idempotencyRef);

      if (!snapshot.empty) {
        const existingOrder = this.mapDocToOrder(snapshot.docs[0]);
        return { order: existingOrder, created: false };
      }

      const newOrderData = {
        ...orderData,
        orderId,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(this.db.collection(this.collection).doc(orderId), newOrderData);

      const order: TicketingOrder = {
        ...newOrderData,
        orderId,
      };

      return { order, created: true };
    });

    return result;
  }

  async findById(orderId: string): Promise<TicketingOrder | null> {
    const doc = await this.db.collection(this.collection).doc(orderId).get();
    if (!doc.exists) return null;
    return this.mapDocToOrder(doc);
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<TicketingOrder[]> {
    const maxLimit = Math.min(limit, 100); // Enforce maximum limit of 100
    
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(maxLimit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToOrder(doc));
  }

  async findByCreatorId(creatorId: string, limit = 20, offset = 0): Promise<TicketingOrder[]> {
    const maxLimit = Math.min(limit, 100); // Enforce maximum limit of 100
    
    const snapshot = await this.db
      .collection(this.collection)
      .where('creatorId', '==', creatorId)
      .orderBy('createdAt', 'desc')
      .limit(maxLimit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToOrder(doc));
  }

  async findByEventId(eventId: string, limit = 20, offset = 0): Promise<TicketingOrder[]> {
    const maxLimit = Math.min(limit, 100); // Enforce maximum limit of 100
    
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(maxLimit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToOrder(doc));
  }

  async findByPaymentId(paymentId: string): Promise<TicketingOrder | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('paymentId', '==', paymentId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToOrder(snapshot.docs[0]);
  }

  async update(orderId: string, orderData: Partial<TicketingOrder>): Promise<TicketingOrder | null> {
    const docRef = this.db.collection(this.collection).doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...orderData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToOrder(updatedDoc);
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<TicketingOrder | null> {
    return this.update(orderId, { status });
  }

  /**
   * Valid order status transitions
   */
  private readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    pending: ['paid', 'failed', 'cancelled'],
    paid: ['refunded', 'cancelled'],
    failed: ['pending', 'cancelled'],
    cancelled: [],
    refunded: [],
  };

  isValidTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    return this.VALID_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
  }

  async cancelOrder(orderId: string): Promise<TicketingOrder | null> {
    return this.update(orderId, { status: 'cancelled' });
  }

  async delete(orderId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async getStatistics(eventId: string): Promise<{
    total: number;
    paid: number;
    pending: number;
    failed: number;
    cancelled: number;
    refunded: number;
    revenue: number;
  }> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .get();

    const orders = snapshot.docs.map((doc) => this.mapDocToOrder(doc));

    return {
      total: orders.length,
      paid: orders.filter((o) => o.status === 'paid').length,
      pending: orders.filter((o) => o.status === 'pending').length,
      failed: orders.filter((o) => o.status === 'failed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      refunded: orders.filter((o) => o.status === 'refunded').length,
      revenue: orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.total, 0),
    };
  }

  private mapDocToOrder(doc: admin.firestore.DocumentSnapshot): TicketingOrder {
    const data = doc.data() as Record<string, any>;
    return {
      orderId: doc.id,
      userId: data.userId || '',
      creatorId: data.creatorId || '',
      eventId: data.eventId || '',
      ticketIds: data.ticketIds || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      platformFee: data.platformFee || 0,
      total: data.total || 0,
      currency: data.currency || 'USD',
      status: data.status || 'pending',
      paymentProvider: data.paymentProvider || 'razorpay',
      paymentId: data.paymentId || undefined,
      couponId: data.couponId || undefined,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const orderRepository = new OrderRepository();
