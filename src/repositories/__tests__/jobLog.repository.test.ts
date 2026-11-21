import { JobLogRepository } from '../jobLog.repository';
import { getFirestore } from '../../services/firebase';
import { JobLog } from '../../types';

jest.mock('../../services/firebase');

describe('JobLogRepository', () => {
  let repository: JobLogRepository;
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
        limit: jest.fn(() => ({
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
    repository = new JobLogRepository();
  });

  describe('create', () => {
    it('should create a job log', async () => {
      const jobLog: JobLog = {
        id: 'job-123',
        jobType: 'push_notification',
        jobId: 'job-id-123',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockSet.mockResolvedValue(undefined);

      await repository.create(jobLog);

      expect(mockCollection).toHaveBeenCalledWith('job_logs');
      expect(mockDoc).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        id: 'job-123',
        jobType: 'push_notification',
        jobId: 'job-id-123',
        status: 'completed',
        retryCount: 0,
        maxRetries: 3,
      }));
    });
  });

  describe('findById', () => {
    it('should find job log by id', async () => {
      const jobLog: JobLog = {
        id: 'job-123',
        jobType: 'push_notification',
        jobId: 'job-id-123',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'job-123',
        data: () => ({ ...jobLog, startedAt: { toDate: () => jobLog.startedAt }, completedAt: { toDate: () => jobLog.completedAt }, createdAt: { toDate: () => jobLog.createdAt }, updatedAt: { toDate: () => jobLog.updatedAt } }),
      });

      const result = await repository.findById('job-123');

      expect(result).toHaveProperty('id', 'job-123');
      expect(result?.jobId).toBe('job-id-123');
    });

    it('should return null if not found', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await repository.findById('job-123');

      expect(result).toBeNull();
    });
  });

  describe('findByJobId', () => {
    it('should find job logs by job id', async () => {
      const jobLogs: JobLog[] = [
        {
          id: 'job-1',
          jobType: 'push_notification',
          jobId: 'job-id-123',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockGet.mockResolvedValue({
        docs: jobLogs.map(jl => ({ 
          id: jl.id,
          data: () => ({ ...jl, startedAt: { toDate: () => jl.startedAt }, completedAt: { toDate: () => jl.completedAt }, createdAt: { toDate: () => jl.createdAt }, updatedAt: { toDate: () => jl.updatedAt } }) 
        })),
      });

      const result = await repository.findByJobId('job-id-123');

      expect(result).toHaveProperty('id', 'job-1');
      expect(result?.jobId).toBe('job-id-123');
    });
  });

  describe('update', () => {
    it('should update job log', async () => {
      const jobLog: JobLog = {
        id: 'job-123',
        jobType: 'push_notification',
        jobId: 'job-id-123',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };
      
      mockGet.mockResolvedValue({ 
        exists: true,
        id: 'job-123',
        data: () => ({ ...jobLog, startedAt: { toDate: () => jobLog.startedAt }, completedAt: { toDate: () => jobLog.completedAt }, createdAt: { toDate: () => jobLog.createdAt }, updatedAt: { toDate: () => jobLog.updatedAt } }),
      });
      mockUpdate.mockResolvedValue(undefined);

      await repository.update('job-123', { status: 'failed' });

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'failed', updatedAt: expect.any(Date) });
    });
  });

  describe('delete', () => {
    it('should delete job log', async () => {
      mockDelete.mockResolvedValue(undefined);

      await repository.delete('job-123');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      mockGet.mockResolvedValue({
        docs: [
          { data: () => ({ status: 'completed', executionTime: 100, startedAt: { toDate: () => new Date() }, completedAt: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
          { data: () => ({ status: 'failed', executionTime: 50, startedAt: { toDate: () => new Date() }, completedAt: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
          { data: () => ({ status: 'completed', executionTime: 150, startedAt: { toDate: () => new Date() }, completedAt: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
        ],
      });

      const stats = await repository.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
    });
  });
});
