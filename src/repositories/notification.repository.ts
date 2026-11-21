import { getFirestore } from '../services/firebase';
import { Notification, NotificationType, NotificationPriority } from '../types';
import admin from 'firebase-admin';

export class NotificationRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'notifications';

  async create(notificationData: Omit<Notification, 'notificationId' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    const now = new Date();
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = this.db.collection(this.collection).doc(notificationId);
    await docRef.set({
      ...notificationData,
      notificationId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Failed to create notification');
    return this.mapDocToNotification(doc);
  }

  async findById(notificationId: string): Promise<Notification | null> {
    const doc = await this.db.collection(this.collection).doc(notificationId).get();
    if (!doc.exists) return null;
    return this.mapDocToNotification(doc);
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToNotification(doc));
  }

  async findUnreadByUserId(userId: string, limit = 50): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToNotification(doc));
  }

  async findByType(userId: string, type: NotificationType, limit = 50): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToNotification(doc));
  }

  async findByPriority(userId: string, priority: NotificationPriority, limit = 50): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('priority', '==', priority)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToNotification(doc));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .count()
      .get();

    return snapshot.data().count;
  }

  async search(userId: string, query: string, limit = 50): Promise<Notification[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const allNotifications = snapshot.docs.map((doc) => this.mapDocToNotification(doc));
    
    return allNotifications.filter(
      (notification) =>
        notification.title.toLowerCase().includes(query.toLowerCase()) ||
        notification.message.toLowerCase().includes(query.toLowerCase())
    );
  }

  async update(notificationId: string, updateData: Partial<Omit<Notification, 'notificationId' | 'createdAt'>>): Promise<Notification | null> {
    const docRef = this.db.collection(this.collection).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToNotification(updatedDoc);
  }

  async markAsRead(notificationId: string): Promise<Notification | null> {
    return this.update(notificationId, { read: true, readAt: new Date() });
  }

  async markAsUnread(notificationId: string): Promise<Notification | null> {
    return this.update(notificationId, { read: false, readAt: undefined });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date(),
        updatedAt: new Date(),
      });
    });

    await batch.commit();
  }

  async softDelete(notificationId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.update({
      status: 'failed',
      updatedAt: new Date(),
    });

    return true;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  async bulkInsert(notifications: Omit<Notification, 'notificationId' | 'createdAt' | 'updatedAt'>[]): Promise<Notification[]> {
    const batch = this.db.batch();
    const now = new Date();
    const createdNotifications: Notification[] = [];

    notifications.forEach((notificationData) => {
      const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docRef = this.db.collection(this.collection).doc(notificationId);
      
      const notification: Notification = {
        ...notificationData,
        notificationId,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, notification);
      createdNotifications.push(notification);
    });

    await batch.commit();
    return createdNotifications;
  }

  async bulkUpdate(notificationIds: string[], updateData: Partial<Omit<Notification, 'notificationId' | 'createdAt'>>): Promise<void> {
    const batch = this.db.batch();

    notificationIds.forEach((notificationId) => {
      const docRef = this.db.collection(this.collection).doc(notificationId);
      batch.update(docRef, {
        ...updateData,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const snapshot = await this.db
      .collection(this.collection)
      .where('expiresAt', '<', now)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  private mapDocToNotification(doc: admin.firestore.DocumentSnapshot): Notification {
    const data = doc.data();
    if (!data) throw new Error('Document data is undefined');
    return {
      notificationId: doc.id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      priority: data.priority,
      status: data.status,
      read: data.read,
      readAt: data.readAt?.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      expiresAt: data.expiresAt?.toDate(),
    };
  }
}

export const notificationRepository = new NotificationRepository();
