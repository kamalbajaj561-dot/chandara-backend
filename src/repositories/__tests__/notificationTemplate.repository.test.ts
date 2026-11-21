import { NotificationTemplateRepository } from '../notificationTemplate.repository';
import { NotificationTemplate, NotificationType } from '../../types';

jest.mock('../../services/firebase');

describe('NotificationTemplateRepository', () => {
  let repository: NotificationTemplateRepository;
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    repository = new NotificationTemplateRepository();
    mockCollection = {
      doc: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
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
      Timestamp: {
        fromDate: jest.fn((_date) => mockTimestamp),
        now: jest.fn(() => mockTimestamp),
        fromMillis: jest.fn((_ms) => mockTimestamp),
      },
    };
    (repository as any).db = mockDb;
  });

  describe('create', () => {
    it('should create a notification template successfully', async () => {
      const templateData: Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'> = {
        type: 'EVENT' as NotificationType,
        title: 'Event Reminder',
        message: 'Your event is starting soon',
        language: 'en',
        variables: ['eventName', 'eventTime'],
        isActive: true,
      };

      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDoc = {
        id: 'template123',
        exists: true,
        data: () => ({
          ...templateData,
          templateId: 'template123',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      mockCollection.doc.mockReturnValue({
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await repository.create(templateData);

      expect(result).toBeDefined();
      expect(result.templateId).toBe('template123');
      expect(result.type).toBe('EVENT');
    });
  });

  describe('findById', () => {
    it('should find template by ID', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDoc = {
        id: 'template123',
        exists: true,
        data: () => ({
          type: 'EVENT',
          title: 'Event Reminder',
          message: 'Your event is starting soon',
          language: 'en',
          variables: ['eventName'],
          isActive: true,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
      });

      const result = await repository.findById('template123');

      expect(result).not.toBeNull();
      expect(result?.templateId).toBe('template123');
    });

    it('should return null if template not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should find templates by type', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDocs = [
        {
          id: 'template1',
          data: () => ({
            type: 'EVENT',
            title: 'Event Reminder',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      mockCollection.where.mockReturnValue(mockCollection);
      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const result = await repository.findByType('EVENT' as NotificationType);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('EVENT');
    });

    it('should find templates by type and language', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDocs = [
        {
          id: 'template1',
          data: () => ({
            type: 'EVENT',
            title: 'Event Reminder',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      mockCollection.where.mockReturnValue(mockCollection);
      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const result = await repository.findByType('EVENT' as NotificationType, 'en');

      expect(result).toHaveLength(1);
    });
  });

  describe('findByLanguage', () => {
    it('should find templates by language', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDocs = [
        {
          id: 'template1',
          data: () => ({
            type: 'EVENT',
            title: 'Event Reminder',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      mockCollection.where.mockReturnValue(mockCollection);
      mockCollection.get.mockResolvedValue({ docs: mockDocs });

      const result = await repository.findByLanguage('en');

      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('en');
    });
  });

  describe('findAll', () => {
    it('should find all templates', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDocs = [
        {
          id: 'template1',
          data: () => ({
            type: 'EVENT',
            title: 'Event Reminder',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      mockCollection.orderBy.mockReturnValue(mockCollection);
      mockCollection.limit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: mockDocs }),
      });

      const result = await repository.findAll(100);

      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDoc = {
        id: 'template123',
        exists: true,
        data: jest.fn(() => ({
          type: 'EVENT',
          title: 'Event Reminder',
          message: 'Your event is starting soon',
          language: 'en',
          variables: ['eventName'],
          isActive: true,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockImplementation(() => {
          mockDoc.data.mockReturnValue({
            type: 'EVENT',
            title: 'Updated Title',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          });
        }),
      });

      const result = await repository.update('template123', { title: 'Updated Title' });

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Title');
    });

    it('should return null if template not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.update('nonexistent', { title: 'Updated Title' });

      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('should deactivate template', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDoc = {
        id: 'template123',
        exists: true,
        data: jest.fn(() => ({
          type: 'EVENT',
          title: 'Event Reminder',
          message: 'Your event is starting soon',
          language: 'en',
          variables: ['eventName'],
          isActive: true,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockImplementation(() => {
          mockDoc.data.mockReturnValue({
            type: 'EVENT',
            title: 'Event Reminder',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          });
        }),
      });

      const result = await repository.deactivate('template123');

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(false);
    });
  });

  describe('activate', () => {
    it('should activate template', async () => {
      const mockTimestamp = {
        toDate: jest.fn(() => new Date()),
        toMillis: jest.fn(() => Date.now()),
        seconds: 0,
        nanoseconds: 0,
      };

      const mockDoc = {
        id: 'template123',
        exists: true,
        data: jest.fn(() => ({
          type: 'EVENT',
          title: 'Event Reminder',
          message: 'Your event is starting soon',
          language: 'en',
          variables: ['eventName'],
          isActive: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        })),
      };

      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue(mockDoc),
        update: jest.fn().mockImplementation(() => {
          mockDoc.data.mockReturnValue({
            type: 'EVENT',
            title: 'Event Reminder',
            message: 'Your event is starting soon',
            language: 'en',
            variables: ['eventName'],
            isActive: true,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          });
        }),
      });

      const result = await repository.activate('template123');

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: true }),
        delete: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.delete('template123');

      expect(result).toBe(true);
    });

    it('should return false if template not found', async () => {
      mockCollection.doc.mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
