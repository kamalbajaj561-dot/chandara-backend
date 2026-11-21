import { getFirestore } from '../services/firebase';
import { ChatRoom } from '../types';
import admin from 'firebase-admin';

export class ChatRoomRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'chat_rooms';

  async create(roomData: Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatRoom> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...roomData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToRoom(doc);
  }

  async findById(id: string): Promise<ChatRoom | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToRoom(doc);
  }

  async findByEventId(eventId: string): Promise<ChatRoom | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToRoom(snapshot.docs[0]);
  }

  async update(id: string, roomData: Partial<ChatRoom>): Promise<ChatRoom | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...roomData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToRoom(updatedDoc);
  }

  async updateSlowMode(id: string, slowMode: boolean, interval: number): Promise<ChatRoom | null> {
    return this.update(id, { slowMode, slowModeInterval: interval });
  }

  async toggleChatEnabled(id: string, enabled: boolean): Promise<ChatRoom | null> {
    return this.update(id, { chatEnabled: enabled });
  }

  async setSubscriberOnly(id: string, subscriberOnly: boolean): Promise<ChatRoom | null> {
    return this.update(id, { subscriberOnly });
  }

  async setFollowersOnly(id: string, followersOnly: boolean): Promise<ChatRoom | null> {
    return this.update(id, { followersOnly });
  }

  async addModerator(id: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    const moderators = room.moderators.includes(userId) ? room.moderators : [...room.moderators, userId];
    return this.update(id, { moderators });
  }

  async removeModerator(id: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    const moderators = room.moderators.filter((id) => id !== userId);
    return this.update(id, { moderators });
  }

  async addBannedUser(id: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    const bannedUsers = room.bannedUsers.includes(userId) ? room.bannedUsers : [...room.bannedUsers, userId];
    return this.update(id, { bannedUsers });
  }

  async removeBannedUser(id: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    const bannedUsers = room.bannedUsers.filter((id) => id !== userId);
    return this.update(id, { bannedUsers });
  }

  async addMutedUser(id: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    const mutedUsers = room.mutedUsers.includes(userId) ? room.mutedUsers : [...room.mutedUsers, userId];
    return this.update(id, { mutedUsers });
  }

  async removeMutedUser(id: string, userId: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    const mutedUsers = room.mutedUsers.filter((id) => id !== userId);
    return this.update(id, { mutedUsers });
  }

  async incrementMessageCount(id: string): Promise<ChatRoom | null> {
    const room = await this.findById(id);
    if (!room) return null;

    return this.update(id, { messageCount: room.messageCount + 1 });
  }

  async updateActiveUsers(id: string, count: number): Promise<ChatRoom | null> {
    return this.update(id, { activeUsers: count });
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  private mapDocToRoom(doc: admin.firestore.DocumentSnapshot): ChatRoom {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      eventId: data.eventId || '',
      slowMode: data.slowMode || false,
      slowModeInterval: data.slowModeInterval || 10,
      chatEnabled: data.chatEnabled !== false,
      subscriberOnly: data.subscriberOnly || false,
      followersOnly: data.followersOnly || false,
      moderators: data.moderators || [],
      bannedUsers: data.bannedUsers || [],
      mutedUsers: data.mutedUsers || [],
      messageCount: data.messageCount || 0,
      activeUsers: data.activeUsers || 0,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const chatRoomRepository = new ChatRoomRepository();
