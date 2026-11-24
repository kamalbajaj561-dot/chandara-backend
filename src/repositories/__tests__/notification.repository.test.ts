import { NotificationRepository } from '../notification.repository';
import { Notification, NotificationType, NotificationPriority } from '../../types';

jest.mock('../../services/firebase');

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockTimestamp: any;

  beforeEach(() => {
    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    repository = new NotificationRepository();
    mockCollection = {
      doc: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      offset: jest.fn(),
      count: jest.fn(),
      get: jest.fn(),
    };
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(),
      }),
    };
    Object.defineProperty(repository, 'db', { get: () => mockDb, configurable: true });
  });

  describe('create', () => {
    it('should create a notification successfully', async () => {
      const notificationData: Omit<Notification, 'notificationId' | 'createdAt' | 'updatedAt'> = {
        userId: 'user123',
        type: 'EVENT' as NotificationType,
        title: 'Test Notification',
        message: 'Test message',
        data: { key: 'value' },
        priority: 'normal' as NotificationPriority,
        status: 'sent',
        read: false,
      };

      const mockDoc = {
        id: 'notification123',
        exists: true,
        data: () => ({
          ...notificationData,
          notificationId: 'notification123',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      mockCollection.doc.mockReturnValue({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await repository.create(notificationData);

      expect(result).toBeDefined();
      expect(result.notificationId).toBe('notification123');
      expect(result.userId).toBe('user123');
    });
  });

  describe('findById', () => {
    it('should find notification by ID', async () => {
      const mockDoc = {
        id: 'notification123',
        exists: true,
        data: () => ({
          userId: 'user123',
          type: 'EVENT',
          title: 'Test',
          message: 'Test message',
          priority: 'normal',
          status: 'sent',
          read: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await repository.findById('notification123');

      expect(result).not.toBeNull();
      expect(result?.notificationId).toBe('notification123');
    });

    it('should return null if notification not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find notifications by user ID', async () => {
      const mockDocs = [
        {
          id: 'notification1',
          data: () => ({
            userId: 'user123',
            type: 'EVENT',
            title: 'Test 1',
            message: 'Message 1',
            priority: 'normal',
            status: 'sent',
            read: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      mockCollection.where.mockReturnValue(mockCollection);
      mockCollection.orderBy.mockReturnValue(mockCollection);
      mockCollection.limit.mockReturnValue(mockCollection);
      mockCollection.offset.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: mockDocs }),
      });

      const result = await repository.findByUserId('user123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user123');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockCollection.where.mockReturnValue(mockCollection);
      mockCollection.count.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: () => ({ count: 5 }) }),
      });

      const result = await repository.getUnreadCount('user123');

      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockDoc = {
        id: 'notification123',
        exists: true,
        data: jest.fn(() => ({
          userId: 'user123',
          type: 'EVENT',
          title: 'Test',
          message: 'Test message',
          priority: 'normal',
          status: 'sent',
          read: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockImplementation(() => {
          mockDoc.data.mockReturnValue({
            userId: 'user123',
            type: 'EVENT',
            title: 'Test',
            message: 'Test message',
            priority: 'normal',
            status: 'sent',
            read: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          });
        }),
      });

      const result = await repository.markAsRead('notification123');

      expect(result).toBeDefined();
      expect(result?.read).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      const mockDocs = [
        {
          id: 'notification1',
          ref: { update: jest.fn() },
        },
      ];

      const mockQuery = {
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ docs: mockDocs }),
        }),
      };

      mockCollection.where.mockReturnValue(mockQuery);

      const mockBatch = {
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue({}),
      };
      mockDb.batch.mockReturnValue(mockBatch);

      await repository.markAllAsRead('user123');

      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should soft delete notification', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true }),
        update: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.softDelete('notification123');

      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.softDelete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('bulkInsert', () => {
    it('should bulk insert notifications', async () => {
      const notifications: Omit<Notification, 'notificationId' | 'createdAt' | 'updatedAt'>[] = [
        {
          userId: 'user123',
          type: 'EVENT',
          title: 'Test 1',
          message: 'Message 1',
          priority: 'normal',
          status: 'sent',
          read: false,
        },
      ];

      const mockBatch = {
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue({}),
      };
      mockDb.batch.mockReturnValue(mockBatch);

      const result = await repository.bulkInsert(notifications);

      expect(result).toHaveLength(1);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
