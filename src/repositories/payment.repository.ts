import { getFirestore } from '../services/firebase';
import { Payment } from '../types';
import admin from 'firebase-admin';

export class PaymentRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'payments';

  async create(paymentData: Omit<Payment, 'paymentId' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    const now = new Date();
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.collection(this.collection).doc(paymentId).set({
      ...paymentData,
      paymentId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(paymentId).get();
    return this.mapDocToPayment(doc);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Payment | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToPayment(snapshot.docs[0]);
  }

  async createWithIdempotency(
    paymentData: Omit<Payment, 'paymentId' | 'createdAt' | 'updatedAt'> & { idempotencyKey: string }
  ): Promise<{ payment: Payment; created: boolean }> {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    const now = new Date();
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use transaction to ensure idempotency
    const result = await db!.runTransaction(async (transaction) => {
      const idempotencyRef = this.db.collection(this.collection).where('idempotencyKey', '==', paymentData.idempotencyKey).limit(1);
      const snapshot = await transaction.get(idempotencyRef);

      if (!snapshot.empty) {
        // Payment with this idempotency key already exists
        const existingPayment = this.mapDocToPayment(snapshot.docs[0]);
        return { payment: existingPayment, created: false };
      }

      // Create new payment
      const newPaymentData = {
        ...paymentData,
        paymentId,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(this.db.collection(this.collection).doc(paymentId), newPaymentData);

      const payment: Payment = {
        ...newPaymentData,
        paymentId,
      };

      return { payment, created: true };
    });

    return result;
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const doc = await this.db.collection(this.collection).doc(paymentId).get();
    if (!doc.exists) return null;
    return this.mapDocToPayment(doc);
  }

  async findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('providerPaymentId', '==', providerPaymentId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToPayment(snapshot.docs[0]);
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('orderId', '==', orderId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToPayment(doc));
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<Payment[]> {
    const maxLimit = Math.min(limit, 100); // Enforce maximum limit of 100
    
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(maxLimit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToPayment(doc));
  }

  async update(paymentId: string, paymentData: Partial<Payment>): Promise<Payment | null> {
    const docRef = this.db.collection(this.collection).doc(paymentId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...paymentData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToPayment(updatedDoc);
  }

  async updateStatus(paymentId: string, status: Payment['status']): Promise<Payment | null> {
    return this.update(paymentId, { status });
  }

  async delete(paymentId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(paymentId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async getStatistics(eventId: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    totalAmount: number;
    revenue: number;
  }> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .get();

    const payments = snapshot.docs.map((doc) => this.mapDocToPayment(doc));

    return {
      total: payments.length,
      successful: payments.filter((p) => p.status === 'paid').length,
      failed: payments.filter((p) => p.status === 'failed').length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      revenue: payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    };
  }

  private mapDocToPayment(doc: admin.firestore.DocumentSnapshot): Payment {
    const data = doc.data() as Record<string, any>;
    return {
      paymentId: doc.id,
      orderId: data.orderId || '',
      userId: data.userId || '',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      provider: data.provider || 'razorpay',
      providerPaymentId: data.providerPaymentId || '',
      status: data.status || 'pending',
      metadata: data.metadata || {},
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const paymentRepository = new PaymentRepository();
