import { getFirestore } from '../services/firebase';
import { PushLog, PushLogStatus } from '../types';
import logger from '../utils/logger';

/**
 * Push Log Repository
 * Manages push notification logs in Firestore
 */
export class PushLogRepository {
  private readonly collection = 'push_logs';
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }

  /**
   * Create a push log
   */
  async create(data: Omit<PushLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<PushLog> {
    const id = `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const pushLog: PushLog = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection(this.collection).doc(id).set(pushLog);
    logger.info(`Push log created: ${id}`);

    return pushLog;
  }

  /**
   * Find push log by ID
   */
  async findById(id: string): Promise<PushLog | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToLog(doc);
  }

  /**
   * Find push logs by user ID
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<PushLog[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    return snapshot.docs.map(doc => this.mapDocToLog(doc));
  }

  /**
   * Find push logs by device ID
   */
  async findByDeviceId(deviceId: string, limit: number = 50): Promise<PushLog[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('deviceId', '==', deviceId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => this.mapDocToLog(doc));
  }

  /**
   * Find push logs by topic
   */
  async findByTopic(topic: string, limit: number = 50): Promise<PushLog[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('topic', '==', topic)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => this.mapDocToLog(doc));
  }

  /**
   * Find push logs by status
   */
  async findByStatus(status: PushLogStatus, limit: number = 50): Promise<PushLog[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => this.mapDocToLog(doc));
  }

  /**
   * Find failed push logs
   */
  async findFailed(limit: number = 50): Promise<PushLog[]> {
    return this.findByStatus('failed', limit);
  }

  /**
   * Update push log
   */
  async update(id: string, data: Partial<Omit<PushLog, 'id' | 'createdAt'>>): Promise<PushLog | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);
    logger.info(`Push log updated: ${id}`);

    const updatedDoc = await docRef.get();
    return this.mapDocToLog(updatedDoc);
  }

  /**
   * Update status
   */
  async updateStatus(id: string, status: PushLogStatus): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'opened') {
      updateData.openedAt = new Date();
    } else if (status === 'clicked') {
      updateData.clickedAt = new Date();
    }

    await this.db.collection(this.collection).doc(id).update(updateData);
  }

  /**
   * Mark as delivered
   */
  async markDelivered(id: string): Promise<void> {
    await this.updateStatus(id, 'delivered');
  }

  /**
   * Mark as opened
   */
  async markOpened(id: string): Promise<void> {
    await this.updateStatus(id, 'opened');
  }

  /**
   * Mark as clicked
   */
  async markClicked(id: string): Promise<void> {
    await this.updateStatus(id, 'clicked');
  }

  /**
   * Delete push log
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
    logger.info(`Push log deleted: ${id}`);
  }

  /**
   * Delete old logs
   */
  async deleteOldLogs(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const snapshot = await this.db.collection(this.collection)
      .where('createdAt', '<', cutoffDate)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`Deleted ${snapshot.size} old push logs`);

    return snapshot.size;
  }

  /**
   * Get statistics
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  }> {
    let snapshot;
    if (userId) {
      snapshot = await this.db.collection(this.collection).where('userId', '==', userId).get();
    } else {
      snapshot = await this.db.collection(this.collection).get();
    }

    const logs = snapshot.docs.map(doc => this.mapDocToLog(doc));

    const stats = {
      total: logs.length,
      sent: logs.filter(l => l.status === 'sent').length,
      delivered: logs.filter(l => l.status === 'delivered').length,
      opened: logs.filter(l => l.status === 'opened').length,
      clicked: logs.filter(l => l.status === 'clicked').length,
      failed: logs.filter(l => l.status === 'failed').length,
    };

    return stats;
  }

  /**
   * Get delivery rate
   */
  async getDeliveryRate(userId?: string): Promise<number> {
    const stats = await this.getStatistics(userId);
    if (stats.sent === 0) return 0;
    return (stats.delivered / stats.sent) * 100;
  }

  /**
   * Get open rate
   */
  async getOpenRate(userId?: string): Promise<number> {
    const stats = await this.getStatistics(userId);
    if (stats.delivered === 0) return 0;
    return (stats.opened / stats.delivered) * 100;
  }

  /**
   * Get click rate
   */
  async getClickRate(userId?: string): Promise<number> {
    const stats = await this.getStatistics(userId);
    if (stats.opened === 0) return 0;
    return (stats.clicked / stats.opened) * 100;
  }

  /**
   * Map Firestore document to PushLog
   */
  private mapDocToLog(doc: FirebaseFirestore.DocumentSnapshot): PushLog {
    const data = doc.data()!;
    return {
      id: doc.id,
      userId: data.userId,
      deviceId: data.deviceId,
      topic: data.topic,
      title: data.title,
      body: data.body,
      data: data.data,
      status: data.status,
      provider: data.provider,
      messageId: data.messageId,
      error: data.error,
      priority: data.priority,
      ttl: data.ttl,
      silent: data.silent,
      sentAt: data.sentAt?.toDate(),
      deliveredAt: data.deliveredAt?.toDate(),
      openedAt: data.openedAt?.toDate(),
      clickedAt: data.clickedAt?.toDate(),
      retryCount: data.retryCount,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}

export const pushLogRepository = new PushLogRepository();
