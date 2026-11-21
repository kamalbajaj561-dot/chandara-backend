import { getFirestore } from '../services/firebase';
import { StreamSession } from '../types';
import admin from 'firebase-admin';

export class StreamSessionRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'stream_sessions';

  async create(sessionData: Omit<StreamSession, 'id' | 'joinedAt'>): Promise<StreamSession> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...sessionData,
      joinedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToSession(doc);
  }

  async findById(id: string): Promise<StreamSession | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToSession(doc);
  }

  async findByStreamId(streamId: string): Promise<StreamSession[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .orderBy('joinedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToSession(doc));
  }

  async findByUserAndStream(userId: string, streamId: string): Promise<StreamSession | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('streamId', '==', streamId)
      .where('leftAt', '==', null)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToSession(snapshot.docs[0]);
  }

  async update(id: string, sessionData: Partial<StreamSession>): Promise<StreamSession | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update(sessionData);

    const updatedDoc = await docRef.get();
    return this.mapDocToSession(updatedDoc);
  }

  async endSession(id: string, leftAt: Date): Promise<StreamSession | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const sessionData = this.mapDocToSession(doc);
    const duration = leftAt.getTime() - sessionData.joinedAt.getTime();

    await docRef.update({
      leftAt,
      duration,
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToSession(updatedDoc);
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async getActiveSessionsByStream(streamId: string): Promise<StreamSession[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .where('leftAt', '==', null)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToSession(doc));
  }

  async getActiveCountByStream(streamId: string): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .where('leftAt', '==', null)
      .get();

    return snapshot.size;
  }

  async getUserSessions(userId: string, limit = 20): Promise<StreamSession[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('joinedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToSession(doc));
  }

  private mapDocToSession(doc: admin.firestore.DocumentSnapshot): StreamSession {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      streamId: data.streamId || '',
      userId: data.userId || '',
      role: data.role || 'subscriber',
      joinedAt: data.joinedAt ? data.joinedAt.toDate() : new Date(),
      leftAt: data.leftAt ? data.leftAt.toDate() : undefined,
      duration: data.duration,
    };
  }
}

export const streamSessionRepository = new StreamSessionRepository();
