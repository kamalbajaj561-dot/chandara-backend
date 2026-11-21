import admin from 'firebase-admin';
import { getFirestore } from '../services/firebase';
import { User } from '../types';
import logger from '../utils/logger';

export class UserRepository {
  private static getCollection() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return db.collection('users');
  }

  static async findById(userId: string): Promise<User | null> {
    try {
      const doc = await this.getCollection().doc(userId).get();
      if (!doc.exists) return null;
      return this.mapDocToUser(doc);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await this.getCollection().where('email', '==', email).limit(1).get();
      if (snapshot.empty) return null;
      return this.mapDocToUser(snapshot.docs[0]);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    try {
      const snapshot = await this.getCollection().where('username', '==', username).limit(1).get();
      if (snapshot.empty) return null;
      return this.mapDocToUser(snapshot.docs[0]);
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const snapshot = await this.getCollection().where('username', '==', username).limit(1).get();
      return !snapshot.empty;
    } catch (error) {
      logger.error('Error checking username existence:', error);
      throw error;
    }
  }

  static async create(user: User): Promise<User> {
    try {
      const userDoc = { ...user, createdAt: new Date(), updatedAt: new Date() };
      await this.getCollection().doc(user.id).set(userDoc);
      return userDoc;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const docRef = this.getCollection().doc(userId);
      const doc = await docRef.get();
      if (!doc.exists) return null;

      const updateData = { ...updates, updatedAt: new Date() };
      await docRef.update(updateData);

      const updatedDoc = await docRef.get();
      return this.mapDocToUser(updatedDoc);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(userId: string): Promise<boolean> {
    try {
      const docRef = this.getCollection().doc(userId);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.delete();
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  static async updateFollowersCount(userId: string, increment: number): Promise<void> {
    try {
      const docRef = this.getCollection().doc(userId);
      await docRef.update({
        followersCount: admin.firestore.FieldValue.increment(increment),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error updating followers count:', error);
      throw error;
    }
  }

  static async updateFollowingCount(userId: string, increment: number): Promise<void> {
    try {
      const docRef = this.getCollection().doc(userId);
      await docRef.update({
        followingCount: admin.firestore.FieldValue.increment(increment),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error updating following count:', error);
      throw error;
    }
  }

  static async listUsers(options: {
    limit?: number;
    offset?: number;
    status?: User['status'];
    role?: User['role'];
  } = {}): Promise<{ users: User[]; total: number }> {
    try {
      let query = this.getCollection() as any;

      if (options.status) {
        query = query.where('status', '==', options.status);
      }
      if (options.role) {
        query = query.where('role', '==', options.role);
      }

      const limit = options.limit || 20;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (offset > 0) {
        query = query.startAfter(offset);
      }

      const snapshot = await query.get();
      const users = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToUser(doc));

      // Get total count
      let countQuery = this.getCollection() as any;
      if (options.status) {
        countQuery = countQuery.where('status', '==', options.status);
      }
      if (options.role) {
        countQuery = countQuery.where('role', '==', options.role);
      }
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return { users, total };
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  static async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    try {
      const snapshot = await this.getCollection()
        .where('displayName', '>=', query)
        .where('displayName', '<=', query + '\uf8ff')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => this.mapDocToUser(doc));
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  private static mapDocToUser(doc: admin.firestore.DocumentSnapshot): User {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      photoURL: data.photoURL,
      bio: data.bio,
      avatar: data.avatar,
      banner: data.banner,
      role: data.role,
      status: data.status,
      language: data.language,
      country: data.country,
      socialLinks: data.socialLinks,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      verified: data.verified,
      trustScore: data.trustScore,
      followersCount: data.followersCount || 0,
      followingCount: data.followingCount || 0,
    };
  }
}
