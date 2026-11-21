import { getFirestore } from '../services/firebase';
import { ChatBan } from '../types';
import admin from 'firebase-admin';

export class ChatBanRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'chat_bans';

  async create(banData: Omit<ChatBan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatBan> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...banData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToBan(doc);
  }

  async findById(id: string): Promise<ChatBan | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToBan(doc);
  }

  async findByBanId(banId: string): Promise<ChatBan | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('banId', '==', banId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToBan(snapshot.docs[0]);
  }

  async findByEventId(eventId: string, limit = 50): Promise<ChatBan[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToBan(doc));
  }

  async findByUserId(userId: string, limit = 50): Promise<ChatBan[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToBan(doc));
  }

  async findActiveByUserId(userId: string): Promise<ChatBan | null> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    for (const doc of snapshot.docs) {
      const ban = this.mapDocToBan(doc);
      if (ban.banType === 'permanent') {
        return ban;
      }
      if (ban.expiresAt && ban.expiresAt > now) {
        return ban;
      }
    }

    return null;
  }

  async findActiveByEventId(eventId: string): Promise<ChatBan[]> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .where('isActive', '==', true)
      .get();

    const activeBans: ChatBan[] = [];
    for (const doc of snapshot.docs) {
      const ban = this.mapDocToBan(doc);
      if (ban.banType === 'permanent') {
        activeBans.push(ban);
      } else if (ban.expiresAt && ban.expiresAt > now) {
        activeBans.push(ban);
      }
    }

    return activeBans;
  }

  async update(id: string, banData: Partial<ChatBan>): Promise<ChatBan | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...banData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToBan(updatedDoc);
  }

  async deactivate(id: string): Promise<ChatBan | null> {
    return this.update(id, { isActive: false });
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async cleanupExpiredBans(): Promise<number> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where('banType', '==', 'temporary')
      .where('isActive', '==', true)
      .get();

    let deactivatedCount = 0;
    const batch = this.db.batch();

    for (const doc of snapshot.docs) {
      const ban = this.mapDocToBan(doc);
      if (ban.expiresAt && ban.expiresAt <= now) {
        batch.update(doc.ref, { isActive: false, updatedAt: now });
        deactivatedCount++;
      }
    }

    if (deactivatedCount > 0) {
      await batch.commit();
    }

    return deactivatedCount;
  }

  private mapDocToBan(doc: admin.firestore.DocumentSnapshot): ChatBan {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      banId: data.banId || '',
      eventId: data.eventId || '',
      userId: data.userId || '',
      userName: data.userName || '',
      bannedBy: data.bannedBy || '',
      bannedByName: data.bannedByName || '',
      reason: data.reason || '',
      banType: data.banType || 'permanent',
      duration: data.duration,
      expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined,
      isActive: data.isActive !== false,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const chatBanRepository = new ChatBanRepository();
