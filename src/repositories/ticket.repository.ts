import { getFirestore } from '../services/firebase';
import { TicketingTicket, TicketStatus } from '../types';
import admin from 'firebase-admin';

export class TicketRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'tickets';

  async create(ticketData: Omit<TicketingTicket, 'ticketId' | 'createdAt' | 'updatedAt'>): Promise<TicketingTicket> {
    const now = new Date();
    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.collection(this.collection).doc(ticketId).set({
      ...ticketData,
      ticketId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await this.db.collection(this.collection).doc(ticketId).get();
    return this.mapDocToTicket(doc);
  }

  /**
   * Create tickets with concurrency protection using Firestore transaction
   * This prevents overselling by checking capacity and creating tickets atomically
   */
  async createWithConcurrencyCheck(
    eventId: string,
    userId: string,
    creatorId: string,
    orderId: string,
    ticketType: string,
    price: number,
    currency: string,
    quantity: number
  ): Promise<{ tickets: TicketingTicket[]; success: boolean; error?: string }> {
    const db = getFirestore();
    if (!db) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }

    try {
      const result = await db!.runTransaction(async (transaction: admin.firestore.Transaction) => {
        // Check event capacity
        const eventRef = db!.collection('events').doc(eventId);
        const eventDoc = await transaction.get(eventRef);

        if (!eventDoc.exists) {
          throw new Error('Event not found');
        }

        const eventData = eventDoc.data();
        const capacity = eventData?.capacity || 0;

        // Count existing tickets for this event
        const ticketsRef = db!.collection(this.collection).where('eventId', '==', eventId);
        const ticketsSnapshot = await transaction.get(ticketsRef);
        const existingTicketsCount = ticketsSnapshot.size;

        // Check if capacity allows new tickets
        if (existingTicketsCount + quantity > capacity) {
          return {
            tickets: [],
            success: false,
            error: `Insufficient capacity. Available: ${capacity - existingTicketsCount}, Requested: ${quantity}`,
          };
        }

        // Create tickets atomically
        const tickets: TicketingTicket[] = [];
        const now = new Date();

        for (let i = 0; i < quantity; i++) {
          const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const qrCode = `QR_${userId}_${eventId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const qrSignature = `SIG_${this.simpleHash(qrCode)}`;

          const ticketData = {
            eventId,
            userId,
            creatorId,
            orderId,
            ticketType,
            price,
            currency,
            status: 'active',
            qrCode,
            qrSignature,
            purchaseDate: now,
            ticketId,
            createdAt: now,
            updatedAt: now,
          };

          const ticketRef = db!.collection(this.collection).doc(ticketId);
          transaction.set(ticketRef, ticketData);

          tickets.push(ticketData as TicketingTicket);
        }

        return { tickets, success: true };
      });

      return result;
    } catch (error) {
      return {
        tickets: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tickets',
      };
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async findById(ticketId: string): Promise<TicketingTicket | null> {
    const doc = await this.db.collection(this.collection).doc(ticketId).get();
    if (!doc.exists) return null;
    return this.mapDocToTicket(doc);
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<TicketingTicket[]> {
    const maxLimit = Math.min(limit, 100); // Enforce maximum limit of 100
    
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(maxLimit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToTicket(doc));
  }

  async findByOrderId(orderId: string): Promise<TicketingTicket[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('orderId', '==', orderId)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToTicket(doc));
  }

  async findByEventId(eventId: string, limit = 20, offset = 0): Promise<TicketingTicket[]> {
    const maxLimit = Math.min(limit, 100); // Enforce maximum limit of 100
    
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .limit(maxLimit)
      .offset(offset)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToTicket(doc));
  }

  async update(ticketId: string, ticketData: Partial<TicketingTicket>): Promise<TicketingTicket | null> {
    const docRef = this.db.collection(this.collection).doc(ticketId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...ticketData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToTicket(updatedDoc);
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<TicketingTicket | null> {
    return this.update(ticketId, { status });
  }

  async markAsUsed(ticketId: string): Promise<TicketingTicket | null> {
    return this.update(ticketId, {
      status: 'used',
      usedAt: new Date(),
    });
  }

  async cancelTicket(ticketId: string): Promise<TicketingTicket | null> {
    return this.update(ticketId, { status: 'cancelled' });
  }

  async delete(ticketId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(ticketId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  async findByQRCode(qrCode: string): Promise<TicketingTicket | null> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('qrCode', '==', qrCode)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.mapDocToTicket(snapshot.docs[0]);
  }

  async getStatistics(eventId: string): Promise<{
    total: number;
    active: number;
    used: number;
    cancelled: number;
    expired: number;
  }> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('eventId', '==', eventId)
      .get();

    const tickets = snapshot.docs.map((doc) => this.mapDocToTicket(doc));

    return {
      total: tickets.length,
      active: tickets.filter((t) => t.status === 'active').length,
      used: tickets.filter((t) => t.status === 'used').length,
      cancelled: tickets.filter((t) => t.status === 'cancelled').length,
      expired: tickets.filter((t) => t.status === 'expired').length,
    };
  }

  private mapDocToTicket(doc: admin.firestore.DocumentSnapshot): TicketingTicket {
    const data = doc.data() as Record<string, any>;
    return {
      ticketId: doc.id,
      eventId: data.eventId || '',
      userId: data.userId || '',
      creatorId: data.creatorId || '',
      orderId: data.orderId || '',
      ticketType: data.ticketType || 'regular',
      price: data.price || 0,
      currency: data.currency || 'USD',
      status: data.status || 'active',
      qrCode: data.qrCode || '',
      qrSignature: data.qrSignature || '',
      purchaseDate: data.purchaseDate ? data.purchaseDate.toDate() : new Date(),
      usedAt: data.usedAt ? data.usedAt.toDate() : undefined,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
    };
  }
}

export const ticketRepository = new TicketRepository();

