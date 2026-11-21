import { NotificationPreferenceRepository } from '../notificationPreference.repository';
import { NotificationPreference } from '../../types';

jest.mock('../../services/firebase');

describe('NotificationPreferenceRepository', () => {
  let repository: NotificationPreferenceRepository;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    repository = new NotificationPreferenceRepository();
    mockCollection = {
      doc: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    (repository as any).db = mockDb;
  });

  describe('create', () => {
    it('should create notification preferences successfully', async () => {
      const preferenceData: Omit<NotificationPreference, 'createdAt' | 'updatedAt'> = {
        userId: 'user123',
        inAppEnabled: true,
        eventNotifications: true,
        streamNotifications: true,
        chatNotifications: true,
        ticketNotifications: true,
        paymentNotifications: true,
        creatorNotifications: true,
        adminNotifications: true,
        language: 'en',
        timezone: 'UTC',
      };

      const mockDoc = {
        id: 'user123',
        exists: true,
        data: () => ({
          ...preferenceData,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      mockCollection.doc.mockReturnValue({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await repository.create(preferenceData);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.inAppEnabled).toBe(true);
    });
  });

  describe('findByUserId', () => {
    it('should find preferences by user ID', async () => {
      const mockDoc = {
        id: 'user123',
        exists: true,
        data: () => ({
          inAppEnabled: true,
          eventNotifications: true,
          streamNotifications: true,
          chatNotifications: true,
          ticketNotifications: true,
          paymentNotifications: true,
          creatorNotifications: true,
          adminNotifications: true,
          language: 'en',
          timezone: 'UTC',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await repository.findByUserId('user123');

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user123');
    });

    it('should return null if preferences not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.findByUserId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update preferences successfully', async () => {
      const mockDoc = {
        id: 'user123',
        exists: true,
        data: () => ({
          inAppEnabled: false,
          eventNotifications: true,
          streamNotifications: true,
          chatNotifications: true,
          ticketNotifications: true,
          paymentNotifications: true,
          creatorNotifications: true,
          adminNotifications: true,
          language: 'en',
          timezone: 'UTC',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.update('user123', { inAppEnabled: false });

      expect(result).toBeDefined();
      expect(result?.inAppEnabled).toBe(false);
    });

    it('should return null if preferences not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.update('nonexistent', { inAppEnabled: false });

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should update existing preferences', async () => {
      const mockDoc = {
        id: 'user123',
        exists: true,
        data: () => ({
          inAppEnabled: true,
          eventNotifications: true,
          streamNotifications: true,
          chatNotifications: true,
          ticketNotifications: true,
          paymentNotifications: true,
          creatorNotifications: true,
          adminNotifications: true,
          language: 'en',
          timezone: 'UTC',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.upsert({
        userId: 'user123',
        inAppEnabled: false,
        eventNotifications: true,
        streamNotifications: true,
        chatNotifications: true,
        ticketNotifications: true,
        paymentNotifications: true,
        creatorNotifications: true,
        adminNotifications: true,
        language: 'en',
        timezone: 'UTC',
      });

      expect(result).toBeDefined();
    });

    it('should create new preferences if not exist', async () => {
      const preferenceData: Omit<NotificationPreference, 'createdAt' | 'updatedAt'> = {
        userId: 'user123',
        inAppEnabled: true,
        eventNotifications: true,
        streamNotifications: true,
        chatNotifications: true,
        ticketNotifications: true,
        paymentNotifications: true,
        creatorNotifications: true,
        adminNotifications: true,
        language: 'en',
        timezone: 'UTC',
      };

      const mockDoc = {
        id: 'user123',
        exists: true,
        data: () => ({
          ...preferenceData,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      });
      
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.upsert(preferenceData);

      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete preferences successfully', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true }),
        delete: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.delete('user123');

      expect(result).toBe(true);
    });

    it('should return false if preferences not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
