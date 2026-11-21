import { getFirestore } from '../services/firebase';
import { TicketDelivery, TicketDeliveryStatus } from '../types';
import logger from '../utils/logger';

export class TicketDeliveryRepository {
  private readonly collection = 'ticket_delivery_logs';
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }

  /**
   * Create ticket delivery log
   */
  async create(data: {
    ticketId: string;
    orderId: string;
    userId: string;
    recipient: string;
    provider: string;
  }): Promise<TicketDelivery> {
    const deliveryId = `DLV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const deliveryData: TicketDelivery = {
      deliveryId,
      ticketId: data.ticketId,
      orderId: data.orderId,
      userId: data.userId,
      recipient: data.recipient,
      status: 'queued',
      retryCount: 0,
      provider: data.provider,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection(this.collection).doc(deliveryId).set(deliveryData);
    logger.info(`Created ticket delivery log: ${deliveryId}`);

    return deliveryData;
  }

  /**
   * Find delivery log by ID
   */
  async findById(deliveryId: string): Promise<TicketDelivery | null> {
    const doc = await this.db.collection(this.collection).doc(deliveryId).get();
    if (!doc.exists) return null;
    return this.mapDocToDelivery(doc);
  }

  /**
   * Find delivery logs by ticket ID
   */
  async findByTicketId(ticketId: string): Promise<TicketDelivery[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('ticketId', '==', ticketId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => this.mapDocToDelivery(doc));
  }

  /**
   * Find delivery logs by order ID
   */
  async findByOrderId(orderId: string): Promise<TicketDelivery[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('orderId', '==', orderId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => this.mapDocToDelivery(doc));
  }

  /**
   * Find delivery logs by user ID
   */
  async findByUserId(userId: string, limit = 50, offset = 0): Promise<TicketDelivery[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map(doc => this.mapDocToDelivery(doc));
  }

  /**
   * Update delivery status
   */
  async updateStatus(deliveryId: string, status: TicketDeliveryStatus): Promise<TicketDelivery | null> {
    const doc = await this.db.collection(this.collection).doc(deliveryId).get();
    if (!doc.exists) return null;

    const updateData: Partial<TicketDelivery> = {
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

    await doc.ref.update(updateData);
    const updatedDoc = await doc.ref.get();
    return this.mapDocToDelivery(updatedDoc);
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(deliveryId: string): Promise<TicketDelivery | null> {
    const doc = await this.db.collection(this.collection).doc(deliveryId).get();
    if (!doc.exists) return null;

    const current = this.mapDocToDelivery(doc);
    await doc.ref.update({
      retryCount: current.retryCount + 1,
      updatedAt: new Date(),
    });

    const updatedDoc = await doc.ref.get();
    return this.mapDocToDelivery(updatedDoc);
  }

  /**
   * Update delivery with error
   */
  async updateWithError(deliveryId: string, error: string): Promise<TicketDelivery | null> {
    const doc = await this.db.collection(this.collection).doc(deliveryId).get();
    if (!doc.exists) return null;

    await doc.ref.update({
      status: 'failed',
      error,
      updatedAt: new Date(),
    });

    const updatedDoc = await doc.ref.get();
    return this.mapDocToDelivery(updatedDoc);
  }

  /**
   * Find failed deliveries for retry
   */
  async findFailedForRetry(maxRetries = 3): Promise<TicketDelivery[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', 'failed')
      .where('retryCount', '<', maxRetries)
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();

    return snapshot.docs.map(doc => this.mapDocToDelivery(doc));
  }

  /**
   * Get delivery statistics
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
  }> {
    let query: any = this.db.collection(this.collection);

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot: any = await query.get();
    const logs = snapshot.docs.map((doc: any) => this.mapDocToDelivery(doc));

    return {
      total: logs.length,
      sent: logs.filter((l: TicketDelivery) => l.status === 'sent').length,
      delivered: logs.filter((l: TicketDelivery) => l.status === 'delivered').length,
      failed: logs.filter((l: TicketDelivery) => l.status === 'failed').length,
      opened: logs.filter((l: TicketDelivery) => l.status === 'opened').length,
      clicked: logs.filter((l: TicketDelivery) => l.status === 'clicked').length,
    };
  }

  /**
   * Delete delivery log
   */
  async delete(deliveryId: string): Promise<boolean> {
    const doc = await this.db.collection(this.collection).doc(deliveryId).get();
    if (!doc.exists) return false;

    await doc.ref.delete();
    logger.info(`Deleted ticket delivery log: ${deliveryId}`);
    return true;
  }

  /**
   * Delete old delivery logs (cleanup)
   */
  async deleteOldLogs(daysOld = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const snapshot = await this.db
      .collection(this.collection)
      .where('createdAt', '<', cutoffDate)
      .limit(1000)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`Deleted ${snapshot.docs.length} old ticket delivery logs`);

    return snapshot.docs.length;
  }

  /**
   * Map Firestore document to TicketDelivery
   */
  private mapDocToDelivery(doc: any): TicketDelivery {
    const data = doc.data();
    return {
      deliveryId: doc.id,
      ticketId: data.ticketId,
      orderId: data.orderId,
      userId: data.userId,
      recipient: data.recipient,
      status: data.status,
      retryCount: data.retryCount || 0,
      provider: data.provider,
      sentAt: data.sentAt ? data.sentAt.toDate() : undefined,
      deliveredAt: data.deliveredAt ? data.deliveredAt.toDate() : undefined,
      openedAt: data.openedAt ? data.openedAt.toDate() : undefined,
      clickedAt: data.clickedAt ? data.clickedAt.toDate() : undefined,
      error: data.error,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}

export const ticketDeliveryRepository = new TicketDeliveryRepository();
