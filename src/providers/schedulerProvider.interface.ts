/**
 * Scheduler Provider Interface
 * Defines the contract for job scheduling providers
 * Implementations: RedisScheduler, BullMQ, Agenda, Cloud Tasks, Cloud Scheduler
 */

export interface Job {
  id: string;
  type: string;
  payload?: Record<string, any>;
  scheduledFor: Date;
  priority?: number;
  maxRetries?: number;
  retryCount?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  result?: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleOptions {
  priority?: number;
  maxRetries?: number;
  retryDelay?: number;
  backoff?: 'fixed' | 'exponential';
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface CronScheduleOptions extends ScheduleOptions {
  cronExpression: string;
  timezone?: string;
}

export interface SchedulerProvider {
  /**
   * Register a job handler for a specific job type
   */
  registerHandler(jobType: string, handler: (job: Job) => Promise<any>): void;

  /**
   * Schedule a one-time job
   */
  schedule(jobType: string, payload: Record<string, any>, scheduledFor: Date, options?: ScheduleOptions): Promise<string>;

  /**
   * Schedule a recurring job using cron expression
   */
  scheduleCron(jobType: string, payload: Record<string, any>, cronOptions: CronScheduleOptions): Promise<string>;

  /**
   * Cancel a scheduled job
   */
  cancel(jobId: string): Promise<boolean>;

  /**
   * Pause a scheduled job
   */
  pause(jobId: string): Promise<boolean>;

  /**
   * Resume a paused job
   */
  resume(jobId: string): Promise<boolean>;

  /**
   * Reschedule a job
   */
  reschedule(jobId: string, newScheduledFor: Date): Promise<boolean>;

  /**
   * Get job status
   */
  getJob(jobId: string): Promise<Job | null>;

  /**
   * Get all jobs of a specific type
   */
  getJobsByType(jobType: string): Promise<Job[]>;

  /**
   * Get pending jobs
   */
  getPendingJobs(): Promise<Job[]>;

  /**
   * Get failed jobs
   */
  getFailedJobs(): Promise<Job[]>;

  /**
   * Retry a failed job
   */
  retry(jobId: string): Promise<boolean>;

  /**
   * Execute a job immediately
   */
  execute(jobId: string): Promise<boolean>;

  /**
   * Clean up completed jobs
   */
  cleanup(olderThan: Date): Promise<number>;

  /**
   * Get queue statistics
   */
  getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;

  /**
   * Start the scheduler worker
   */
  start(): Promise<void>;

  /**
   * Stop the scheduler worker
   */
  stop(): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
