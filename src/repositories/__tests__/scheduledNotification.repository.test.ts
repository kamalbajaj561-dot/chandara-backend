import { ScheduledNotificationRepository } from '../scheduledNotification.repository';
import { getFirestore } from '../../services/firebase';
import { ScheduledNotification } from '../../types';

jest.mock('../../services/firebase');

describe('ScheduledNotificationRepository', () => {
  let repository: ScheduledNotificationRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockGet: any;
  let mockSet: any;
  let mockUpdate: any;
  let mockDelete: any;

  beforeEach(() => {
    mockGet = jest.fn();
    mockSet = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    mockDoc = jest.fn(() => ({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      delete: mockDelete,
    }));

    mockCollection = jest.fn(() => ({
      doc: mockDoc,
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
        get: mockGet,
      })),
      get: mockGet,
    }));

    mockDb = {
      collection: mockCollection,
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new ScheduledNotificationRepository();
  });

  describe('create', () => {
    it('should create a scheduled notification', async () => {
      const notification: ScheduledNotification = {
        id: 'notif-123',
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSet.mockResolvedValue(undefined);
      mockDoc.mockReturnValue({
        get: mockGet,
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
      });

      await repository.create(notification);

      expect(mockCollection).toHaveBeenCalledWith('scheduled_notifications');
      expect(mockDoc).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        id: 'notif-123',
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        recurring: false,
      }));
    });
  });

  describe('findById', () => {
    it('should find notification by id', async () => {
      const notification: ScheduledNotification = {
        id: 'notif-123',
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGet.mockResolvedValue({ 
        id: 'notif-123',
        exists: true, 
        data: () => ({ ...notification, scheduledFor: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) 
      });

      const result = await repository.findById('notif-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('notif-123');
    });

    it('should return null if not found', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await repository.findById('notif-123');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find notifications by user id', async () => {
      const notifications: ScheduledNotification[] = [
        {
          id: 'notif-1',
          userId: 'user-123',
          title: 'Test',
          body: 'Test body',
          scheduledFor: new Date(),
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          recurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGet.mockResolvedValue({
        docs: notifications.map(n => ({ 
          id: n.id,
          data: () => ({ ...n, scheduledFor: { toDate: () => n.scheduledFor }, createdAt: { toDate: () => n.createdAt }, updatedAt: { toDate: () => n.updatedAt } }) 
        })),
      });

      const result = await repository.findByUserId('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
    });
  });

  describe('update', () => {
    it('should update notification', async () => {
      const notification: ScheduledNotification = {
        id: 'notif-123',
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        recurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGet.mockResolvedValue({ 
        id: 'notif-123',
        exists: true,
        data: () => ({ ...notification, scheduledFor: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) 
      });
      mockUpdate.mockResolvedValue(undefined);

      await repository.update('notif-123', { title: 'Updated' });

      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated', updatedAt: expect.any(Date) });
    });
  });

  describe('cancel', () => {
    it('should cancel notification', async () => {
      mockUpdate.mockResolvedValue(undefined);

      await repository.cancel('notif-123');

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled', updatedAt: expect.any(Date) });
    });
  });

  describe('delete', () => {
    it('should delete notification', async () => {
      mockDelete.mockResolvedValue(undefined);

      await repository.delete('notif-123');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      mockGet.mockResolvedValue({
        docs: [
          { data: () => ({ status: 'pending', scheduledFor: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
          { data: () => ({ status: 'sent', scheduledFor: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
          { data: () => ({ status: 'failed', scheduledFor: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
        ],
      });

      const stats = await repository.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.sent).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });
});
