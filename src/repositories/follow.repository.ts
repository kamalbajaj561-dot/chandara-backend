import admin from 'firebase-admin';
import { getFirestore } from '../services/firebase';
import { Follower } from '../types';
import logger from '../utils/logger';

export class FollowRepository {
  private static getCollection() {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return db!.collection('followers');
  }

  static async findById(followId: string): Promise<Follower | null> {
    try {
      const doc = await this.getCollection().doc(followId).get();
      if (!doc.exists) return null;
      return this.mapDocToFollower(doc);
    } catch (error) {
      logger.error('Error finding follow by ID:', error);
      throw error;
    }
  }

  static async findExisting(followerId: string, followingId: string): Promise<Follower | null> {
    try {
      const snapshot = await this.getCollection()
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      return this.mapDocToFollower(snapshot.docs[0]);
    } catch (error) {
      logger.error('Error finding existing follow:', error);
      throw error;
    }
  }

  static async checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const snapshot = await this.getCollection()
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (error) {
      logger.error('Error checking if following:', error);
      throw error;
    }
  }

  static async create(followerId: string, followingId: string): Promise<Follower> {
    try {
      const followId = `${followerId}_${followingId}`;
      const followDoc: Follower = {
        id: followId,
        followerId,
        followingId,
        createdAt: new Date(),
      };
      await this.getCollection().doc(followId).set(followDoc);
      return followDoc;
    } catch (error) {
      logger.error('Error creating follow:', error);
      throw error;
    }
  }

  static async delete(followerId: string, followingId: string): Promise<boolean> {
    try {
      const followId = `${followerId}_${followingId}`;
      const docRef = this.getCollection().doc(followId);
      const doc = await docRef.get();
      if (!doc.exists) return false;

      await docRef.delete();
      return true;
    } catch (error) {
      logger.error('Error deleting follow:', error);
      throw error;
    }
  }

  static async getFollowers(userId: string, options: { limit?: number; offset?: number } = {}): Promise<{
    followers: Follower[];
    total: number;
  }> {
    try {
      let query = this.getCollection().where('followingId', '==', userId) as any;

      const limit = options.limit || 20;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (offset > 0) {
        query = query.startAfter(offset);
      }

      const snapshot = await query.get();
      const followers = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToFollower(doc));

      // Get total count
      const countSnapshot = await this.getCollection()
        .where('followingId', '==', userId)
        .count()
        .get();
      const total = countSnapshot.data().count;

      return { followers, total };
    } catch (error) {
      logger.error('Error getting followers:', error);
      throw error;
    }
  }

  static async getFollowing(userId: string, options: { limit?: number; offset?: number } = {}): Promise<{
    following: Follower[];
    total: number;
  }> {
    try {
      let query = this.getCollection().where('followerId', '==', userId) as any;

      const limit = options.limit || 20;
      const offset = options.offset || 0;

      query = query.orderBy('createdAt', 'desc').limit(limit);

      if (offset > 0) {
        query = query.startAfter(offset);
      }

      const snapshot = await query.get();
      const following = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => this.mapDocToFollower(doc));

      // Get total count
      const countSnapshot = await this.getCollection()
        .where('followerId', '==', userId)
        .count()
        .get();
      const total = countSnapshot.data().count;

      return { following, total };
    } catch (error) {
      logger.error('Error getting following:', error);
      throw error;
    }
  }

  static async getFollowersCount(userId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where('followingId', '==', userId)
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      logger.error('Error getting followers count:', error);
      throw error;
    }
  }

  static async getFollowingCount(userId: string): Promise<number> {
    try {
      const snapshot = await this.getCollection()
        .where('followerId', '==', userId)
        .count()
        .get();
      return snapshot.data().count;
    } catch (error) {
      logger.error('Error getting following count:', error);
      throw error;
    }
  }

  static async followWithTransaction(
    followerId: string,
    followingId: string,
    db: admin.firestore.Firestore
  ): Promise<Follower> {
    try {
      const followId = `${followerId}_${followingId}`;
      const followDoc: Follower = {
        id: followId,
        followerId,
        followingId,
        createdAt: new Date(),
      };

      await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        // Check if already following
        const followRef = this.getCollection().doc(followId);
        const followDoc = await transaction.get(followRef);

        if (followDoc.exists) {
          throw new Error('Already following');
        }

        // Create follow relationship
        transaction.set(followRef, followDoc);

        // Update follower's following count
        const followerRef = db.collection('users').doc(followerId);
        transaction.update(followerRef, {
          followingCount: admin.firestore.FieldValue.increment(1),
          updatedAt: new Date(),
        });

        // Update following's followers count
        const followingRef = db.collection('users').doc(followingId);
        transaction.update(followingRef, {
          followersCount: admin.firestore.FieldValue.increment(1),
          updatedAt: new Date(),
        });

        // Also update creator followers count if following is a creator
        const creatorRef = db.collection('creators').where('userId', '==', followingId).limit(1);
        const creatorSnapshot = await transaction.get(creatorRef);
        if (!creatorSnapshot.empty) {
          const creatorDocRef = creatorSnapshot.docs[0].ref;
          transaction.update(creatorDocRef, {
            followersCount: admin.firestore.FieldValue.increment(1),
            updatedAt: new Date(),
          });
        }
      });

      return followDoc;
    } catch (error) {
      logger.error('Error following with transaction:', error);
      throw error;
    }
  }

  static async unfollowWithTransaction(
    followerId: string,
    followingId: string,
    db: admin.firestore.Firestore
  ): Promise<boolean> {
    try {
      const followId = `${followerId}_${followingId}`;

      await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        // Check if following exists
        const followRef = this.getCollection().doc(followId);
        const followDoc = await transaction.get(followRef);

        if (!followDoc.exists) {
          throw new Error('Not following');
        }

        // Delete follow relationship
        transaction.delete(followRef);

        // Update follower's following count
        const followerRef = db.collection('users').doc(followerId);
        transaction.update(followerRef, {
          followingCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: new Date(),
        });

        // Update following's followers count
        const followingRef = db.collection('users').doc(followingId);
        transaction.update(followingRef, {
          followersCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: new Date(),
        });

        // Also update creator followers count if following is a creator
        const creatorRef = db.collection('creators').where('userId', '==', followingId).limit(1);
        const creatorSnapshot = await transaction.get(creatorRef);
        if (!creatorSnapshot.empty) {
          const creatorDocRef = creatorSnapshot.docs[0].ref;
          transaction.update(creatorDocRef, {
            followersCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: new Date(),
          });
        }
      });

      return true;
    } catch (error) {
      logger.error('Error unfollowing with transaction:', error);
      throw error;
    }
  }

  private static mapDocToFollower(doc: admin.firestore.DocumentSnapshot): Follower {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      followerId: data.followerId,
      followingId: data.followingId,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  }
}
