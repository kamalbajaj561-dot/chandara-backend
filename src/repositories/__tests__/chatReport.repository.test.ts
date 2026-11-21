import { ChatReportRepository } from '../chatReport.repository';
import { getFirestore } from '../../services/firebase';
import { ChatReport } from '../../types';

jest.mock('../../services/firebase');

describe('ChatReportRepository', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockTimestamp: any;

  beforeEach(() => {
    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      data: jest.fn(),
    };
    mockCollection = {
      doc: jest.fn(() => mockDoc),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockDb = {
      collection: jest.fn(() => mockCollection),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new chat report', async () => {
      const mockReport: Omit<ChatReport, 'id' | 'createdAt' | 'updatedAt'> = {
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
      };

      const createdDoc = {
        id: 'report123',
        exists: true,
        data: () => ({ ...mockReport, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
      };

      mockCollection.add.mockResolvedValue({ id: 'report123' });
      mockCollection.doc.mockReturnValue(mockDoc);
      mockDoc.get.mockResolvedValue(createdDoc);

      const repository = new ChatReportRepository();
      const result = await repository.create(mockReport);

      expect(result).toBeDefined();
      expect(result.reportId).toBe('report123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_reports');
    });
  });

  describe('findById', () => {
    it('should return report if found', async () => {
      const mockReport: ChatReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'report123',
        data: () => ({ ...mockReport, createdAt: mockTimestamp, updatedAt: mockTimestamp }),
      });

      const repository = new ChatReportRepository();
      const result = await repository.findById('report123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('report123');
      expect(result?.reportId).toBe('report123');
      expect(mockDb.collection).toHaveBeenCalledWith('chat_reports');
    });

    it('should return null if report not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new ChatReportRepository();
      const result = await repository.findById('report123');

      expect(result).toBeNull();
    });
  });

  describe('findByReportId', () => {
    it('should return report by report ID', async () => {
      const mockReport: ChatReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'report123', data: () => ({ ...mockReport, createdAt: mockTimestamp, updatedAt: mockTimestamp }) }],
      });

      const repository = new ChatReportRepository();
      const result = await repository.findByReportId('report123');

      expect(result).not.toBeNull();
      expect(result?.reportId).toBe('report123');
      expect(mockCollection.where).toHaveBeenCalledWith('reportId', '==', 'report123');
    });

    it('should return null if report not found', async () => {
      mockQuery.get.mockResolvedValue({ empty: true, docs: [] });

      const repository = new ChatReportRepository();
      const result = await repository.findByReportId('report123');

      expect(result).toBeNull();
    });
  });

  describe('findByEventId', () => {
    it('should return reports by event ID', async () => {
      const mockReports: ChatReport[] = [
        {
          id: 'report1',
          reportId: 'report1',
          messageId: 'msg1',
          eventId: 'event123',
          reporterId: 'user123',
          reporterName: 'Test User',
          reportedUserId: 'user456',
          reportedUserName: 'Reported User',
          reason: 'Inappropriate content',
          description: 'Message contains offensive language',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockReports.map(report => ({
          data: () => ({ ...report, createdAt: { toDate: () => report.createdAt }, updatedAt: { toDate: () => report.updatedAt } }),
        })),
      });

      const repository = new ChatReportRepository();
      const result = await repository.findByEventId('event123');

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe('event123');
    });
  });

  describe('findByStatus', () => {
    it('should return reports by status', async () => {
      const mockReports: ChatReport[] = [
        {
          id: 'report1',
          reportId: 'report1',
          messageId: 'msg1',
          eventId: 'event123',
          reporterId: 'user123',
          reporterName: 'Test User',
          reportedUserId: 'user456',
          reportedUserName: 'Reported User',
          reason: 'Inappropriate content',
          description: 'Message contains offensive language',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockQuery.get.mockResolvedValue({
        empty: false,
        docs: mockReports.map(report => ({
          data: () => ({ ...report, createdAt: { toDate: () => report.createdAt }, updatedAt: { toDate: () => report.updatedAt } }),
        })),
      });

      const repository = new ChatReportRepository();
      const result = await repository.findByStatus('pending');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('resolve', () => {
    it('should resolve a report', async () => {
      const mockReport: ChatReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockReport, createdAt: { toDate: () => mockReport.createdAt }, updatedAt: { toDate: () => mockReport.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockReport, status: 'resolved', resolution: 'Action taken', createdAt: { toDate: () => mockReport.createdAt }, updatedAt: { toDate: () => mockReport.updatedAt } }),
      });

      const repository = new ChatReportRepository();
      const result = await repository.resolve('report123', 'Action taken');

      expect(result).toBeDefined();
      if (result) {
        expect(result.status).toBe('resolved');
        expect(result.resolution).toBe('Action taken');
      }
    });
  });

  describe('reject', () => {
    it('should reject a report', async () => {
      const mockReport: ChatReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockReport, createdAt: { toDate: () => mockReport.createdAt }, updatedAt: { toDate: () => mockReport.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockReport, status: 'rejected', resolution: 'No action needed', createdAt: { toDate: () => mockReport.createdAt }, updatedAt: { toDate: () => mockReport.updatedAt } }),
      });

      const repository = new ChatReportRepository();
      const result = await repository.reject('report123', 'No action needed');

      expect(result).toBeDefined();
      if (result) {
        expect(result.status).toBe('rejected');
        expect(result.resolution).toBe('No action needed');
      }
    });
  });

  describe('assignTo', () => {
    it('should assign a report to a moderator', async () => {
      const mockReport: ChatReport = {
        id: 'report123',
        reportId: 'report123',
        messageId: 'msg123',
        eventId: 'event123',
        reporterId: 'user123',
        reporterName: 'Test User',
        reportedUserId: 'user456',
        reportedUserName: 'Reported User',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockReport, createdAt: { toDate: () => mockReport.createdAt }, updatedAt: { toDate: () => mockReport.updatedAt } }),
      });
      mockDoc.update.mockResolvedValue(undefined);
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockReport, assignedTo: 'mod123', createdAt: { toDate: () => mockReport.createdAt }, updatedAt: { toDate: () => mockReport.updatedAt } }),
      });

      const repository = new ChatReportRepository();
      const result = await repository.assignTo('report123', 'mod123');

      expect(result).toBeDefined();
      if (result) {
        expect(result.assignedTo).toBe('mod123');
      }
    });
  });
});
