import { getFirestore } from '../services/firebase';
import { Coupon } from '../types';
import admin from 'firebase-admin';

export class CouponRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'coupons';

  async create(couponData: Omit<Coupon, 'couponId' | 'createdAt' | 'updatedAt'>): Promise<Coupon> {
    const now = new Date();
    const couponId = `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.collection(this.collection).doc(couponId).set({
      ...couponData,
      couponId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(couponId).get();
    return this.mapDocToCoupon(doc);
  }

  async findById(couponId: string): Promise<Coupon | null> {
    const doc = await this.db.collection(this.collection).doc(couponId).get();
    if (!doc.exists) return null;
    return this.mapDocToCoupon(doc);
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToCoupon(snapshot.docs[0]);
  }

  async findByCreatorId(creatorId: string, limit = 50): Promise<Coupon[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('creatorId', '==', creatorId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToCoupon(doc));
  }

  async findPlatformCoupons(limit = 50): Promise<Coupon[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('isPlatformCoupon', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToCoupon(doc));
  }

  async findActiveCoupons(limit = 50): Promise<Coupon[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where('expiryDate', '>', now)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToCoupon(doc));
  }

  async update(couponId: string, couponData: Partial<Coupon>): Promise<Coupon | null> {
    const docRef = this.db.collection(this.collection).doc(couponId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...couponData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToCoupon(updatedDoc);
  }

  async incrementUsedCount(couponId: string): Promise<Coupon | null> {
    const coupon = await this.findById(couponId);
    if (!coupon) return null;

    return this.update(couponId, { usedCount: coupon.usedCount + 1 });
  }

  async delete(couponId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(couponId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  private mapDocToCoupon(doc: admin.firestore.DocumentSnapshot): Coupon {
    const data = doc.data() as Record<string, any>;
    return {
      couponId: doc.id,
      code: data.code || '',
      type: data.type || 'percentage',
      value: data.value || 0,
      maxUses: data.maxUses || 100,
      usedCount: data.usedCount || 0,
      minPurchase: data.minPurchase || 0,
      expiryDate: data.expiryDate ? data.expiryDate.toDate() : new Date(),
      creatorId: data.creatorId || undefined,
      isPlatformCoupon: data.isPlatformCoupon || false,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const couponRepository = new CouponRepository();
