import { getFirestore } from '../services/firebase';
import { Review } from '../types';
import admin from 'firebase-admin';

export class ReviewRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'reviews';

  async create(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...reviewData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToReview(doc);
  }

  async findById(id: string): Promise<Review | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToReview(doc);
  }

  async findByEventId(eventId: string, limit = 50): Promise<Review[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReview(doc));
  }

  async findByUserId(userId: string, limit = 50): Promise<Review[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReview(doc));
  }

  async findByEventIdAndUserId(eventId: string, userId: string): Promise<Review | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToReview(snapshot.docs[0]);
  }

  async update(id: string, reviewData: Partial<Review>): Promise<Review | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...reviewData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToReview(updatedDoc);
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async getAverageRating(eventId: string): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .get();

    if (snapshot.empty) return 0;

    const reviews = snapshot.docs.map((doc) => this.mapDocToReview(doc));
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  }

  private mapDocToReview(doc: admin.firestore.DocumentSnapshot): Review {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      eventId: data.eventId || '',
      userId: data.userId || '',
      userName: data.userName || '',
      userAvatar: data.userAvatar,
      rating: data.rating || 0,
      comment: data.comment || '',
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const reviewRepository = new ReviewRepository();
