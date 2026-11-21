import { getFirestore } from '../services/firebase';
import { DeviceToken } from '../types';
import logger from '../utils/logger';

/**
 * Device Token Repository
 * Manages device tokens for push notifications in Firestore
 */
export class DeviceTokenRepository {
  private readonly collection = 'device_tokens';
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }

  /**
   * Register a new device token
   */
  async create(data: Omit<DeviceToken, 'createdAt' | 'updatedAt'>): Promise<DeviceToken> {
    const now = new Date();
    const deviceToken: DeviceToken = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection(this.collection).doc(data.deviceId).set(deviceToken);
    logger.info(`Device token registered: ${data.deviceId} for user: ${data.userId}`);

    return deviceToken;
  }

  /**
   * Find device token by ID
   */
  async findById(deviceId: string): Promise<DeviceToken | null> {
    const doc = await this.db.collection(this.collection).doc(deviceId).get();
    if (!doc.exists) return null;
    return this.mapDocToToken(doc);
  }

  /**
   * Find all device tokens for a user
   */
  async findByUserId(userId: string): Promise<DeviceToken[]> {
    const snapshot = await this.db.collection(this.collection).where('userId', '==', userId).where('active', '==', true).get();
    return snapshot.docs.map(doc => this.mapDocToToken(doc));
  }

  /**
   * Find device token by token string
   */
  async findByToken(token: string): Promise<DeviceToken | null> {
    const snapshot = await this.db.collection(this.collection).where('token', '==', token).limit(1).get();
    if (snapshot.empty) return null;
    return this.mapDocToToken(snapshot.docs[0]);
  }

  /**
   * Update device token
   */
  async update(deviceId: string, data: Partial<Omit<DeviceToken, 'deviceId' | 'createdAt'>>): Promise<DeviceToken | null> {
    const docRef = this.db.collection(this.collection).doc(deviceId);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await docRef.update(updateData);
    logger.info(`Device token updated: ${deviceId}`);

    const updatedDoc = await docRef.get();
    return this.mapDocToToken(updatedDoc);
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(deviceId: string): Promise<void> {
    await this.db.collection(this.collection).doc(deviceId).update({
      lastSeen: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Deactivate a device token
   */
  async deactivate(deviceId: string): Promise<void> {
    await this.db.collection(this.collection).doc(deviceId).update({
      active: false,
      updatedAt: new Date(),
    });
    logger.info(`Device token deactivated: ${deviceId}`);
  }

  /**
   * Delete a device token
   */
  async delete(deviceId: string): Promise<void> {
    await this.db.collection(this.collection).doc(deviceId).delete();
    logger.info(`Device token deleted: ${deviceId}`);
  }

  /**
   * Get all devices for a user (including inactive)
   */
  async getAllUserDevices(userId: string): Promise<DeviceToken[]> {
    const snapshot = await this.db.collection(this.collection).where('userId', '==', userId).get();
    return snapshot.docs.map(doc => this.mapDocToToken(doc));
  }

  /**
   * Clean up inactive devices older than specified days
   */
  async cleanupInactiveDevices(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const snapshot = await this.db.collection(this.collection)
      .where('active', '==', false)
      .where('updatedAt', '<', cutoffDate)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info(`Cleaned up ${snapshot.size} inactive device tokens`);

    return snapshot.size;
  }

  /**
   * Get statistics for a user's devices
   */
  async getUserDeviceStats(userId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byPlatform: Record<string, number>;
  }> {
    const snapshot = await this.db.collection(this.collection).where('userId', '==', userId).get();
    const devices = snapshot.docs.map(doc => this.mapDocToToken(doc));

    const stats = {
      total: devices.length,
      active: devices.filter(d => d.active).length,
      inactive: devices.filter(d => !d.active).length,
      byPlatform: {} as Record<string, number>,
    };

    devices.forEach(device => {
      stats.byPlatform[device.platform] = (stats.byPlatform[device.platform] || 0) + 1;
    });

    return stats;
  }

  /**
   * Map Firestore document to DeviceToken
   */
  private mapDocToToken(doc: FirebaseFirestore.DocumentSnapshot): DeviceToken {
    const data = doc.data()!;
    return {
      deviceId: doc.id,
      userId: data.userId,
      platform: data.platform,
      token: data.token,
      appVersion: data.appVersion,
      deviceModel: data.deviceModel,
      osVersion: data.osVersion,
      timezone: data.timezone,
      language: data.language,
      lastSeen: data.lastSeen?.toDate(),
      active: data.active,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };
  }
}

export const deviceTokenRepository = new DeviceTokenRepository();
