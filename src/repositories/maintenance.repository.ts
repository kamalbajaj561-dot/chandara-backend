import { getFirestore } from '../services/firebase';
import { MaintenanceMode } from '../types';
import logger from '../utils/logger';

/**
 * Maintenance Mode Repository
 * Manages platform maintenance mode settings
 */
export class MaintenanceRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'maintenance';

  /**
   * Create or update maintenance mode
   */
  async upsert(maintenance: Omit<MaintenanceMode, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = 'maintenance_mode';
    const existing = await this.findById(id);
    
    const maintenanceMode: MaintenanceMode = existing
      ? { ...existing, ...maintenance, updatedAt: new Date() }
      : {
          id,
          ...maintenance,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    await this.db.collection(this.collection).doc(id).set(maintenanceMode);
    logger.debug(`Maintenance mode updated: ${maintenance.enabled ? 'enabled' : 'disabled'}`);
    return id;
  }

  /**
   * Find maintenance mode by ID
   */
  async findById(id: string): Promise<MaintenanceMode | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as MaintenanceMode;
  }

  /**
   * Get current maintenance mode
   */
  async getCurrent(): Promise<MaintenanceMode | null> {
    return this.findById('maintenance_mode');
  }

  /**
   * Enable maintenance mode
   */
  async enable(message: string, createdBy: string, estimatedEndTime?: Date, whitelistedAdmins: string[] = [], whitelistedIps?: string[]): Promise<void> {
    const maintenance: Omit<MaintenanceMode, 'id' | 'createdAt' | 'updatedAt'> = {
      enabled: true,
      message,
      startTime: new Date(),
      estimatedEndTime,
      whitelistedAdmins,
      whitelistedIps,
      createdBy,
    };

    await this.upsert(maintenance);
    logger.info(`Maintenance mode enabled by ${createdBy}`);
  }

  /**
   * Disable maintenance mode
   */
  async disable(updatedBy: string): Promise<void> {
    const maintenance: Omit<MaintenanceMode, 'id' | 'createdAt' | 'updatedAt'> = {
      enabled: false,
      message: undefined,
      startTime: undefined,
      estimatedEndTime: undefined,
      whitelistedAdmins: [],
      whitelistedIps: [],
      createdBy: updatedBy,
    };

    await this.upsert(maintenance);
    logger.info(`Maintenance mode disabled by ${updatedBy}`);
  }

  /**
   * Add admin to whitelist
   */
  async addToWhitelist(adminId: string): Promise<void> {
    const current = await this.getCurrent();
    if (!current) return;

    if (!current.whitelistedAdmins.includes(adminId)) {
      current.whitelistedAdmins.push(adminId);
      await this.upsert(current);
      logger.debug(`Admin ${adminId} added to maintenance whitelist`);
    }
  }

  /**
   * Remove admin from whitelist
   */
  async removeFromWhitelist(adminId: string): Promise<void> {
    const current = await this.getCurrent();
    if (!current) return;

    current.whitelistedAdmins = current.whitelistedAdmins.filter(id => id !== adminId);
    await this.upsert(current);
    logger.debug(`Admin ${adminId} removed from maintenance whitelist`);
  }

  /**
   * Check if admin is whitelisted
   */
  async isWhitelisted(adminId: string): Promise<boolean> {
    const current = await this.getCurrent();
    if (!current || !current.enabled) return true; // No maintenance mode
    return current.whitelistedAdmins.includes(adminId);
  }

  /**
   * Check if IP is whitelisted
   */
  async isIpWhitelisted(ip: string): Promise<boolean> {
    const current = await this.getCurrent();
    if (!current || !current.enabled) return true; // No maintenance mode
    if (!current.whitelistedIps || current.whitelistedIps.length === 0) return false;
    return current.whitelistedIps.includes(ip);
  }

  /**
   * Update maintenance message
   */
  async updateMessage(message: string, estimatedEndTime?: Date): Promise<void> {
    const current = await this.getCurrent();
    if (!current) return;

    await this.upsert({
      ...current,
      message,
      estimatedEndTime,
    });
  }
}

export const maintenanceRepository = new MaintenanceRepository();
