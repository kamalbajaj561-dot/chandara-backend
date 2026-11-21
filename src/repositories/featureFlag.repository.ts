import { getFirestore } from '../services/firebase';
import { FeatureFlag } from '../types';
import logger from '../utils/logger';

/**
 * Feature Flag Repository
 * Manages feature flags for controlled rollouts
 */
export class FeatureFlagRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'feature_flags';

  /**
   * Create a feature flag
   */
  async create(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const featureFlag: FeatureFlag = {
      id,
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection(this.collection).doc(id).set(featureFlag);
    logger.debug(`Feature flag created: ${flag.key}`);
    return id;
  }

  /**
   * Find feature flag by ID
   */
  async findById(id: string): Promise<FeatureFlag | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as FeatureFlag;
  }

  /**
   * Find feature flag by key
   */
  async findByKey(key: string): Promise<FeatureFlag | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('key', '==', key)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as FeatureFlag;
  }

  /**
   * Get all feature flags
   */
  async getAll(): Promise<FeatureFlag[]> {
    const snapshot = await this.db.collection(this.collection).get();
    return snapshot.docs.map(doc => doc.data() as FeatureFlag);
  }

  /**
   * Get enabled feature flags
   */
  async getEnabled(): Promise<FeatureFlag[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('enabled', '==', true)
      .get();

    return snapshot.docs.map(doc => doc.data() as FeatureFlag);
  }

  /**
   * Update a feature flag
   */
  async update(id: string, updates: Partial<Omit<FeatureFlag, 'id' | 'createdAt'>>): Promise<void> {
    const ref = this.db.collection(this.collection).doc(id);
    await ref.update({
      ...updates,
      updatedAt: new Date(),
    });
    logger.debug(`Feature flag updated: ${id}`);
  }

  /**
   * Enable a feature flag
   */
  async enable(id: string, updatedBy: string): Promise<void> {
    await this.update(id, { enabled: true, updatedBy });
  }

  /**
   * Disable a feature flag
   */
  async disable(id: string, updatedBy: string): Promise<void> {
    await this.update(id, { enabled: false, updatedBy });
  }

  /**
   * Delete a feature flag
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
    logger.debug(`Feature flag deleted: ${id}`);
  }

  /**
   * Check if a feature is enabled for a user
   */
  async isEnabledForUser(key: string, userId: string): Promise<boolean> {
    const flag = await this.findByKey(key);
    if (!flag || !flag.enabled) return false;

    switch (flag.rolloutType) {
      case 'all':
        return true;
      case 'percentage':
        const hash = this.hashUserId(userId, key);
        return (hash % 100) < (flag.rolloutPercentage || 0);
      case 'user_list':
        return flag.allowedUsers?.includes(userId) || false;
      case 'environment':
        const env = process.env.NODE_ENV || 'development';
        return flag.allowedEnvironments?.includes(env) || false;
      default:
        return false;
    }
  }

  /**
   * Check if a feature is enabled globally
   */
  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.findByKey(key);
    return flag?.enabled || false;
  }

  /**
   * Get feature flags by environment
   */
  async getByEnvironment(environment: string): Promise<FeatureFlag[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('allowedEnvironments', 'array-contains', environment)
      .get();

    return snapshot.docs.map(doc => doc.data() as FeatureFlag);
  }

  /**
   * Hash user ID for percentage rollout
   */
  private hashUserId(userId: string, key: string): number {
    const str = `${userId}_${key}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const featureFlagRepository = new FeatureFlagRepository();
