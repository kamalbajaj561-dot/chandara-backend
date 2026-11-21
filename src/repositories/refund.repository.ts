import { getFirestore } from '../services/firebase';
import { Refund } from '../types';
import admin from 'firebase-admin';

export class RefundRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'refunds';

  async create(refundData: Omit<Refund, 'refundId' | 'createdAt' | 'updatedAt'>): Promise<Refund> {
    const now = new Date();
    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.collection(this.collection).doc(refundId).set({
      ...refundData,
      refundId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(refundId).get();
    return this.mapDocToRefund(doc);
  }

  async findById(refundId: string): Promise<Refund | null> {
    const doc = await this.db.collection(this.collection).doc(refundId).get();
    if (!doc.exists) return null;
    return this.mapDocToRefund(doc);
  }

  async findByOrderId(orderId: string): Promise<Refund[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('orderId', '==', orderId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToRefund(doc));
  }

  async findByUserId(userId: string, limit = 50): Promise<Refund[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToRefund(doc));
  }

  async findByStatus(status: Refund['status'], limit = 50): Promise<Refund[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToRefund(doc));
  }

  async update(refundId: string, refundData: Partial<Refund>): Promise<Refund | null> {
    const docRef = this.db.collection(this.collection).doc(refundId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...refundData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToRefund(updatedDoc);
  }

  async updateStatus(refundId: string, status: Refund['status'], approvedBy?: string): Promise<Refund | null> {
    const updateData: Partial<Refund> = { status };
    if (status === 'approved') {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }
    return this.update(refundId, updateData);
  }

  async delete(refundId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(refundId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async getStatistics(eventId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalRefunded: number;
  }> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .get();

    const refunds = snapshot.docs.map((doc) => this.mapDocToRefund(doc));

    return {
      total: refunds.length,
      pending: refunds.filter((r) => r.status === 'pending').length,
      approved: refunds.filter((r) => r.status === 'approved').length,
      rejected: refunds.filter((r) => r.status === 'rejected').length,
      totalRefunded: refunds.filter((r) => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0),
    };
  }

  private mapDocToRefund(doc: admin.firestore.DocumentSnapshot): Refund {
    const data = doc.data() as Record<string, any>;
    return {
      refundId: doc.id,
      orderId: data.orderId || '',
      userId: data.userId || '',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      reason: data.reason || '',
      status: data.status || 'pending',
      approvedBy: data.approvedBy || undefined,
      approvedAt: data.approvedAt ? data.approvedAt.toDate() : undefined,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const refundRepository = new RefundRepository();
