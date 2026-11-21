import { EmailProvider, EmailMessage } from '../providers/email/EmailProvider.interface';
import { SMTPProvider } from '../providers/email/SMTPProvider';
import { MockEmailProvider } from '../providers/email/MockEmailProvider';
import { EmailLog } from '../types';
import { emailLogRepository } from '../repositories/emailLog.repository';
import { emailTemplateService, TemplateVariables } from './emailTemplate.service';
import { getRedisClient } from './redis';
import logger from '../utils/logger';

interface EmailQueueItem {
  emailId: string;
  recipient: string;
  template: string;
  subject: string;
  variables: TemplateVariables;
  priority: number;
  retryCount: number;
  maxRetries: number;
  queuedAt: Date;
}

export class EmailService {
  private provider: EmailProvider;
  private queueEnabled: boolean;
  private maxRetryCount: number;
  private queuePrefix: string = 'email_queue';

  constructor(options: {
    provider?: EmailProvider;
    queueEnabled?: boolean;
    maxRetryCount?: number;
    useMock?: boolean;
  } = {}) {
    this.queueEnabled = options.queueEnabled !== false;
    this.maxRetryCount = options.maxRetryCount || 3;

    if (options.provider) {
      this.provider = options.provider;
    } else if (options.useMock || process.env.NODE_ENV === 'test') {
      this.provider = new MockEmailProvider();
    } else {
      // Initialize SMTP provider from environment variables
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
        from: process.env.SMTP_FROM || 'noreply@chandara.com',
      };
      this.provider = new SMTPProvider(smtpConfig);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(
    recipient: string,
    template: string,
    subject: string,
    variables: TemplateVariables = {},
    options: {
      userId?: string;
      queue?: boolean;
      priority?: number;
    } = {}
  ): Promise<EmailLog> {
    // Validate recipient
    if (!this.provider.validateEmail(recipient)) {
      throw new Error(`Invalid email address: ${recipient}`);
    }

    // Merge with default variables
    const mergedVariables = emailTemplateService.mergeVariables(variables);

    // Create email log entry
    const emailLog = await emailLogRepository.create({
      userId: options.userId,
      recipient,
      template,
      subject,
      provider: this.provider.getProviderName(),
      status: 'queued',
      retryCount: 0,
      variables: mergedVariables as Record<string, string | number>,
    });

    // Queue or send immediately
    if (options.queue !== false && this.queueEnabled) {
      await this.queueEmail({
        emailId: emailLog.emailId,
        recipient,
        template,
        subject,
        variables: mergedVariables,
        priority: options.priority || 0,
        retryCount: 0,
        maxRetries: this.maxRetryCount,
        queuedAt: new Date(),
      });
    } else {
      await this.processEmail(emailLog.emailId, template, subject, mergedVariables, recipient);
    }

    return emailLog;
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(
    recipients: string[],
    template: string,
    subject: string,
    variables: TemplateVariables = {},
    options: {
      queue?: boolean;
      priority?: number;
    } = {}
  ): Promise<EmailLog[]> {
    const emailLogs: EmailLog[] = [];

    for (const recipient of recipients) {
      try {
        const emailLog = await this.sendEmail(recipient, template, subject, variables, options);
        emailLogs.push(emailLog);
      } catch (error) {
        logger.error(`Failed to queue email for ${recipient}:`, error);
      }
    }

    return emailLogs;
  }

  /**
   * Process email (send via provider)
   */
  private async processEmail(
    emailId: string,
    template: string,
    subject: string,
    variables: TemplateVariables,
    recipient: string
  ): Promise<void> {
    try {
      // Render template
      const html = await emailTemplateService.renderTemplate(template, variables);

      // Create email message
      const message: EmailMessage = {
        to: recipient,
        subject,
        html,
      };

      // Send via provider
      const result = await this.provider.send(message);

      // Update email log
      if (result.success) {
        await emailLogRepository.updateStatus(emailId, 'sent');
        logger.info(`Email sent successfully: ${emailId} to ${recipient}`);
      } else {
        await emailLogRepository.updateStatus(emailId, 'failed', result.error);
        logger.error(`Email failed: ${emailId} - ${result.error}`);
      }
    } catch (error: any) {
      await emailLogRepository.updateStatus(emailId, 'failed', error.message);
      logger.error(`Error processing email ${emailId}:`, error);
    }
  }

  /**
   * Queue email in Redis
   */
  private async queueEmail(item: EmailQueueItem): Promise<void> {
    const queueKey = `${this.queuePrefix}:pending`;
    const client = getRedisClient();

    await client.lPush(queueKey, JSON.stringify(item));
    logger.info(`Email queued: ${item.emailId}`);
  }

  /**
   * Process queued emails
   */
  async processQueue(batchSize = 10): Promise<number> {
    const queueKey = `${this.queuePrefix}:pending`;
    const client = getRedisClient();

    let processed = 0;

    for (let i = 0; i < batchSize; i++) {
      const itemStr = await client.rPop(queueKey);
      if (!itemStr) {
        break;
      }

      try {
        const item: EmailQueueItem = JSON.parse(itemStr);
        await this.processEmail(item.emailId, item.template, item.subject, item.variables, item.recipient);
        processed++;
      } catch (error) {
        logger.error('Error processing queued email:', error);
      }
    }

    if (processed > 0) {
      logger.info(`Processed ${processed} emails from queue`);
    }

    return processed;
  }

  /**
   * Retry failed emails
   */
  async retryFailedEmails(maxRetryCount?: number): Promise<number> {
    const retryLimit = maxRetryCount || this.maxRetryCount;
    const failedEmails = await emailLogRepository.findFailedForRetry(retryLimit);

    let retried = 0;

    for (const emailLog of failedEmails) {
      try {
        // Apply exponential backoff with jitter before retry
        const baseDelay = parseInt(process.env.EMAIL_RETRY_BASE_DELAY_MS || '1000', 10);
        const delay = baseDelay * Math.pow(2, emailLog.retryCount || 0);
        const jitter = Math.random() * 1000; // Add up to 1 second jitter
        const totalDelay = delay + jitter;

        await new Promise(resolve => setTimeout(resolve, totalDelay));

        await emailLogRepository.incrementRetryCount(emailLog.emailId);
        
        if (emailLog.variables) {
          await this.processEmail(
            emailLog.emailId,
            emailLog.template,
            emailLog.subject,
            emailLog.variables,
            emailLog.recipient
          );
        }
        
        retried++;
      } catch (error) {
        logger.error(`Error retrying email ${emailLog.emailId}:`, error);
      }
    }

    if (retried > 0) {
      logger.info(`Retried ${retried} failed emails`);
    }

    return retried;
  }

  /**
   * Get email log by ID
   */
  async getEmailLog(emailId: string): Promise<EmailLog | null> {
    return emailLogRepository.findById(emailId);
  }

  /**
   * Get email logs for user
   */
  async getUserEmailLogs(userId: string, limit = 50, offset = 0): Promise<EmailLog[]> {
    return emailLogRepository.findByUserId(userId, limit, offset);
  }

  /**
   * Get email statistics
   */
  async getStatistics(userId?: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    queued: number;
    opened: number;
    clicked: number;
  }> {
    return emailLogRepository.getStatistics(userId);
  }

  /**
   * Track email open
   */
  async trackEmailOpen(emailId: string): Promise<void> {
    await emailLogRepository.updateStatus(emailId, 'opened');
    logger.info(`Email opened: ${emailId}`);
  }

  /**
   * Track email click
   */
  async trackEmailClick(emailId: string): Promise<void> {
    await emailLogRepository.updateStatus(emailId, 'clicked');
    logger.info(`Email clicked: ${emailId}`);
  }

  // Convenience methods for common email types

  async sendWelcomeEmail(recipient: string, userName: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'welcome',
      'Welcome to Chandara!',
      { userName },
      { userId }
    );
  }

  async sendVerificationEmail(recipient: string, userName: string, verificationUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'verify-email',
      'Verify Your Email Address',
      { userName, verificationUrl },
      { userId }
    );
  }

  async sendPasswordResetEmail(recipient: string, userName: string, resetUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'password-reset',
      'Reset Your Password',
      { userName, resetUrl },
      { userId }
    );
  }

  async sendCreatorApprovedEmail(recipient: string, creatorName: string, creatorDashboardUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'creator-approved',
      'Creator Application Approved',
      { creatorName, creatorDashboardUrl },
      { userId }
    );
  }

  async sendCreatorRejectedEmail(recipient: string, creatorName: string, creatorDashboardUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'creator-rejected',
      'Creator Application Update',
      { creatorName, creatorDashboardUrl },
      { userId }
    );
  }

  async sendEventPublishedEmail(recipient: string, userName: string, creatorName: string, eventName: string, date: string, time: string, description: string, eventUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'event-published',
      `New Event from ${creatorName}!`,
      { userName, creatorName, eventName, date, time, description, eventUrl },
      { userId }
    );
  }

  async sendEventCancelledEmail(recipient: string, userName: string, eventName: string, date: string, time: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'event-cancelled',
      'Event Cancelled',
      { userName, eventName, date, time },
      { userId }
    );
  }

  async sendPaymentSuccessEmail(recipient: string, userName: string, orderId: string, amount: string, date: string, orderUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'payment-success',
      'Payment Successful',
      { userName, orderId, amount, date, orderUrl },
      { userId }
    );
  }

  async sendPaymentFailedEmail(recipient: string, userName: string, orderId: string, orderUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'payment-failed',
      'Payment Failed',
      { userName, orderId, orderUrl },
      { userId }
    );
  }

  async sendRefundApprovedEmail(recipient: string, userName: string, orderId: string, amount: string, reason: string, orderUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'refund-approved',
      'Refund Approved',
      { userName, orderId, amount, reason, orderUrl },
      { userId }
    );
  }

  async sendRefundRejectedEmail(recipient: string, userName: string, orderId: string, reason: string, orderUrl: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'refund-rejected',
      'Refund Request Update',
      { userName, orderId, reason, orderUrl },
      { userId }
    );
  }

  async sendAdminAnnouncement(recipient: string, userName: string, announcementTitle: string, announcementBody: string, userId?: string): Promise<EmailLog> {
    return this.sendEmail(
      recipient,
      'admin-announcement',
      announcementTitle,
      { userName, announcementTitle, announcementBody },
      { userId }
    );
  }
}

export const emailService = new EmailService();
