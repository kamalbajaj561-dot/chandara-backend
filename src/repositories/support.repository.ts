import { getFirestore } from '../services/firebase';
import { SupportTicketSummary } from '../types';
import logger from '../utils/logger';
import admin from 'firebase-admin';

/**
 * Support Ticket Repository
 * Manages support tickets and customer service requests
 */
export class SupportRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'support_tickets';

  /**
   * Create a support ticket
   */
  async create(ticket: Omit<SupportTicketSummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const supportTicket: SupportTicketSummary = {
      id,
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.collection(this.collection).doc(id).set(supportTicket);
    logger.debug(`Support ticket created: ${id}`);
    return id;
  }

  /**
   * Find ticket by ID
   */
  async findById(id: string): Promise<SupportTicketSummary | null> {
    const doc = await this.db.collection(this.collection).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as SupportTicketSummary;
  }

  /**
   * Find tickets by user ID
   */
  async findByUserId(userId: string, limit: number = 50): Promise<SupportTicketSummary[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as SupportTicketSummary);
  }

  /**
   * Find tickets by status
   */
  async findByStatus(status: SupportTicketSummary['status'], limit: number = 100): Promise<SupportTicketSummary[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as SupportTicketSummary);
  }

  /**
   * Find tickets by priority
   */
  async findByPriority(priority: SupportTicketSummary['priority'], limit: number = 100): Promise<SupportTicketSummary[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('priority', '==', priority)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as SupportTicketSummary);
  }

  /**
   * Find tickets by assigned admin
   */
  async findByAssignedTo(assignedTo: string, limit: number = 100): Promise<SupportTicketSummary[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('assignedTo', '==', assignedTo)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as SupportTicketSummary);
  }

  /**
   * Get all tickets with pagination
   */
  async getPaginated(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      userId?: string;
      status?: SupportTicketSummary['status'];
      priority?: SupportTicketSummary['priority'];
      category?: string;
      assignedTo?: string;
    }
  ): Promise<{ tickets: SupportTicketSummary[]; total: number; page: number; pageSize: number }> {
    let query = this.db.collection(this.collection) as any;

    if (filters?.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.priority) {
      query = query.where('priority', '==', filters.priority);
    }
    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters?.assignedTo) {
      query = query.where('assignedTo', '==', filters.assignedTo);
    }

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const tickets = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data() as SupportTicketSummary);

    return { tickets, total, page, pageSize };
  }

  /**
   * Update ticket
   */
  async update(id: string, updates: Partial<Omit<SupportTicketSummary, 'id' | 'createdAt'>>): Promise<void> {
    const ref = this.db.collection(this.collection).doc(id);
    await ref.update({
      ...updates,
      updatedAt: new Date(),
    });
    logger.debug(`Support ticket updated: ${id}`);
  }

  /**
   * Update ticket status
   */
  async updateStatus(id: string, status: SupportTicketSummary['status']): Promise<void> {
    await this.update(id, { status });
  }

  /**
   * Update ticket priority
   */
  async updatePriority(id: string, priority: SupportTicketSummary['priority']): Promise<void> {
    await this.update(id, { priority });
  }

  /**
   * Assign ticket to admin
   */
  async assignTo(id: string, assignedTo: string): Promise<void> {
    await this.update(id, { assignedTo, status: 'in_progress' });
  }

  /**
   * Unassign ticket
   */
  async unassign(id: string): Promise<void> {
    await this.update(id, { assignedTo: undefined });
  }

  /**
   * Delete ticket
   */
  async delete(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
    logger.debug(`Support ticket deleted: ${id}`);
  }

  /**
   * Search tickets
   */
  async search(query: string, limit: number = 50): Promise<SupportTicketSummary[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const tickets = snapshot.docs.map(doc => doc.data() as SupportTicketSummary);
    
    const lowerQuery = query.toLowerCase();
    return tickets.filter(
      ticket =>
        ticket.subject.toLowerCase().includes(lowerQuery) ||
        ticket.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get support statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    unassigned: number;
    overdue: number;
  }> {
    const tickets = await this.db.collection(this.collection).get();
    const allTickets = tickets.docs.map((doc: any) => doc.data() as SupportTicketSummary);

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let unassigned = 0;
    const now = new Date();

    for (const ticket of allTickets) {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
      byPriority[ticket.priority] = (byPriority[ticket.priority] || 0) + 1;
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;
      
      if (!ticket.assignedTo) unassigned++;
    }

    // Calculate overdue (open tickets older than 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const overdue = allTickets.filter(
      t => t.status === 'open' && t.createdAt < weekAgo
    ).length;

    return {
      total: allTickets.length,
      byStatus,
      byPriority,
      byCategory,
      unassigned,
      overdue,
    };
  }
}

export const supportRepository = new SupportRepository();
