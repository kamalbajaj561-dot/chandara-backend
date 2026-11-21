import { getFirestore } from '../services/firebase';
import { ChatMessage, MessageReaction } from '../types';
import admin from 'firebase-admin';

export class ChatMessageRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'chat_messages';

  async create(messageData: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatMessage> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...messageData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToMessage(doc);
  }

  async findById(id: string): Promise<ChatMessage | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToMessage(doc);
  }

  async findByMessageId(messageId: string): Promise<ChatMessage | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('messageId', '==', messageId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToMessage(snapshot.docs[0]);
  }

  async findByEventId(eventId: string, limit = 50, before?: Date): Promise<ChatMessage[]> {
    let query = this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (before) {
      query = query.where('createdAt', '<', before);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapDocToMessage(doc)).reverse();
  }

  async findByStreamId(streamId: string, limit = 50, before?: Date): Promise<ChatMessage[]> {
    let query = this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (before) {
      query = query.where('createdAt', '<', before);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapDocToMessage(doc)).reverse();
  }

  async findBySenderId(senderId: string, limit = 50): Promise<ChatMessage[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('senderId', '==', senderId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToMessage(doc));
  }

  async findPinnedByEventId(eventId: string): Promise<ChatMessage[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .where('isPinned', '==', true)
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToMessage(doc));
  }

  async searchMessages(eventId: string, searchTerm: string, limit = 50): Promise<ChatMessage[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const allMessages = snapshot.docs.map((doc) => this.mapDocToMessage(doc));
    return allMessages.filter((msg) => 
      msg.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async update(id: string, messageData: Partial<ChatMessage>): Promise<ChatMessage | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...messageData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToMessage(updatedDoc);
  }

  async editMessage(id: string, newMessage: string): Promise<ChatMessage | null> {
    return this.update(id, { message: newMessage, isEdited: true });
  }

  async pinMessage(id: string, pinned: boolean): Promise<ChatMessage | null> {
    return this.update(id, { isPinned: pinned });
  }

  async deleteMessage(id: string): Promise<ChatMessage | null> {
    return this.update(id, { isDeleted: true, message: '[Message deleted]' });
  }

  async addReaction(id: string, reaction: MessageReaction): Promise<ChatMessage | null> {
    const message = await this.findById(id);
    if (!message) return null;

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.emoji === reaction.emoji && r.userId === reaction.userId
    );

    let reactions: MessageReaction[];
    if (existingReactionIndex >= 0) {
      reactions = message.reactions;
    } else {
      reactions = [...message.reactions, reaction];
    }

    return this.update(id, { reactions });
  }

  async removeReaction(id: string, emoji: string, userId: string): Promise<ChatMessage | null> {
    const message = await this.findById(id);
    if (!message) return null;

    const reactions = message.reactions.filter(
      (r) => !(r.emoji === emoji && r.userId === userId)
    );

    return this.update(id, { reactions });
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async deleteByEventId(eventId: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .get();

    if (snapshot.empty) return false;

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return true;
  }

  private mapDocToMessage(doc: admin.firestore.DocumentSnapshot): ChatMessage {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      messageId: data.messageId || '',
      eventId: data.eventId || '',
      streamId: data.streamId || '',
      senderId: data.senderId || '',
      senderName: data.senderName || '',
      senderRole: data.senderRole || 'viewer',
      message: data.message || '',
      messageType: data.messageType || 'text',
      replyTo: data.replyTo,
      reactions: data.reactions || [],
      isPinned: data.isPinned || false,
      isDeleted: data.isDeleted || false,
      isEdited: data.isEdited || false,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const chatMessageRepository = new ChatMessageRepository();
