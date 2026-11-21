import { getFirestore } from '../services/firebase';
import { ChatReport } from '../types';
import admin from 'firebase-admin';

export class ChatReportRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'chat_reports';

  async create(reportData: Omit<ChatReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatReport> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...reportData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToReport(doc);
  }

  async findById(id: string): Promise<ChatReport | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToReport(doc);
  }

  async findByReportId(reportId: string): Promise<ChatReport | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('reportId', '==', reportId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToReport(snapshot.docs[0]);
  }

  async findByEventId(eventId: string, limit = 50): Promise<ChatReport[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReport(doc));
  }

  async findByMessageId(messageId: string): Promise<ChatReport[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('messageId', '==', messageId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReport(doc));
  }

  async findByReporterId(reporterId: string, limit = 50): Promise<ChatReport[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('reporterId', '==', reporterId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReport(doc));
  }

  async findByStatus(status: ChatReport['status'], limit = 50): Promise<ChatReport[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReport(doc));
  }

  async findByAssignedTo(assignedTo: string, limit = 50): Promise<ChatReport[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('assignedTo', '==', assignedTo)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToReport(doc));
  }

  async update(id: string, reportData: Partial<ChatReport>): Promise<ChatReport | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...reportData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToReport(updatedDoc);
  }

  async updateStatus(id: string, status: ChatReport['status']): Promise<ChatReport | null> {
    const updateData: Partial<ChatReport> = { status };

    if (status === 'resolved' || status === 'rejected') {
      updateData.resolvedAt = new Date();
    }

    return this.update(id, updateData);
  }

  async assignTo(id: string, assignedTo: string): Promise<ChatReport | null> {
    return this.update(id, { assignedTo, status: 'investigating' });
  }

  async resolve(id: string, resolution: string): Promise<ChatReport | null> {
    return this.update(id, {
      status: 'resolved',
      resolvedAt: new Date(),
      resolution,
    });
  }

  async reject(id: string, resolution: string): Promise<ChatReport | null> {
    return this.update(id, {
      status: 'rejected',
      resolvedAt: new Date(),
      resolution,
    });
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  private mapDocToReport(doc: admin.firestore.DocumentSnapshot): ChatReport {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      reportId: data.reportId || '',
      messageId: data.messageId || '',
      eventId: data.eventId || '',
      reporterId: data.reporterId || '',
      reporterName: data.reporterName || '',
      reportedUserId: data.reportedUserId || '',
      reportedUserName: data.reportedUserName || '',
      reason: data.reason || '',
      description: data.description,
      status: data.status || 'pending',
      assignedTo: data.assignedTo,
      resolvedAt: data.resolvedAt ? data.resolvedAt.toDate() : undefined,
      resolution: data.resolution,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const chatReportRepository = new ChatReportRepository();
