import { getFirestore } from '../services/firebase';
import { StreamHealth } from '../types';
import admin from 'firebase-admin';

export class StreamHealthRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'stream_health';

  async create(healthData: Omit<StreamHealth, 'id' | 'lastChecked'>): Promise<StreamHealth> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...healthData,
      lastChecked: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToHealth(doc);
  }

  async findById(id: string): Promise<StreamHealth | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToHealth(doc);
  }

  async findByStreamId(streamId: string): Promise<StreamHealth | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .orderBy('lastChecked', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToHealth(snapshot.docs[0]);
  }

  async update(id: string, healthData: Partial<StreamHealth>): Promise<StreamHealth | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...healthData,
      lastChecked: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToHealth(updatedDoc);
  }

  async updateHealth(id: string, health: StreamHealth['health']): Promise<StreamHealth | null> {
    return this.update(id, { health });
  }

  async updatePublisherConnected(id: string, connected: boolean): Promise<StreamHealth | null> {
    return this.update(id, { publisherConnected: connected });
  }

  async updateRoomExists(id: string, exists: boolean): Promise<StreamHealth | null> {
    return this.update(id, { roomExists: exists });
  }

  async updateViewerCount(id: string, viewerCount: number): Promise<StreamHealth | null> {
    return this.update(id, { viewerCount });
  }

  async incrementReconnectAttempts(id: string): Promise<StreamHealth | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const currentHealth = this.mapDocToHealth(doc);
    await docRef.update({
      reconnectAttempts: currentHealth.reconnectAttempts + 1,
      lastChecked: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToHealth(updatedDoc);
  }

  async updateHeartbeat(id: string): Promise<StreamHealth | null> {
    return this.update(id, { heartbeatTimestamp: new Date() });
  }

  async updateLiveKitAvailable(id: string, available: boolean): Promise<StreamHealth | null> {
    return this.update(id, { liveKitAvailable: available });
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async deleteByStreamId(streamId: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .get();

    if (snapshot.empty) return false;

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return true;
  }

  async getUnhealthyStreams(thresholdMinutes = 5): Promise<StreamHealth[]> {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    const snapshot = await this.db
      .collection(this.collection)
      .where('heartbeatTimestamp', '<', threshold)
      .where('health', '!=', 'offline')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToHealth(doc));
  }

  private mapDocToHealth(doc: admin.firestore.DocumentSnapshot): StreamHealth {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      streamId: data.streamId || '',
      publisherConnected: data.publisherConnected || false,
      roomExists: data.roomExists || false,
      viewerCount: data.viewerCount || 0,
      reconnectAttempts: data.reconnectAttempts || 0,
      heartbeatTimestamp: data.heartbeatTimestamp ? data.heartbeatTimestamp.toDate() : new Date(),
      liveKitAvailable: data.liveKitAvailable || false,
      health: data.health || 'offline',
      lastChecked: data.lastChecked ? data.lastChecked.toDate() : new Date(),
    };
  }
}

export const streamHealthRepository = new StreamHealthRepository();
