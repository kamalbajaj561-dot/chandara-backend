import admin from 'firebase-admin';
import { getFirestore } from '../services/firebase';
import { Creator, VerificationRequest } from '../types';
import logger from '../utils/logger';

export class CreatorRepository {
  private static getCollection() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return db.collection('creators');
  }

  static async findById(creatorId: string): Promise<Creator | null> {
    try {
      const doc = await this.getCollection().doc(creatorId).get();
      if (!doc.exists) return null;
      return this.mapDocToCreator(doc);
    } catch (error) {
      logger.error('Error finding creator by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId: string): Promise<Creator | null> {
    try {
      const snapshot = await this.getCollection().where('userId', '==', userId).limit(1).get();
      if (snapshot.empty) return null;
      return this.mapDocToCreator(snapshot.docs[0]);
    } catch (error) {
      logger.error('Error finding creator by user ID:', error);
      throw error;
    }
  }

  static async findByUsername(username: string): Promise<Creator | null> {
    try {
      const snapshot = await this.getCollection().where('username', '==', username).limit(1).get();
      if (snapshot.empty) return null;
      return this.mapDocToCreator(snapshot.docs[0]);
    } catch (error) {
      logger.error('Error finding creator by username:', error);
      throw error;
    }
  }

  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const snapshot = await this.getCollection().where('username', '==', username).limit(1).get();
      return !snapshot.empty;
    } catch (error) {
      logger.error('Error checking creator username existence:', error);
      throw error;
    }
  }

  static async create(creator: Creator): Promise<Creator> {
    try {
      const creatorDoc = { ...creator, createdAt: new Date(), updatedAt: new Date() };
      await this.getCollection().doc(creator.id).set(creatorDoc);
      return creatorDoc;
    } catch (error) {
      logger.error('Error creating creator:', error);
      throw error;
    }
  }

  static async update(creatorId: string, updates: Partial<Creator>): Promise<Creator | null> {
    try {
      const docRef = this.getCollection().doc(creatorId);
      const doc = await docRef.get();
      if (!doc.exists) return null;

      const updateData = { ...updates, updatedAt: new Date() };
      await docRef.update(updateData);

      const updatedDoc = await docRef.get();
      return this.mapDocToCreator(updatedDoc);
    } catch (error) {
      logger.error('Error updating creator:', error);
      throw error;
    }
  }

  static async delete(creatorId: string): Promise<boolean> {
    try {
      const docRef = this.getCollection().doc(creatorId);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.delete();
      return true;
    } catch (error) {
      logger.error('Error deleting creator:', error);
      throw error;
    }
  }

  static async updateFollowersCount(creatorId: string, increment: number): Promise<void> {
    try {
      const docRef = this.getCollection().doc(creatorId);
      await docRef.update({
        followersCount: admin.firestore.FieldValue.increment(increment),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error updating creator followers count:', error);
      throw error;
    }
  }

  static async updateEventsCount(creatorId: string, increment: number): Promise<void> {
    try {
      const docRef = this.getCollection().doc(creatorId);
      await docRef.update({
        eventsCount: admin.firestore.FieldValue.increment(increment),
        updatedAt: new Date(),
      });
    } catch (error) {
      logger.error('Error updating creator events count:', error);
      throw error;
    }
  }

  static async updateVerificationStatus(
    creatorId: string,
    status: 'pending' | 'approved' | 'rejected',
    verificationRequest?: VerificationRequest
  ): Promise<Creator | null> {
    try {
      const docRef = this.getCollection().doc(creatorId);
      const doc = await docRef.get();
      if (!doc.exists) return null;

      const updateData: Partial<Creator> = {
        verificationStatus: status,
        verified: status === 'approved',
        updatedAt: new Date(),
      };

      if (verificationRequest) {
        updateData.verificationRequest = verificationRequest;
      }

      await docRef.update(updateData);

      const updatedDoc = await docRef.get();
      return this.mapDocToCreator(updatedDoc);
    } catch (error) {
      logger.error('Error updating creator verification status:', error);
      throw error;
    }
  }

  static async setFeatured(creatorId: string, featured: boolean): Promise<Creator | null> {
    try {
      const docRef = this.getCollection().doc(creatorId);
      const doc = await docRef.get();
      if (!doc.exists) return null;

      await docRef.update({
        featured,
        updatedAt: new Date(),
      });

      const updatedDoc = await docRef.get();
      return this.mapDocToCreator(updatedDoc);
    } catch (error) {
      logger.error('Error setting creator featured status:', error);
      throw error;
    }
  }

  static async listCreators(options: {
    limit?: number;
    offset?: number;
    category?: string;
    verified?: boolean;
    featured?: boolean;
    verificationStatus?: 'pending' | 'approved' | 'rejected';
  } = {}): Promise<{ creators: Creator[]; total: number }> {
    try {
      let query = this.getCollection() as any;

      if (options.category) {
        query = query.where('category', '==', options.category);
      }
      if (options.verified !== undefined) {
        query = query.where('verified', '==', options.verified);
      }
      if (options.featured !== undefined) {
        query = query.where('featured', '==', options.featured);
      }
      if (options.verificationStatus) {
        query = query.where('verificationStatus', '==', options.verificationStatus);
      }

      const limit = options.limit || 20;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (offset > 0) {
        query = query.startAfter(offset);
      }

      const snapshot = await query.get();
      const creators = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToCreator(doc));

      // Get total count
      let countQuery = this.getCollection() as any;
      if (options.category) {
        countQuery = countQuery.where('category', '==', options.category);
      }
      if (options.verified !== undefined) {
        countQuery = countQuery.where('verified', '==', options.verified);
      }
      if (options.featured !== undefined) {
        countQuery = countQuery.where('featured', '==', options.featured);
      }
      if (options.verificationStatus) {
        countQuery = countQuery.where('verificationStatus', '==', options.verificationStatus);
      }
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return { creators, total };
    } catch (error) {
      logger.error('Error listing creators:', error);
      throw error;
    }
  }

  static async searchCreators(query: string, limit: number = 20): Promise<Creator[]> {
    try {
      const snapshot = await this.getCollection()
        .where('displayName', '>=', query)
        .where('displayName', '<=', query + '\uf8ff')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToCreator(doc));
    } catch (error) {
      logger.error('Error searching creators:', error);
      throw error;
    }
  }

  static async getFeaturedCreators(limit: number = 10): Promise<Creator[]> {
    try {
      const snapshot = await this.getCollection()
        .where('featured', '==', true)
        .where('verified', '==', true)
        .orderBy('followersCount', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToCreator(doc));
    } catch (error) {
      logger.error('Error getting featured creators:', error);
      throw error;
    }
  }

  static async getCreatorsByCategory(category: string, limit: number = 20): Promise<Creator[]> {
    try {
      const snapshot = await this.getCollection()
        .where('category', '==', category)
        .where('verified', '==', true)
        .orderBy('followersCount', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToCreator(doc));
    } catch (error) {
      logger.error('Error getting creators by category:', error);
      throw error;
    }
  }

  private static mapDocToCreator(doc: admin.firestore.DocumentSnapshot): Creator {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      bio: data.bio,
      avatar: data.avatar,
      banner: data.banner,
      category: data.category,
      language: data.language,
      country: data.country,
      socialLinks: data.socialLinks,
      verified: data.verified,
      verificationStatus: data.verificationStatus,
      verificationRequest: data.verificationRequest,
      featured: data.featured,
      followersCount: data.followersCount || 0,
      eventsCount: data.eventsCount || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
}
