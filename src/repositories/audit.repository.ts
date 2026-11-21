import { getFirestore } from '../services/firebase';
import { AuditLog } from '../types';
import logger from '../utils/logger';
import admin from 'firebase-admin';

/**
 * Audit Log Repository
 * Tracks all admin actions for compliance and security
 */
export class AuditRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'audit_logs';

  /**
   * Create an audit log entry
   */
  async create(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const auditLog: AuditLog = {
      id,
      ...log,
      timestamp: new Date(),
    };

    await this.db.collection(this.collection).doc(id).set(auditLog);
    logger.debug(`Audit log created: ${log.action} by ${log.adminId}`);
    return id;
  }

  /**
   * Find audit log by ID
   */
  async findById(id: string): Promise<AuditLog | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as AuditLog;
  }

  /**
   * Find audit logs by admin ID
   */
  async findByAdminId(adminId: string, limit: number = 100): Promise<AuditLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('adminId', '==', adminId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as AuditLog);
  }

  /**
   * Find audit logs by target
   */
  async findByTarget(target: string, targetId?: string, limit: number = 100): Promise<AuditLog[]> {
    let query = this.db.collection(this.collection).where('target', '==', target);
    
    if (targetId) {
      query = query.where('targetId', '==', targetId);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => doc.data() as AuditLog);
  }

  /**
   * Find audit logs by action type
   */
  async findByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('action', '==', action)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as AuditLog);
  }

  /**
   * Get audit logs with pagination
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      adminId?: string;
      action?: string;
      target?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AuditLog[]; total: number; page: number; pageSize: number }> {
    let query = this.db.collection(this.collection) as any;

    if (filters?.adminId) {
      query = query.where('adminId', '==', filters.adminId);
    }
    if (filters?.action) {
      query = query.where('action', '==', filters.action);
    }
    if (filters?.target) {
      query = query.where('target', '==', filters.target);
    }
    if (filters?.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const logs = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as AuditLog);

    return { logs, total, page, pageSize };
  }

  /**
   * Search audit logs
   */
  async search(query: string, limit: number = 50): Promise<AuditLog[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as AuditLog);
    
    // Simple search across action, adminName, and target
    const lowerQuery = query.toLowerCase();
    return logs.filter(
      log =>
        log.action.toLowerCase().includes(lowerQuery) ||
        log.adminName.toLowerCase().includes(lowerQuery) ||
        log.target.toLowerCase().includes(lowerQuery) ||
        (log.targetId && log.targetId.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byAction: Record<string, number>;
    byAdmin: Record<string, number>;
    byTarget: Record<string, number>;
    successRate: number;
  }> {
    let query = this.db.collection(this.collection) as any;

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }
    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    const snapshot = await query.get();
    const logs = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as AuditLog);

    const byAction: Record<string, number> = {};
    const byAdmin: Record<string, number> = {};
    const byTarget: Record<string, number> = {};
    let successCount = 0;

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byAdmin[log.adminId] = (byAdmin[log.adminId] || 0) + 1;
      byTarget[log.target] = (byTarget[log.target] || 0) + 1;
      if (log.success) successCount++;
    }

    return {
      total: logs.length,
      byAction,
      byAdmin,
      byTarget,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
    };
  }

  /**
   * Delete old audit logs (for cleanup)
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('timestamp', '<', date)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`Deleted ${snapshot.size} audit logs older than ${date}`);
    return snapshot.size;
  }
}

export const auditRepository = new AuditRepository();
