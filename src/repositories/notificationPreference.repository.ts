import { getFirestore } from '../services/firebase';
import { NotificationPreference } from '../types';
import admin from 'firebase-admin';

export class NotificationPreferenceRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'notification_preferences';

  async create(preferenceData: Omit<NotificationPreference, 'createdAt' | 'updatedAt'>): Promise<NotificationPreference> {
    const now = new Date();
    const docRef = this.db.collection(this.collection).doc(preferenceData.userId);
    await docRef.set({
      ...preferenceData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Failed to create notification preference');
    return this.mapDocToPreference(doc);
  }

  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const doc = await this.db.collection(this.collection).doc(userId).get();
    if (!doc.exists) return null;
    return this.mapDocToPreference(doc);
  }

  async update(userId: string, updateData: Partial<Omit<NotificationPreference, 'userId' | 'createdAt'>>): Promise<NotificationPreference | null> {
    const docRef = this.db.collection(this.collection).doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToPreference(updatedDoc);
  }

  async upsert(preferenceData: Omit<NotificationPreference, 'createdAt' | 'updatedAt'>): Promise<NotificationPreference> {
    const existing = await this.findByUserId(preferenceData.userId);
    
    if (existing) {
      return this.update(preferenceData.userId, preferenceData) as Promise<NotificationPreference>;
    }

    return this.create(preferenceData);
  }

  async delete(userId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  private mapDocToPreference(doc: admin.firestore.DocumentSnapshot): NotificationPreference {
    const data = doc.data();
    if (!data) throw new Error('Document data is undefined');
    return {
      userId: doc.id,
      inAppEnabled: data.inAppEnabled,
      eventNotifications: data.eventNotifications,
      streamNotifications: data.streamNotifications,
      chatNotifications: data.chatNotifications,
      ticketNotifications: data.ticketNotifications,
      paymentNotifications: data.paymentNotifications,
      creatorNotifications: data.creatorNotifications,
      adminNotifications: data.adminNotifications,
      language: data.language,
      timezone: data.timezone,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
