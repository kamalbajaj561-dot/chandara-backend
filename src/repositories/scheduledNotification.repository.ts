import { getFirestore } from '../services/firebase';
import { ScheduledNotification } from '../types';
import logger from '../utils/logger';

/**
 * Scheduled Notification Repository
 * Manages scheduled notifications in Firestore
 */
export class ScheduledNotificationRepository {
  private readonly collection = 'scheduled_notifications';
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }

  /**
   * Create a scheduled notification
   */
  async create(data: Omit<ScheduledNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledNotification> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const scheduledNotification: ScheduledNotification = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection(this.collection).doc(id).set(scheduledNotification);
    logger.info(`Scheduled notification created: ${id}`);

    return scheduledNotification;
  }

  /**
   * Find scheduled notification by ID
   */
  async findById(id: string): Promise<ScheduledNotification | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToNotification(doc);
  }

  /**
   * Find scheduled notifications by user ID
   */
  async findByUserId(userId: string): Promise<ScheduledNotification[]> {
    const snapshot = await this.db.collection(this.collection).where('userId', '==', userId).get();
    return snapshot.docs.map(doc => this.mapDocToNotification(doc));
  }

  /**
   * Find scheduled notifications by topic
   */
  async findByTopic(topic: string): Promise<ScheduledNotification[]> {
    const snapshot = await this.db.collection(this.collection).where('topic', '==', topic).get();
    return snapshot.docs.map(doc => this.mapDocToNotification(doc));
  }

  /**
   * Find pending scheduled notifications
   */
  async findPending(): Promise<ScheduledNotification[]> {
    const now = new Date();
    const snapshot = await this.db.collection(this.collection)
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .get();
    return snapshot.docs.map(doc => this.mapDocToNotification(doc));
  }

  /**
   * Find failed scheduled notifications
   */
  async findFailed(): Promise<ScheduledNotification[]> {
    const snapshot = await this.db.collection(this.collection).where('status', '==', 'failed').get();
    return snapshot.docs.map(doc => this.mapDocToNotification(doc));
  }

  /**
   * Update scheduled notification
   */
  async update(id: string, data: Partial<Omit<ScheduledNotification, 'id' | 'createdAt'>>): Promise<ScheduledNotification | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);
    logger.info(`Scheduled notification updated: ${id}`);

    const updatedDoc = await docRef.get();
    return this.mapDocToNotification(updatedDoc);
  }

  /**
   * Update status
   */
  async updateStatus(id: string, status: ScheduledNotification['status'], error?: string): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    }

    if (error) {
      updateData.error = error;
    }

    await this.db.collection(this.collection).doc(id).update(updateData);
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(id: string): Promise<void> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return;

    const data = doc.data()!;
    await this.db.collection(this.collection).doc(id).update({
      retryCount: (data.retryCount || 0) + 1,
      updatedAt: new Date(),
    });
  }

  /**
   * Cancel scheduled notification
   */
  async cancel(id: string): Promise<void> {
    await this.updateStatus(id, 'cancelled');
    logger.info(`Scheduled notification cancelled: ${id}`);
  }

  /**
   * Pause scheduled notification
   */
  async pause(id: string): Promise<void> {
    await this.updateStatus(id, 'paused');
    logger.info(`Scheduled notification paused: ${id}`);
  }

  /**
   * Resume scheduled notification
   */
  async resume(id: string): Promise<void> {
    await this.updateStatus(id, 'pending');
    logger.info(`Scheduled notification resumed: ${id}`);
  }

  /**
   * Delete scheduled notification
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
    logger.info(`Scheduled notification deleted: ${id}`);
  }

  /**
   * Delete old completed notifications
   */
  async deleteOldCompleted(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const snapshot = await this.db.collection(this.collection)
      .where('status', 'in', ['sent', 'cancelled'])
      .where('updatedAt', '<', cutoffDate)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`Deleted ${snapshot.size} old completed scheduled notifications`);

    return snapshot.size;
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    paused: number;
  }> {
    const snapshot = await this.db.collection(this.collection).get();
    const notifications = snapshot.docs.map(doc => this.mapDocToNotification(doc));

    const stats = {
      total: notifications.length,
      pending: notifications.filter(n => n.status === 'pending').length,
      sent: notifications.filter(n => n.status === 'sent').length,
      failed: notifications.filter(n => n.status === 'failed').length,
      cancelled: notifications.filter(n => n.status === 'cancelled').length,
      paused: notifications.filter(n => n.status === 'paused').length,
    };

    return stats;
  }

  /**
   * Map Firestore document to ScheduledNotification
   */
  private mapDocToNotification(doc: FirebaseFirestore.DocumentSnapshot): ScheduledNotification {
    const data = doc.data()!;
    return {
      id: doc.id,
      userId: data.userId,
      topic: data.topic,
      title: data.title,
      body: data.body,
      data: data.data,
      scheduledFor: data.scheduledFor?.toDate(),
      timezone: data.timezone,
      status: data.status,
      priority: data.priority,
      retryCount: data.retryCount,
      maxRetries: data.maxRetries,
      error: data.error,
      cronExpression: data.cronExpression,
      recurring: data.recurring,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      sentAt: data.sentAt?.toDate(),
    };
  }
}

export const scheduledNotificationRepository = new ScheduledNotificationRepository();
