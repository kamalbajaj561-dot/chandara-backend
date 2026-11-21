import { getFirestore } from '../services/firebase';
import { EmailLog, EmailStatus } from '../types';
import logger from '../utils/logger';

export class EmailLogRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'email_logs';

  /**
   * Create a new email log entry
   */
  async create(emailData: Omit<EmailLog, 'emailId' | 'createdAt' | 'updatedAt'>): Promise<EmailLog> {
    const emailId = this.db.collection(this.collection).doc().id;
    const now = new Date();

    const emailLog: EmailLog = {
      ...emailData,
      emailId,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection(this.collection).doc(emailId).set(emailLog);
    logger.info(`Email log created: ${emailId}`);

    return emailLog;
  }

  /**
   * Find email log by ID
   */
  async findById(emailId: string): Promise<EmailLog | null> {
    const doc = await this.db.collection(this.collection).doc(emailId).get();

    if (!doc.exists) {
      return null;
    }

    return this.mapDocToEmailLog(doc);
  }

  /**
   * Find email logs by user ID
   */
  async findByUserId(userId: string, limit = 50, offset = 0): Promise<EmailLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map(doc => this.mapDocToEmailLog(doc));
  }

  /**
   * Find email logs by recipient email
   */
  async findByRecipient(recipient: string, limit = 50, offset = 0): Promise<EmailLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('recipient', '==', recipient)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map(doc => this.mapDocToEmailLog(doc));
  }

  /**
   * Find email logs by status
   */
  async findByStatus(status: EmailStatus, limit = 100, offset = 0): Promise<EmailLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    return snapshot.docs.map(doc => this.mapDocToEmailLog(doc));
  }

  /**
   * Find failed emails for retry (with retry count below max)
   */
  async findFailedForRetry(maxRetryCount = 3, limit = 50): Promise<EmailLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', 'failed')
      .where('retryCount', '<', maxRetryCount)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => this.mapDocToEmailLog(doc));
  }

  /**
   * Update email log
   */
  async update(emailId: string, updateData: Partial<EmailLog>): Promise<EmailLog | null> {
    const docRef = this.db.collection(this.collection).doc(emailId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    const updatedData = {
      ...updateData,
      updatedAt: new Date(),
    };

    await docRef.update(updatedData);
    const updatedDoc = await docRef.get();

    return this.mapDocToEmailLog(updatedDoc);
  }

  /**
   * Update email status
   */
  async updateStatus(emailId: string, status: EmailStatus, errorMessage?: string): Promise<EmailLog | null> {
    const updateData: Partial<EmailLog> = { status };

    if (status === 'sent') {
      updateData.sentAt = new Date();
    }

    if (status === 'opened') {
      updateData.openedAt = new Date();
    }

    if (status === 'clicked') {
      updateData.clickedAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.update(emailId, updateData);
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(emailId: string): Promise<EmailLog | null> {
    const doc = await this.findById(emailId);
    if (!doc) {
      return null;
    }

    return this.update(emailId, { retryCount: doc.retryCount + 1 });
  }

  /**
   * Get email statistics
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    queued: number;
    opened: number;
    clicked: number;
  }> {
    let query: any = this.db.collection(this.collection);

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot: any = await query.get();
    const logs = snapshot.docs.map((doc: any) => this.mapDocToEmailLog(doc));

    return {
      total: logs.length,
      sent: logs.filter((l: EmailLog) => l.status === 'sent').length,
      failed: logs.filter((l: EmailLog) => l.status === 'failed').length,
      queued: logs.filter((l: EmailLog) => l.status === 'queued').length,
      opened: logs.filter((l: EmailLog) => l.status === 'opened').length,
      clicked: logs.filter((l: EmailLog) => l.status === 'clicked').length,
    };
  }

  /**
   * Delete email log
   */
  async delete(emailId: string): Promise<boolean> {
    const doc = await this.db.collection(this.collection).doc(emailId).get();

    if (!doc.exists) {
      return false;
    }

    await doc.ref.delete();
    logger.info(`Email log deleted: ${emailId}`);

    return true;
  }

  /**
   * Delete old email logs (cleanup)
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
    logger.info(`Deleted ${snapshot.docs.length} old email logs`);

    return snapshot.docs.length;
  }

  /**
   * Map Firestore document to EmailLog
   */
  private mapDocToEmailLog(doc: any): EmailLog {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is null');
    }

    return {
      emailId: doc.id,
      userId: data.userId,
      recipient: data.recipient,
      template: data.template,
      subject: data.subject,
      provider: data.provider,
      status: data.status,
      retryCount: data.retryCount || 0,
      sentAt: data.sentAt?.toDate ? data.sentAt.toDate() : data.sentAt,
      openedAt: data.openedAt?.toDate ? data.openedAt.toDate() : data.openedAt,
      clickedAt: data.clickedAt?.toDate ? data.clickedAt.toDate() : data.clickedAt,
      errorMessage: data.errorMessage,
      variables: data.variables,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
    };
  }
}

export const emailLogRepository = new EmailLogRepository();
