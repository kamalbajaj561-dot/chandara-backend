import { getFirestore } from '../services/firebase';
import { NotificationTemplate, NotificationType } from '../types';
import admin from 'firebase-admin';

export class NotificationTemplateRepository {
  private get db() {
    const firestore = getFirestore();
    if (!firestore) {
      throw new Error('Firestore not initialized. Please ensure Firebase is initialized before using repositories.');
    }
    return firestore;
  }
  private collection = 'notification_templates';

  async create(templateData: Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const now = new Date();
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const docRef = this.db.collection(this.collection).doc(templateId);
    await docRef.set({
      ...templateData,
      templateId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await docRef.get();
    if (!doc.exists) throw new Error('Failed to create notification template');
    return this.mapDocToTemplate(doc);
  }

  async findById(templateId: string): Promise<NotificationTemplate | null> {
    const doc = await this.db.collection(this.collection).doc(templateId).get();
    if (!doc.exists) return null;
    return this.mapDocToTemplate(doc);
  }

  async findByType(type: NotificationType, language?: string): Promise<NotificationTemplate[]> {
    let query = this.db.collection(this.collection).where('type', '==', type).where('isActive', '==', true);
    
    if (language) {
      query = query.where('language', '==', language);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.mapDocToTemplate(doc));
  }

  async findByLanguage(language: string): Promise<NotificationTemplate[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .where('language', '==', language)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToTemplate(doc));
  }

  async findAll(limit = 100): Promise<NotificationTemplate[]> {
    const snapshot = await this.db
      .collection(this.collection)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapDocToTemplate(doc));
  }

  async update(templateId: string, updateData: Partial<Omit<NotificationTemplate, 'templateId' | 'createdAt'>>): Promise<NotificationTemplate | null> {
    const docRef = this.db.collection(this.collection).doc(templateId);
    const doc = await docRef.get();

    if (!doc.exists) return null;

    await docRef.update({
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedDoc = await docRef.get();
    return this.mapDocToTemplate(updatedDoc);
  }

  async deactivate(templateId: string): Promise<NotificationTemplate | null> {
    return this.update(templateId, { isActive: false });
  }

  async activate(templateId: string): Promise<NotificationTemplate | null> {
    return this.update(templateId, { isActive: true });
  }

  async delete(templateId: string): Promise<boolean> {
    const docRef = this.db.collection(this.collection).doc(templateId);
    const doc = await docRef.get();

    if (!doc.exists) return false;

    await docRef.delete();
    return true;
  }

  private mapDocToTemplate(doc: admin.firestore.DocumentSnapshot): NotificationTemplate {
    const data = doc.data();
    if (!data) throw new Error('Document data is undefined');
    return {
      templateId: doc.id,
      type: data.type,
      title: data.title,
      message: data.message,
      language: data.language,
      variables: data.variables,
      isActive: data.isActive,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }
}

export const notificationTemplateRepository = new NotificationTemplateRepository();
