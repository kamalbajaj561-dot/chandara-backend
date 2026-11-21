import { getFirestore } from '../services/firebase';
import { Stream } from '../types';
import admin from 'firebase-admin';

export class StreamRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'streams';

  async create(streamData: Omit<Stream, 'id' | 'createdAt' | 'updatedAt'>): Promise<Stream> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...streamData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(docRef.id).get();
    return this.mapDocToStream(doc);
  }

  async findById(id: string): Promise<Stream | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToStream(doc);
  }

  async findByStreamId(streamId: string): Promise<Stream | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('streamId', '==', streamId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToStream(snapshot.docs[0]);
  }

  async getByEvent(eventId: string): Promise<Stream | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToStream(snapshot.docs[0]);
  }

  async update(id: string, streamData: Partial<Stream>): Promise<Stream | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...streamData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToStream(updatedDoc);
  }

  async updateViewerCount(id: string, viewerCount: number): Promise<Stream | null> {
    return this.update(id, { viewerCount });
  }

  async updatePeakViewers(id: string, peakViewers: number): Promise<Stream | null> {
    return this.update(id, { peakViewers });
  }

  async updateStatus(id: string, status: Stream['status']): Promise<Stream | null> {
    const updateData: Partial<Stream> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'live' && !updateData.startedAt) {
      updateData.startedAt = new Date();
    } else if (status === 'ended' && !updateData.endedAt) {
      updateData.endedAt = new Date();
    }

    return this.update(id, updateData);
  }

  async updatePublisherConnected(id: string, connected: boolean): Promise<Stream | null> {
    return this.update(id, { publisherConnected: connected });
  }

  async updateHealth(id: string, health: Stream['health']): Promise<Stream | null> {
    return this.update(id, { health });
  }

  async archiveStream(id: string): Promise<Stream | null> {
    return this.update(id, { status: 'ended' });
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async getLiveStreams(): Promise<Stream[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', 'live')
      .orderBy('startedAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToStream(doc));
  }

  async getStreamsByCreator(creatorId: string): Promise<Stream[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('creatorId', '==', creatorId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.mapDocToStream(doc));
  }

  private mapDocToStream(doc: admin.firestore.DocumentSnapshot): Stream {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      streamId: data.streamId || '',
      eventId: data.eventId || '',
      creatorId: data.creatorId || '',
      roomName: data.roomName || '',
      liveKitRoom: data.liveKitRoom || '',
      status: data.status || 'idle',
      publisherConnected: data.publisherConnected || false,
      viewerCount: data.viewerCount || 0,
      peakViewers: data.peakViewers || 0,
      recordingEnabled: data.recordingEnabled || false,
      health: data.health || 'offline',
      startedAt: data.startedAt ? data.startedAt.toDate() : undefined,
      endedAt: data.endedAt ? data.endedAt.toDate() : undefined,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const streamRepository = new StreamRepository();
