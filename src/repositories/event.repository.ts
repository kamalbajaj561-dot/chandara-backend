import { normalizeEventStatus, storedValuesFor, PUBLIC_EVENT_STATUSES } from '../utils/eventLifecycle';

/** Stored status values that are visible to the public (includes the legacy `approved` alias). */
export const PUBLIC_STORED_STATUSES: string[] = PUBLIC_EVENT_STATUSES.flatMap((st) => storedValuesFor(st));
import { getFirestore } from '../services/firebase';
import { Event } from '../types';
import admin from 'firebase-admin';

export class EventRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'events';

  async findById(id: string): Promise<Event | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return this.mapDocToEvent(doc);
  }

  async findBySlug(slug: string): Promise<Event | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToEvent(snapshot.docs[0]);
  }

  async checkSlugExists(slug: string): Promise<boolean> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  async create(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const now = new Date();
    const docRef = await this.db.collection(this.collection).add({
      ...eventData,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await docRef.get();
    return this.mapDocToEvent(doc);
  }

  async update(id: string, eventData: Partial<Event>): Promise<Event | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...eventData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToEvent(updatedDoc);
  }

  async delete(id: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async listEvents(options: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
    featured?: boolean;
    creatorUid?: string;
    language?: string;
    country?: string;
    /** Restrict to publicly visible statuses (used for anonymous / non-owner callers). */
    publicOnly?: boolean;
  }): Promise<{ events: Event[]; total: number }> {
    let query: admin.firestore.Query = this.db.collection(this.collection);

    if (options.publicOnly && !options.status) {
      query = query.where('status', 'in', PUBLIC_STORED_STATUSES);
    }
    if (options.status) {
      const normalized = normalizeEventStatus(options.status);
      const stored = storedValuesFor(normalized);
      query = stored.length > 1 ? query.where('status', 'in', stored) : query.where('status', '==', stored[0]);
    }
    if (options.category) {
      query = query.where('category', '==', options.category);
    }
    if (options.featured !== undefined) {
      query = query.where('featured', '==', options.featured);
    }
    if (options.creatorUid) {
      query = query.where('creatorUid', '==', options.creatorUid);
    }
    if (options.language) {
      query = query.where('language', '==', options.language);
    }
    if (options.country) {
      query = query.where('country', '==', options.country);
    }

    query = query.orderBy('createdAt', 'desc');

    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const snapshot = await query.limit(limit).offset(offset).get();

    const events = snapshot.docs.map((doc) => this.mapDocToEvent(doc));
    return { events, total };
  }

  async searchEvents(query: string, options: { limit?: number }): Promise<Event[]> {
    const limit = options.limit || 20;

    // Use Promise.all for parallel queries instead of sequential
    const [titleSnapshot, descriptionSnapshot] = await Promise.all([
      this.db
        .collection(this.collection)
        .where('title', '>=', query)
        .where('title', '<=', query + '\uf8ff')
        .limit(limit)
        .get(),
      this.db
        .collection(this.collection)
        .where('description', '>=', query)
        .where('description', '<=', query + '\uf8ff')
        .limit(limit)
        .get(),
    ]);

    const eventsMap = new Map<string, Event>();

    titleSnapshot.docs.forEach((doc) => {
      eventsMap.set(doc.id, this.mapDocToEvent(doc));
    });

    descriptionSnapshot.docs.forEach((doc) => {
      if (!eventsMap.has(doc.id) && eventsMap.size < limit) {
        eventsMap.set(doc.id, this.mapDocToEvent(doc));
      }
    });

    return Array.from(eventsMap.values()).slice(0, limit);
  }

  async getEventsByTags(tags: string[], options: { limit?: number }): Promise<Event[]> {
    const limit = options.limit || 20;
    const eventsMap = new Map<string, Event>();

    // Use Promise.all for parallel queries instead of sequential N+1
    const tagQueries = tags.map(tag =>
      this.db
        .collection(this.collection)
        .where('tags', 'array-contains', tag)
        .limit(limit)
        .get()
    );

    const snapshots = await Promise.all(tagQueries);

    for (const snapshot of snapshots) {
      snapshot.docs.forEach((doc) => {
        if (!eventsMap.has(doc.id)) {
          eventsMap.set(doc.id, this.mapDocToEvent(doc));
        }
      });

      if (eventsMap.size >= limit) break;
    }

    return Array.from(eventsMap.values()).slice(0, limit);
  }

  async getFeaturedEvents(options: { limit?: number }): Promise<Event[]> {
    const limit = options.limit || 20;

    const snapshot = await this.db
      .collection(this.collection)
      .where('featured', '==', true)
      .where('status', 'in', ['scheduled', 'approved', 'live'])
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToEvent(doc));
  }

  async getLiveEvents(options: { limit?: number }): Promise<Event[]> {
    const limit = options.limit || 20;

    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', 'live')
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToEvent(doc));
  }

  async getUpcomingEvents(options: { limit?: number }): Promise<Event[]> {
    const limit = options.limit || 20;
    const now = Date.now();

    // Ordered by planned start. Legacy events may lack scheduledAt, so the "in the future" check is done
    // on the mapped planned start (scheduledAt, else eventDate/eventTime) rather than in the query.
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', 'in', ['scheduled', 'approved'])
      .orderBy('createdAt', 'desc')
      .limit(Math.min(limit * 5, 500))
      .get();

    return snapshot.docs
      .map((doc) => this.mapDocToEvent(doc))
      .map((e) => ({ e, start: plannedStartMs(e) }))
      .filter(({ start }) => start === undefined || start > now)
      .sort((x, y) => (x.start ?? Infinity) - (y.start ?? Infinity))
      .slice(0, limit)
      .map(({ e }) => e);
  }

  async getEventsByCreator(
    creatorUid: string,
    options: { limit?: number; offset?: number; publicOnly?: boolean }
  ): Promise<{ events: Event[]; total: number }> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    let base: admin.firestore.Query = this.db.collection(this.collection).where('creatorUid', '==', creatorUid);
    if (options.publicOnly) {
      base = base.where('status', 'in', PUBLIC_STORED_STATUSES);
    }

    const countSnapshot = await base.count().get();
    const total = countSnapshot.data().count;

    const snapshot = await base.orderBy('createdAt', 'desc').limit(limit).offset(offset).get();

    const events = snapshot.docs.map((doc) => this.mapDocToEvent(doc));
    return { events, total };
  }

  async checkOverlappingEvents(
    creatorUid: string,
    eventDate: string,
    eventTime: string,
    duration?: number,
    excludeEventId?: string
  ): Promise<boolean> {
    let query: admin.firestore.Query = this.db
      .collection(this.collection)
      .where('creatorUid', '==', creatorUid)
      .where('status', 'in', ['scheduled', 'live']);

    const snapshot = await query.get();

    if (snapshot.empty) return false;

    const newEventStart = new Date(`${eventDate}T${eventTime}`);
    const newEventEnd = duration
      ? new Date(newEventStart.getTime() + duration * 60 * 1000)
      : new Date(newEventStart.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    for (const doc of snapshot.docs) {
      if (excludeEventId && doc.id === excludeEventId) continue;

      const event = this.mapDocToEvent(doc);
      const existingEventStart = new Date(`${event.eventDate}T${event.eventTime}`);
      const existingEventDuration = event.duration || 2 * 60 * 60 * 1000; // Default 2 hours
      const existingEventEnd = new Date(existingEventStart.getTime() + existingEventDuration);

      // Check for overlap
      if (newEventStart < existingEventEnd && newEventEnd > existingEventStart) {
        return true;
      }
    }

    return false;
  }

  async updateStatus(id: string, status: Event['status']): Promise<Event | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    const updateData: Partial<Event> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'live') {
      updateData.startedAt = new Date();
    } else if (status === 'ended') {
      updateData.endedAt = new Date();
    }

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    return this.mapDocToEvent(updatedDoc);
  }

  async setFeatured(id: string, featured: boolean): Promise<Event | null> {
    const docRef = this.db.collection(this.collection).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      featured,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToEvent(updatedDoc);
  }

  private mapDocToEvent(doc: admin.firestore.DocumentSnapshot): Event {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }
    return {
      id: doc.id,
      slug: data.slug || '',
      title: data.title || '',
      description: data.description || '',
      category: data.category || '',
      tags: data.tags || [],
      country: data.country || '',
      city: data.city || '',
      venue: data.venue,
      creatorUid: data.creatorUid || data.ownerId || '',
      creatorName: data.creatorName || '',
      ticketPrice: data.ticketPrice || 0,
      currency: data.currency || 'USD',
      cameraType: data.cameraType || '',
      streamType: data.streamType || 'live',
      eventDate: data.eventDate || '',
      eventTime: data.eventTime || '',
      timezone: data.timezone,
      duration: data.duration,
      status: normalizeEventStatus(data.status),
      rejectionReason: data.rejectionReason || undefined,
      thumbnail: data.thumbnail,
      banner: data.banner,
      capacity: data.capacity || 0,
      language: data.language,
      ageRestriction: data.ageRestriction,
      featured: data.featured || false,
      scheduledAt: data.scheduledAt ? data.scheduledAt.toDate() : undefined,
      startedAt: data.startedAt ? data.startedAt.toDate() : undefined,
      endedAt: data.endedAt ? data.endedAt.toDate() : undefined,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const eventRepository = new EventRepository();

/** Planned start (ms) of an event, from scheduledAt or eventDate+eventTime; undefined when unknown. */
export function plannedStartMs(e: Pick<Event, 'scheduledAt' | 'eventDate' | 'eventTime'>): number | undefined {
  if (e.scheduledAt) return e.scheduledAt.getTime();
  if (!e.eventDate) return undefined;
  const d = new Date(e.eventDate);
  if (isNaN(d.getTime())) return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(e.eventTime || '');
  if (m) d.setUTCHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return d.getTime();
}
