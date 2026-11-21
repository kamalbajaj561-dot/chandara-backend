import { getFirestore } from '../services/firebase';
import { JobLog, JobStatus } from '../types';
import logger from '../utils/logger';

/**
 * Job Log Repository
 * Manages job execution logs in Firestore
 */
export class JobLogRepository {
  private readonly collection = 'job_logs';
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }

  /**
   * Create a job log
   */
  async create(data: Omit<JobLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobLog> {
    const id = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const jobLog: JobLog = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection(this.collection).doc(id).set(jobLog);
    logger.info(`Job log created: ${id}`);

    return jobLog;
  }

  /**
   * Find job log by ID
   */
  async findById(id: string): Promise<JobLog | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToLog(doc);
  }

  /**
   * Find job logs by type
   */
  async findByType(jobType: string, limit: number = 50): Promise<JobLog[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('jobType', '==', jobType)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => this.mapDocToLog(doc));
  }

  /**
   * Find job logs by status
   */
  async findByStatus(status: JobStatus, limit: number = 50): Promise<JobLog[]> {
    const snapshot = await this.db.collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => this.mapDocToLog(doc));
  }

  /**
   * Find failed job logs
   */
  async findFailed(limit: number = 50): Promise<JobLog[]> {
    return this.findByStatus('failed', limit);
  }

  /**
   * Find running job logs
   */
  async findRunning(): Promise<JobLog[]> {
    return this.findByStatus('running', 100);
  }

  /**
   * Find job logs by job ID (external scheduler job ID)
   */
  async findByJobId(jobId: string): Promise<JobLog | null> {
    const snapshot = await this.db.collection(this.collection)
      .where('jobId', '==', jobId)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return this.mapDocToLog(snapshot.docs[0]);
  }

  /**
   * Update job log
   */
  async update(id: string, data: Partial<Omit<JobLog, 'id' | 'createdAt'>>): Promise<JobLog | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);
    logger.info(`Job log updated: ${id}`);

    const updatedDoc = await docRef.get();
    return this.mapDocToLog(updatedDoc);
  }

  /**
   * Update status
   */
  async updateStatus(id: string, status: JobStatus, result?: Record<string, any>, error?: string): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'running') {
      updateData.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (result) {
      updateData.result = result;
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
   * Mark job as running
   */
  async markRunning(id: string): Promise<void> {
    await this.updateStatus(id, 'running');
  }

  /**
   * Mark job as completed
   */
  async markCompleted(id: string, result?: Record<string, any>): Promise<void> {
    await this.updateStatus(id, 'completed', result);
  }

  /**
   * Mark job as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    await this.updateStatus(id, 'failed', undefined, error);
  }

  /**
   * Delete job log
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
    logger.info(`Job log deleted: ${id}`);
  }

  /**
   * Delete old logs
   */
  async deleteOldLogs(daysOld: number = 30): Promise<number> {
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
    logger.info(`Deleted ${snapshot.size} old job logs`);

    return snapshot.size;
  }

  /**
   * Get statistics
   */
  async getStatistics(jobType?: string): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    retrying: number;
  }> {
    let snapshot;
    if (jobType) {
      snapshot = await this.db.collection(this.collection).where('jobType', '==', jobType).get();
    } else {
      snapshot = await this.db.collection(this.collection).get();
    }

    const logs = snapshot.docs.map(doc => this.mapDocToLog(doc));

    const stats = {
      total: logs.length,
      pending: logs.filter(l => l.status === 'pending').length,
      running: logs.filter(l => l.status === 'running').length,
      completed: logs.filter(l => l.status === 'completed').length,
      failed: logs.filter(l => l.status === 'failed').length,
      cancelled: logs.filter(l => l.status === 'cancelled').length,
      retrying: logs.filter(l => l.status === 'retrying').length,
    };

    return stats;
  }

  /**
   * Get success rate
   */
  async getSuccessRate(jobType?: string): Promise<number> {
    const stats = await this.getStatistics(jobType);
    const total = stats.completed + stats.failed;
    if (total === 0) return 0;
    return (stats.completed / total) * 100;
  }

  /**
   * Get average execution time
   */
  async getAverageExecutionTime(jobType?: string): Promise<number> {
    let snapshot;
    if (jobType) {
      snapshot = await this.db.collection(this.collection)
        .where('jobType', '==', jobType)
        .where('status', '==', 'completed')
        .get();
    } else {
      snapshot = await this.db.collection(this.collection).where('status', '==', 'completed').get();
    }

    const logs = snapshot.docs.map(doc => this.mapDocToLog(doc));
    
    if (logs.length === 0) return 0;

    const totalDuration = logs.reduce((sum, log) => {
      if (log.startedAt && log.completedAt) {
        return sum + (log.completedAt.getTime() - log.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalDuration / logs.length;
  }

  /**
   * Map Firestore document to JobLog
   */
  private mapDocToLog(doc: FirebaseFirestore.DocumentSnapshot): JobLog {
    const data = doc.data()!;
    return {
      id: doc.id,
      jobType: data.jobType,
      jobId: data.jobId,
      status: data.status,
      payload: data.payload,
      result: data.result,
      error: data.error,
      retryCount: data.retryCount,
      maxRetries: data.maxRetries,
      priority: data.priority,
      scheduledFor: data.scheduledFor?.toDate(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}

export const jobLogRepository = new JobLogRepository();
