import { SchedulerProvider, ScheduleOptions, CronScheduleOptions } from '../providers/schedulerProvider.interface';
import { RedisSchedulerProvider } from '../providers/redisSchedulerProvider';
import { scheduledNotificationRepository } from '../repositories/scheduledNotification.repository';
import { jobLogRepository } from '../repositories/jobLog.repository';
import { pushNotificationService } from './pushNotification.service';
import { analyticsAggregationService } from './analyticsAggregation.service';
import { ScheduledNotification } from '../types';
import logger from '../utils/logger';

/**
 * Scheduler Service
 * Manages job scheduling and execution using the scheduler provider
 */
export class SchedulerService {
  private scheduler: SchedulerProvider;
  private jobHandlers: Map<string, (job: any) => Promise<any>> = new Map();

  constructor(scheduler?: SchedulerProvider) {
    this.scheduler = scheduler || new RedisSchedulerProvider();
    this.registerDefaultHandlers();
  }

  /**
   * Register default job handlers
   */
  private registerDefaultHandlers(): void {
    // Push notification handler
    this.registerHandler('push_notification', async (job) => {
      const { userId, title, body, data } = job.payload;
      return await pushNotificationService.sendToUser(userId, { title, body, data });
    });

    // Scheduled notification handler
    this.registerHandler('scheduled_notification', async (job) => {
      const notificationId = job.payload.notificationId;
      const notification = await scheduledNotificationRepository.findById(notificationId);
      
      if (!notification) {
        throw new Error('Scheduled notification not found');
      }

      if (notification.userId) {
        await pushNotificationService.sendToUser(notification.userId, {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      } else if (notification.topic) {
        await pushNotificationService.sendToTopic(notification.topic, {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      }

      // Update notification status
      await scheduledNotificationRepository.updateStatus(notificationId, 'sent');
      
      return { success: true, notificationId };
    });

    // Event reminder handler
    this.registerHandler('event_reminder', async (job) => {
      const { eventId, userId, reminderType } = job.payload;
      const messages: Record<string, { title: string; body: string }> = {
        '24h': { title: 'Event Tomorrow', body: 'Your event starts tomorrow!' },
        '12h': { title: 'Event in 12 Hours', body: 'Your event starts in 12 hours!' },
        '1h': { title: 'Event in 1 Hour', body: 'Your event starts in 1 hour!' },
        '30m': { title: 'Event in 30 Minutes', body: 'Your event starts in 30 minutes!' },
        '10m': { title: 'Event Starting Soon', body: 'Your event starts in 10 minutes!' },
      };

      const message = messages[reminderType] || { title: 'Event Reminder', body: 'Event reminder' };
      
      await pushNotificationService.sendToUser(userId, {
        title: message.title,
        body: message.body,
        data: { eventId, reminderType },
      });

      return { success: true, eventId, reminderType };
    });

    // Analytics aggregation handlers
    this.registerHandler('analytics_hourly_aggregation', async (job) => {
      const { date, hour } = job.payload;
      await analyticsAggregationService.aggregateHourly(date, hour);
      return { success: true, date, hour };
    });

    this.registerHandler('analytics_daily_aggregation', async (job) => {
      const { date } = job.payload;
      await analyticsAggregationService.aggregateDaily(date);
      return { success: true, date };
    });

    this.registerHandler('analytics_weekly_aggregation', async (job) => {
      const { year, week } = job.payload;
      await analyticsAggregationService.aggregateWeekly(year, week);
      return { success: true, year, week };
    });

    this.registerHandler('analytics_monthly_aggregation', async (job) => {
      const { year, month } = job.payload;
      await analyticsAggregationService.aggregateMonthly(year, month);
      return { success: true, year, month };
    });

    this.registerHandler('analytics_yearly_aggregation', async (job) => {
      const { year } = job.payload;
      await analyticsAggregationService.aggregateYearly(year);
      return { success: true, year };
    });

    // Register handlers with the scheduler provider
    if (this.scheduler instanceof RedisSchedulerProvider) {
      this.jobHandlers.forEach((handler, jobType) => {
        this.scheduler.registerHandler(jobType, handler);
      });
    }
  }

  /**
   * Register a custom job handler
   */
  registerHandler(jobType: string, handler: (job: any) => Promise<any>): void {
    this.jobHandlers.set(jobType, handler);
    if (this.scheduler instanceof RedisSchedulerProvider) {
      this.scheduler.registerHandler(jobType, handler);
    }
    logger.info(`Registered handler for job type: ${jobType}`);
  }

  /**
   * Schedule a one-time job
   */
  async schedule(
    jobType: string,
    payload: Record<string, any>,
    scheduledFor: Date,
    options?: ScheduleOptions
  ): Promise<string> {
    // Log the job
    const jobLog = await jobLogRepository.create({
      jobType,
      jobId: '', // Will be set after scheduling
      status: 'pending',
      payload,
      retryCount: 0,
      maxRetries: options?.maxRetries || 3,
      priority: options?.priority,
      scheduledFor,
    });

    // Schedule with provider
    const jobId = await this.scheduler.schedule(jobType, payload, scheduledFor, options);

    // Update job log with provider job ID
    await jobLogRepository.update(jobLog.id, { jobId });

    logger.info(`Scheduled job ${jobId} of type ${jobType} for ${scheduledFor.toISOString()}`);
    return jobId;
  }

  /**
   * Schedule a recurring job using cron expression
   */
  async scheduleCron(
    jobType: string,
    payload: Record<string, any>,
    cronOptions: CronScheduleOptions
  ): Promise<string> {
    const jobLog = await jobLogRepository.create({
      jobType,
      jobId: '',
      status: 'pending',
      payload,
      retryCount: 0,
      maxRetries: cronOptions.maxRetries || 3,
      priority: cronOptions.priority,
      scheduledFor: new Date(),
    });

    const jobId = await this.scheduler.scheduleCron(jobType, payload, cronOptions);
    await jobLogRepository.update(jobLog.id, { jobId });

    logger.info(`Scheduled cron job ${jobId} of type ${jobType} with expression ${cronOptions.cronExpression}`);
    return jobId;
  }

  /**
   * Schedule a push notification
   */
  async schedulePushNotification(
    userId: string,
    title: string,
    body: string,
    scheduledFor: Date,
    data?: Record<string, any>
  ): Promise<string> {
    // Create scheduled notification record
    const notification = await scheduledNotificationRepository.create({
      userId,
      title,
      body,
      data,
      scheduledFor,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      recurring: false,
    });

    // Schedule the job
    return this.schedule('scheduled_notification', { notificationId: notification.id }, scheduledFor);
  }

  /**
   * Schedule a topic push notification
   */
  async scheduleTopicPush(
    topic: string,
    title: string,
    body: string,
    scheduledFor: Date,
    data?: Record<string, any>
  ): Promise<string> {
    const notification = await scheduledNotificationRepository.create({
      topic,
      title,
      body,
      data,
      scheduledFor,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      recurring: false,
    });

    return this.schedule('scheduled_notification', { notificationId: notification.id }, scheduledFor);
  }

  /**
   * Schedule event reminders
   */
  async scheduleEventReminders(eventId: string, eventDate: Date, userId: string): Promise<string[]> {
    const jobIds: string[] = [];
    const reminderIntervals = [
      { hours: 24, type: '24h' },
      { hours: 12, type: '12h' },
      { hours: 1, type: '1h' },
      { minutes: 30, type: '30m' },
      { minutes: 10, type: '10m' },
    ];

    for (const interval of reminderIntervals) {
      const scheduledFor = new Date(eventDate);
      if (interval.hours) {
        scheduledFor.setHours(scheduledFor.getHours() - interval.hours);
      }
      if (interval.minutes) {
        scheduledFor.setMinutes(scheduledFor.getMinutes() - interval.minutes);
      }

      // Only schedule if in the future
      if (scheduledFor > new Date()) {
        const jobId = await this.schedule('event_reminder', { eventId, userId, reminderType: interval.type }, scheduledFor);
        jobIds.push(jobId);
      }
    }

    logger.info(`Scheduled ${jobIds.length} event reminders for event ${eventId}`);
    return jobIds;
  }

  /**
   * Cancel a scheduled job
   */
  async cancel(jobId: string): Promise<boolean> {
    const success = await this.scheduler.cancel(jobId);
    if (success) {
      // Update job log
      const jobLog = await jobLogRepository.findByJobId(jobId);
      if (jobLog) {
        await jobLogRepository.updateStatus(jobLog.id, 'cancelled');
      }
    }
    return success;
  }

  /**
   * Pause a scheduled job
   */
  async pause(jobId: string): Promise<boolean> {
    return this.scheduler.pause(jobId);
  }

  /**
   * Resume a paused job
   */
  async resume(jobId: string): Promise<boolean> {
    return this.scheduler.resume(jobId);
  }

  /**
   * Reschedule a job
   */
  async reschedule(jobId: string, newScheduledFor: Date): Promise<boolean> {
    return this.scheduler.reschedule(jobId, newScheduledFor);
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<any> {
    return this.scheduler.getJob(jobId);
  }

  /**
   * Get all jobs of a specific type
   */
  async getJobsByType(jobType: string): Promise<any[]> {
    return this.scheduler.getJobsByType(jobType);
  }

  /**
   * Get pending jobs
   */
  async getPendingJobs(): Promise<any[]> {
    return this.scheduler.getPendingJobs();
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(): Promise<any[]> {
    return this.scheduler.getFailedJobs();
  }

  /**
   * Retry a failed job
   */
  async retry(jobId: string): Promise<boolean> {
    const success = await this.scheduler.retry(jobId);
    if (success) {
      // Update job log
      const jobLog = await jobLogRepository.findByJobId(jobId);
      if (jobLog) {
        await jobLogRepository.incrementRetryCount(jobLog.id);
        await jobLogRepository.updateStatus(jobLog.id, 'pending');
      }
    }
    return success;
  }

  /**
   * Execute a job immediately
   */
  async execute(jobId: string): Promise<boolean> {
    const jobLog = await jobLogRepository.findByJobId(jobId);
    if (jobLog) {
      await jobLogRepository.updateStatus(jobLog.id, 'running');
    }
    return this.scheduler.execute(jobId);
  }

  /**
   * Clean up completed jobs
   */
  async cleanup(olderThan: Date): Promise<number> {
    return this.scheduler.cleanup(olderThan);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.scheduler.getStats();
  }

  /**
   * Start the scheduler worker
   */
  async start(): Promise<void> {
    await this.scheduler.start();
    logger.info('Scheduler service started');
  }

  /**
   * Stop the scheduler worker
   */
  async stop(): Promise<void> {
    await this.scheduler.stop();
    logger.info('Scheduler service stopped');
  }

  /**
   * Get scheduled notifications for a user
   */
  async getUserScheduledNotifications(userId: string): Promise<ScheduledNotification[]> {
    return scheduledNotificationRepository.findByUserId(userId);
  }

  /**
   * Cancel scheduled notification
   */
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    await scheduledNotificationRepository.cancel(notificationId);
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStatistics(): Promise<{
    queue: any;
    scheduledNotifications: any;
    jobLogs: any;
  }> {
    const [queueStats, notificationStats, jobStats] = await Promise.all([
      this.getStats(),
      scheduledNotificationRepository.getStatistics(),
      jobLogRepository.getStatistics(),
    ]);

    return {
      queue: queueStats,
      scheduledNotifications: notificationStats,
      jobLogs: jobStats,
    };
  }

  /**
   * Schedule analytics aggregation jobs
   */
  async scheduleAnalyticsAggregations(): Promise<void> {
    // Hourly aggregation - runs every hour at the top of the hour
    await this.scheduleCron('analytics_hourly_aggregation', {}, {
      cronExpression: '0 * * * *',
      maxRetries: 3,
    });

    // Daily aggregation - runs every day at 1:00 AM UTC
    await this.scheduleCron('analytics_daily_aggregation', {}, {
      cronExpression: '0 1 * * *',
      maxRetries: 3,
    });

    // Weekly aggregation - runs every Sunday at 2:00 AM UTC
    await this.scheduleCron('analytics_weekly_aggregation', {}, {
      cronExpression: '0 2 * * 0',
      maxRetries: 3,
    });

    // Monthly aggregation - runs on the 1st of every month at 3:00 AM UTC
    await this.scheduleCron('analytics_monthly_aggregation', {}, {
      cronExpression: '0 3 1 * *',
      maxRetries: 3,
    });

    // Yearly aggregation - runs on January 1st at 4:00 AM UTC
    await this.scheduleCron('analytics_yearly_aggregation', {}, {
      cronExpression: '0 4 1 1 *',
      maxRetries: 3,
    });

    logger.info('Scheduled all analytics aggregation jobs');
  }

  /**
   * Cancel analytics aggregation jobs
   */
  async cancelAnalyticsAggregations(): Promise<void> {
    const jobTypes = [
      'analytics_hourly_aggregation',
      'analytics_daily_aggregation',
      'analytics_weekly_aggregation',
      'analytics_monthly_aggregation',
      'analytics_yearly_aggregation',
    ];

    for (const jobType of jobTypes) {
      const jobs = await this.getJobsByType(jobType);
      for (const job of jobs) {
        await this.cancel(job.id);
      }
    }

    logger.info('Cancelled all analytics aggregation jobs');
  }
}

let schedulerServiceInstance: SchedulerService | null = null;

export function getSchedulerService(): SchedulerService {
  if (!schedulerServiceInstance) {
    schedulerServiceInstance = new SchedulerService();
  }
  return schedulerServiceInstance;
}

// Lazy export that initializes on first access
export const schedulerService = new Proxy({} as SchedulerService, {
  get(_target, prop) {
    return getSchedulerService()[prop as keyof SchedulerService];
  },
  set(_target, prop, value) {
    (getSchedulerService() as any)[prop] = value;
    return true;
  }
});
