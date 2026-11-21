import { getFirestore } from '../services/firebase';
import { AdminUser } from '../types';
import logger from '../utils/logger';

/**
 * Admin User Repository
 * Manages administrator accounts and permissions
 */
export class AdminRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'admin_users';

  /**
   * Create an admin user
   */
  async create(admin: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `admin_${admin.userId}`;
    const adminUser: AdminUser = {
      id,
      ...admin,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection(this.collection).doc(id).set(adminUser);
    logger.debug(`Admin user created: ${admin.userId}`);
    return id;
  }

  /**
   * Find admin by ID
   */
  async findById(id: string): Promise<AdminUser | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as AdminUser;
  }

  /**
   * Find admin by user ID
   */
  async findByUserId(userId: string): Promise<AdminUser | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as AdminUser;
  }

  /**
   * Get all admins
   */
  async getAll(): Promise<AdminUser[]> {
    const snapshot = await this.db.collection(this.collection).get();
    return snapshot.docs.map(doc => doc.data() as AdminUser);
  }

  /**
   * Get admins by role
   */
  async getByRole(role: AdminUser['role']): Promise<AdminUser[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('role', '==', role)
      .get();

    return snapshot.docs.map(doc => doc.data() as AdminUser);
  }

  /**
   * Update admin
   */
  async update(id: string, updates: Partial<Omit<AdminUser, 'id' | 'createdAt'>>): Promise<void> {
    const ref = this.db.collection(this.collection).doc(id);
    await ref.update({
      ...updates,
      updatedAt: new Date(),
    });
    logger.debug(`Admin user updated: ${id}`);
  }

  /**
   * Update admin role
   */
  async updateRole(id: string, role: AdminUser['role']): Promise<void> {
    await this.update(id, { role });
  }

  /**
   * Update admin permissions
   */
  async updatePermissions(id: string, permissions: string[]): Promise<void> {
    await this.update(id, { permissions });
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string, ip: string): Promise<void> {
    await this.update(id, {
      lastLogin: new Date(),
      lastLoginIp: ip,
    });
  }

  /**
   * Delete admin
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
    logger.debug(`Admin user deleted: ${id}`);
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const admin = await this.findByUserId(userId);
    return admin !== null;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const admin = await this.findByUserId(userId);
    if (!admin) return false;
    
    // Super admins have all permissions
    if (admin.role === 'super_admin') return true;
    
    return admin.permissions.includes(permission);
  }

  /**
   * Get admin statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byRole: Record<string, number>;
    activeLast24h: number;
    activeLast7d: number;
  }> {
    const admins = await this.getAll();
    const byRole: Record<string, number> = {};
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let activeLast24h = 0;
    let activeLast7d = 0;

    for (const admin of admins) {
      byRole[admin.role] = (byRole[admin.role] || 0) + 1;
      
      if (admin.lastLogin && admin.lastLogin >= dayAgo) {
        activeLast24h++;
      }
      if (admin.lastLogin && admin.lastLogin >= weekAgo) {
        activeLast7d++;
      }
    }

    return {
      total: admins.length,
      byRole,
      activeLast24h,
      activeLast7d,
    };
  }
}

export const adminRepository = new AdminRepository();
