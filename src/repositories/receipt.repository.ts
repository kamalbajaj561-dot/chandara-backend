import { getFirestore } from '../services/firebase';
import { Receipt } from '../types';
import admin from 'firebase-admin';

export class ReceiptRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'receipts';

  async create(receiptData: Omit<Receipt, 'receiptId' | 'generatedAt'>): Promise<Receipt> {
    const now = new Date();
    const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.collection(this.collection).doc(receiptId).set({
      ...receiptData,
      receiptId,
      generatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(receiptId).get();
    return this.mapDocToReceipt(doc);
  }

  async findById(receiptId: string): Promise<Receipt | null> {
    const doc = await this.db.collection(this.collection).doc(receiptId).get();
    if (!doc.exists) return null;
    return this.mapDocToReceipt(doc);
  }

  async findByOrderId(orderId: string): Promise<Receipt | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToReceipt(snapshot.docs[0]);
  }

  async findByUserId(userId: string, limit = 50): Promise<Receipt[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReceipt(doc));
  }

  async delete(receiptId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(receiptId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  private mapDocToReceipt(doc: admin.firestore.DocumentSnapshot): Receipt {
    const data = doc.data() as Record<string, any>;
    return {
      receiptId: doc.id,
      orderId: data.orderId || '',
      userId: data.userId || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      platformFee: data.platformFee || 0,
      total: data.total || 0,
      currency: data.currency || 'USD',
      generatedAt: data.generatedAt ? data.generatedAt.toDate() : new Date(),
    };
  }
}

export const receiptRepository = new ReceiptRepository();
