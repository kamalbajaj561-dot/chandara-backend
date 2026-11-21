import { getFirestore } from '../services/firebase';
import { SystemSetting } from '../types';
import logger from '../utils/logger';

/**
 * System Settings Repository
 * Manages platform-wide configuration settings
 */
export class SystemSettingsRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'system_settings';

  /**
   * Create or update a system setting
   */
  async upsert(key: string, value: any, category: SystemSetting['category'], updatedBy: string, description?: string): Promise<void> {
    const id = key;
    const existing = await this.findById(id);
    
    const setting: SystemSetting = existing
      ? { ...existing, value, category, description, updatedAt: new Date(), updatedBy }
      : {
          id,
          key,
          value,
          category,
          description,
          type: this.inferType(value),
          updatedAt: new Date(),
          updatedBy,
        };

    await this.db.collection(this.collection).doc(id).set(setting);
    logger.debug(`System setting updated: ${key}`);
  }

  /**
   * Find setting by key
   */
  async findById(id: string): Promise<SystemSetting | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as SystemSetting;
  }

  /**
   * Get setting by key (alias for findById)
   */
  async get(key: string): Promise<SystemSetting | null> {
    return this.findById(key);
  }

  /**
   * Get value by key
   */
  async getValue(key: string): Promise<any> {
    const setting = await this.get(key);
    return setting?.value;
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<SystemSetting[]> {
    const snapshot = await this.db.collection(this.collection).get();
    return snapshot.docs.map(doc => doc.data() as SystemSetting);
  }

  /**
   * Get settings by category
   */
  async getByCategory(category: SystemSetting['category']): Promise<SystemSetting[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('category', '==', category)
      .get();

    return snapshot.docs.map(doc => doc.data() as SystemSetting);
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<void> {
    await this.db.collection(this.collection).doc(key).delete();
    logger.debug(`System setting deleted: ${key}`);
  }

  /**
   * Bulk update settings
   */
  async bulkUpdate(settings: Array<{ key: string; value: any; category: SystemSetting['category']; updatedBy: string }>): Promise<void> {
    const batch = this.db.batch();

    for (const setting of settings) {
      const ref = this.db.collection(this.collection).doc(setting.key);
      const existing = await this.findById(setting.key);
      
      const systemSetting: SystemSetting = existing
        ? { ...existing, value: setting.value, category: setting.category, updatedAt: new Date(), updatedBy: setting.updatedBy }
        : {
            id: setting.key,
            key: setting.key,
            value: setting.value,
            category: setting.category,
            type: this.inferType(setting.value),
            updatedAt: new Date(),
            updatedBy: setting.updatedBy,
          };

      batch.set(ref, systemSetting);
    }

    await batch.commit();
    logger.info(`Bulk updated ${settings.length} system settings`);
  }

  /**
   * Get settings as a key-value map
   */
  async getAsMap(): Promise<Record<string, any>> {
    const settings = await this.getAll();
    const map: Record<string, any> = {};

    for (const setting of settings) {
      map[setting.key] = setting.value;
    }

    return map;
  }

  /**
   * Infer type from value
   */
  private inferType(value: any): SystemSetting['type'] {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'object') return 'json';
    return 'string';
  }
}

export const systemSettingsRepository = new SystemSettingsRepository();
