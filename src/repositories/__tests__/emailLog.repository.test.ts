import { EmailLogRepository } from '../emailLog.repository';
import { EmailStatus } from '../../types';
import { getFirestore } from '../../services/firebase';

// Mock Firebase Firestore
jest.mock('../../services/firebase');

describe('EmailLogRepository', () => {
  let repository: EmailLogRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = {
      id: 'test-email-id',
      data: jest.fn(),
      exists: true,
      get: jest.fn(() => Promise.resolve(mockDoc)),
      ref: {
        delete: jest.fn(),
        update: jest.fn(),
      },
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn(),
      })),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new EmailLogRepository();
  });

  describe('create', () => {
    it('should create email log entry', async () => {
      const emailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'queued' as EmailStatus,
        retryCount: 0,
        variables: { userName: 'John' },
      };

      mockDoc.set = jest.fn().mockResolvedValue(undefined);

      const result = await repository.create(emailData);

      expect(result).toHaveProperty('emailId');
      expect(result.recipient).toBe('test@example.com');
      expect(result.status).toBe('queued');
      expect(mockCollection.doc).toHaveBeenCalled();
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find email log by ID', async () => {
      const mockEmailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'sent' as EmailStatus,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.data.mockReturnValue(mockEmailData);
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);

      const result = await repository.findById('test-id');

      expect(result).not.toBeNull();
      expect(result?.recipient).toBe('test@example.com');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
    });

    it('should return null if not found', async () => {
      mockDoc.exists = false;
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find email logs by user ID', async () => {
      const mockEmailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'sent' as EmailStatus,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSnapshot = {
        docs: [
          { id: 'email1', data: () => mockEmailData },
          { id: 'email2', data: () => mockEmailData },
        ],
      };

      mockCollection.get = jest.fn().mockResolvedValue(mockSnapshot);

      const results = await repository.findByUserId('user123', 10, 0);

      expect(results).toHaveLength(2);
      expect(mockCollection.where).toHaveBeenCalledWith('userId', '==', 'user123');
    });
  });

  describe('update', () => {
    it('should update email log', async () => {
      const mockEmailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'queued' as EmailStatus,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.data.mockReturnValue(mockEmailData);
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);
      mockDoc.update = jest.fn().mockResolvedValue(undefined);

      const result = await repository.update('test-id', { status: 'sent' as EmailStatus });

      expect(result).not.toBeNull();
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'sent' })
      );
    });

    it('should return null if email not found', async () => {
      mockDoc.exists = false;
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);

      const result = await repository.update('nonexistent-id', { status: 'sent' as EmailStatus });

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update email status', async () => {
      const mockEmailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'queued' as EmailStatus,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.data.mockReturnValue(mockEmailData);
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);
      mockDoc.update = jest.fn().mockResolvedValue(undefined);

      const result = await repository.updateStatus('test-id', 'sent');

      expect(result).not.toBeNull();
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'sent', sentAt: expect.any(Date) })
      );
    });

    it('should set openedAt when status is opened', async () => {
      const mockEmailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'sent' as EmailStatus,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.data.mockReturnValue(mockEmailData);
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);
      mockDoc.update = jest.fn().mockResolvedValue(undefined);

      await repository.updateStatus('test-id', 'opened');

      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'opened', openedAt: expect.any(Date) })
      );
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const mockEmailData = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Welcome',
        provider: 'Mock',
        status: 'failed' as EmailStatus,
        retryCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.data.mockReturnValue(mockEmailData);
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);
      mockDoc.update = jest.fn().mockResolvedValue(undefined);

      const result = await repository.incrementRetryCount('test-id');

      expect(result).not.toBeNull();
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ retryCount: 2 })
      );
    });

    it('should return null if email not found', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue(null);
      mockDoc.get.mockResolvedValue(mockDoc);

      const result = await repository.incrementRetryCount('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return email statistics', async () => {
      const mockEmailData = [
        { recipient: 'test@example.com', template: 'welcome', subject: 'Welcome', provider: 'Mock', status: 'sent' as EmailStatus, retryCount: 0, createdAt: new Date(), updatedAt: new Date() },
        { recipient: 'test2@example.com', template: 'welcome', subject: 'Welcome', provider: 'Mock', status: 'failed' as EmailStatus, retryCount: 1, createdAt: new Date(), updatedAt: new Date() },
        { recipient: 'test3@example.com', template: 'welcome', subject: 'Welcome', provider: 'Mock', status: 'sent' as EmailStatus, retryCount: 0, createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockSnapshot = {
        docs: mockEmailData.map((data, i) => ({
          id: `email${i}`,
          data: () => data,
        })),
      };

      mockCollection.get = jest.fn().mockResolvedValue(mockSnapshot);

      const stats = await repository.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(2);
      expect(stats.failed).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete email log', async () => {
      mockDoc.exists = true;
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);
      mockDoc.ref.delete = jest.fn().mockResolvedValue(undefined);

      const result = await repository.delete('test-id');

      expect(result).toBe(true);
      expect(mockDoc.ref.delete).toHaveBeenCalled();
    });

    it('should return false if not found', async () => {
      mockDoc.exists = false;
      mockCollection.get = jest.fn().mockResolvedValue(mockDoc);

      const result = await repository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });
});
