import { SchedulerProvider, Job, ScheduleOptions, CronScheduleOptions } from './schedulerProvider.interface';
import { getRedisClient } from '../services/redis';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Redis Scheduler Provider
 * Implements job scheduling using Redis sorted sets for delayed jobs and lists for queues
 */
export class RedisSchedulerProvider implements SchedulerProvider {
  private get client() {
    return getRedisClient();
  }
  private workerRunning = false;
  private workerInterval?: NodeJS.Timeout;
  private jobHandlers: Map<string, (job: Job) => Promise<any>> = new Map();

  private readonly QUEUE_PREFIX = 'scheduler:queue';
  private readonly DELAYED_PREFIX = 'scheduler:delayed';
  private readonly PROCESSING_PREFIX = 'scheduler:processing';
  private readonly FAILED_PREFIX = 'scheduler:failed';
  private readonly COMPLETED_PREFIX = 'scheduler:completed';
  private readonly JOB_DATA_PREFIX = 'scheduler:job';

  /**
   * Register a job handler for a specific job type
   */
  registerHandler(jobType: string, handler: (job: Job) => Promise<any>): void {
    this.jobHandlers.set(jobType, handler);
    logger.info(`Registered handler for job type: ${jobType}`);
  }

  async schedule(
    jobType: string,
    payload: Record<string, any>,
    scheduledFor: Date,
    options?: ScheduleOptions
  ): Promise<string> {
    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      type: jobType,
      payload,
      scheduledFor,
      priority: options?.priority || 0,
      maxRetries: options?.maxRetries || 3,
      retryCount: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store job data
    await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

    // Add to delayed queue with score = scheduled timestamp
    const score = Math.floor(scheduledFor.getTime() / 1000);
    await this.client.zAdd(this.DELAYED_PREFIX, { score, value: jobId });

    logger.info(`Scheduled job ${jobId} of type ${jobType} for ${scheduledFor.toISOString()}`);

    return jobId;
  }

  async scheduleCron(
    jobType: string,
    payload: Record<string, any>,
    cronOptions: CronScheduleOptions
  ): Promise<string> {
    // For cron jobs, we'll create a special job that creates new instances
    const jobId = uuidv4();
    const job: Job = {
      id: jobId,
      type: `cron:${jobType}`,
      payload: {
        ...payload,
        cronExpression: cronOptions.cronExpression,
        timezone: cronOptions.timezone || 'UTC',
      },
      scheduledFor: new Date(), // Start immediately
      priority: cronOptions.priority || 0,
      maxRetries: cronOptions.maxRetries || 3,
      retryCount: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));
    await this.client.lPush(this.QUEUE_PREFIX, jobId);

    logger.info(`Scheduled cron job ${jobId} for type ${jobType} with expression ${cronOptions.cronExpression}`);

    return jobId;
  }

  async cancel(jobId: string): Promise<boolean> {
    try {
      // Remove from all queues
      await this.client.zRem(this.DELAYED_PREFIX, jobId);
      await this.client.lRem(this.QUEUE_PREFIX, 0, jobId);
      await this.client.lRem(this.PROCESSING_PREFIX, 0, jobId);
      await this.client.lRem(this.FAILED_PREFIX, 0, jobId);

      // Update job status
      const job = await this.getJob(jobId);
      if (job) {
        job.status = 'cancelled';
        job.updatedAt = new Date();
        await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));
      }

      logger.info(`Cancelled job ${jobId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}: ${error}`);
      return false;
    }
  }

  async pause(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return false;

      // Move to a paused state by removing from queue but keeping data
      await this.client.zRem(this.DELAYED_PREFIX, jobId);
      await this.client.lRem(this.QUEUE_PREFIX, 0, jobId);

      job.status = 'cancelled'; // Use cancelled as paused for simplicity
      job.updatedAt = new Date();
      await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

      logger.info(`Paused job ${jobId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to pause job ${jobId}: ${error}`);
      return false;
    }
  }

  async resume(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return false;

      job.status = 'pending';
      job.updatedAt = new Date();
      await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

      // Add back to queue
      const score = Math.floor(job.scheduledFor.getTime() / 1000);
      await this.client.zAdd(this.DELAYED_PREFIX, { score, value: jobId });

      logger.info(`Resumed job ${jobId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to resume job ${jobId}: ${error}`);
      return false;
    }
  }

  async reschedule(jobId: string, newScheduledFor: Date): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return false;

      // Remove from current position
      await this.client.zRem(this.DELAYED_PREFIX, jobId);
      await this.client.lRem(this.QUEUE_PREFIX, 0, jobId);

      // Update job
      job.scheduledFor = newScheduledFor;
      job.status = 'pending';
      job.updatedAt = new Date();
      await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

      // Add to delayed queue with new time
      const score = Math.floor(newScheduledFor.getTime() / 1000);
      await this.client.zAdd(this.DELAYED_PREFIX, { score, value: jobId });

      logger.info(`Rescheduled job ${jobId} to ${newScheduledFor.toISOString()}`);
      return true;
    } catch (error) {
      logger.error(`Failed to reschedule job ${jobId}: ${error}`);
      return false;
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      const data = await this.client.get(`${this.JOB_DATA_PREFIX}:${jobId}`);
      if (!data) return null;
      return JSON.parse(data) as Job;
    } catch (error) {
      logger.error(`Failed to get job ${jobId}: ${error}`);
      return null;
    }
  }

  async getJobsByType(jobType: string): Promise<Job[]> {
    try {
      const jobs: Job[] = [];
      let cursor = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: `${this.JOB_DATA_PREFIX}:*`,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        for (const key of keys) {
          const data = await this.client.get(key);
          if (data) {
            const job = JSON.parse(data) as Job;
            if (job.type === jobType) {
              jobs.push(job);
            }
          }
        }
      } while (cursor !== 0);

      return jobs;
    } catch (error) {
      logger.error(`Failed to get jobs by type ${jobType}:`, error);
      return [];
    }
  }

  async getPendingJobs(): Promise<Job[]> {
    try {
      const jobIds = await this.client.lRange(this.QUEUE_PREFIX, 0, -1);
      const jobs: Job[] = [];

      for (const jobId of jobIds) {
        const job = await this.getJob(jobId);
        if (job && job.status === 'pending') {
          jobs.push(job);
        }
      }

      return jobs;
    } catch (error) {
      logger.error('Failed to get pending jobs:', error);
      return [];
    }
  }

  async getFailedJobs(): Promise<Job[]> {
    try {
      const jobIds = await this.client.lRange(this.FAILED_PREFIX, 0, -1);
      const jobs: Job[] = [];

      for (const jobId of jobIds) {
        const job = await this.getJob(jobId);
        if (job) {
          jobs.push(job);
        }
      }

      return jobs;
    } catch (error) {
      logger.error('Failed to get failed jobs:', error);
      return [];
    }
  }

  async retry(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return false;

      // Remove from failed queue
      await this.client.lRem(this.FAILED_PREFIX, 0, jobId);

      // Reset job status
      job.status = 'pending';
      job.retryCount = (job.retryCount || 0) + 1;
      job.updatedAt = new Date();
      await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

      // Add back to queue
      await this.client.lPush(this.QUEUE_PREFIX, jobId);

      logger.info(`Retrying job ${jobId} (attempt ${job.retryCount})`);
      return true;
    } catch (error) {
      logger.error(`Failed to retry job ${jobId}: ${error}`);
      return false;
    }
  }

  async execute(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJob(jobId);
      if (!job) return false;

      // Move to processing
      await this.client.lRem(this.QUEUE_PREFIX, 0, jobId);
      await this.client.lPush(this.PROCESSING_PREFIX, jobId);

      // Execute job
      const handler = this.jobHandlers.get(job.type);
      if (!handler) {
        logger.error(`No handler registered for job type: ${job.type}`);
        await this.markJobFailed(jobId, 'No handler registered');
        return false;
      }

      job.status = 'running';
      job.startedAt = new Date();
      job.updatedAt = new Date();
      await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

      try {
        const result = await handler(job);
        
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result;
        job.updatedAt = new Date();
        await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

        // Move to completed
        await this.client.lRem(this.PROCESSING_PREFIX, 0, jobId);
        await this.client.lPush(this.COMPLETED_PREFIX, jobId);

        logger.info(`Job ${jobId} completed successfully`);
        return true;
      } catch (error: any) {
        await this.markJobFailed(jobId, error.message);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to execute job ${jobId}: ${error}`);
      return false;
    }
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.status = 'failed';
    job.error = errorMessage;
    job.updatedAt = new Date();
    await this.client.set(`${this.JOB_DATA_PREFIX}:${jobId}`, JSON.stringify(job));

    // Move to failed queue
    await this.client.lRem(this.PROCESSING_PREFIX, 0, jobId);
    await this.client.lPush(this.FAILED_PREFIX, jobId);

    logger.error(`Job ${jobId} failed: ${errorMessage}`);
  }

  async cleanup(olderThan: Date): Promise<number> {
    try {
      let cleaned = 0;

      // Clean completed jobs
      const completedIds = await this.client.lRange(this.COMPLETED_PREFIX, 0, -1);
      for (const jobId of completedIds) {
        const job = await this.getJob(jobId);
        if (job && job.completedAt && job.completedAt < olderThan) {
          await this.client.del(`${this.JOB_DATA_PREFIX}:${jobId}`);
          await this.client.lRem(this.COMPLETED_PREFIX, 0, jobId);
          cleaned++;
        }
      }

      logger.info(`Cleaned up ${cleaned} jobs older than ${olderThan.toISOString()}`);
      return cleaned;
    } catch (error) {
      logger.error('Failed to cleanup jobs:', error);
      return 0;
    }
  }

  async getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [pending, running, completed, failed, delayed] = await Promise.all([
        this.client.lLen(this.QUEUE_PREFIX),
        this.client.lLen(this.PROCESSING_PREFIX),
        this.client.lLen(this.COMPLETED_PREFIX),
        this.client.lLen(this.FAILED_PREFIX),
        this.client.zCard(this.DELAYED_PREFIX),
      ]);

      return { pending, running, completed, failed, delayed };
    } catch (error) {
      logger.error('Failed to get stats:', error);
      return { pending: 0, running: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  async start(): Promise<void> {
    if (this.workerRunning) {
      logger.warn('Worker already running');
      return;
    }

    this.workerRunning = true;
    logger.info('Starting scheduler worker');

    // Check for delayed jobs every second
    this.workerInterval = setInterval(async () => {
      await this.processDelayedJobs();
      await this.processQueue();
    }, 1000);
  }

  async stop(): Promise<void> {
    if (!this.workerRunning) {
      return;
    }

    this.workerRunning = false;
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = undefined;
    }

    logger.info('Stopped scheduler worker');
  }

  private async processDelayedJobs(): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Get jobs scheduled for now or earlier
      const readyJobs = await this.client.zRangeByScore(this.DELAYED_PREFIX, 0, now);
      
      for (const jobId of readyJobs) {
        await this.client.zRem(this.DELAYED_PREFIX, jobId);
        await this.client.lPush(this.QUEUE_PREFIX, jobId);
        logger.debug(`Moved delayed job ${jobId} to queue`);
      }
    } catch (error) {
      logger.error('Failed to process delayed jobs:', error);
    }
  }

  private async processQueue(): Promise<void> {
    try {
      // Get next job from queue
      const jobId = await this.client.rPop(this.QUEUE_PREFIX);
      if (!jobId) return;

      // Move to processing queue for duplicate execution protection
      await this.client.lPush(this.PROCESSING_PREFIX, jobId);

      // Execute with timeout protection
      const timeoutMs = parseInt(process.env.SCHEDULER_JOB_TIMEOUT_MS || '300000', 10); // 5 minutes default
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job execution timeout')), timeoutMs);
      });

      try {
        await Promise.race([this.execute(jobId), timeoutPromise]);
        // On success, move to completed queue
        await this.client.lRem(this.PROCESSING_PREFIX, 1, jobId);
        await this.client.lPush(this.COMPLETED_PREFIX, jobId);
      } catch (error) {
        // On failure, move back to queue for retry or to failed queue
        await this.client.lRem(this.PROCESSING_PREFIX, 1, jobId);
        const job = await this.getJob(jobId);
        if (job && (job.retryCount || 0) < (job.maxRetries || 3)) {
          await this.retry(jobId);
        } else {
          await this.client.lPush(this.FAILED_PREFIX, jobId);
        }
      }
    } catch (error) {
      logger.error('Failed to process queue:', error);
    }
  }

  getProviderName(): string {
    return 'RedisScheduler';
  }
}
