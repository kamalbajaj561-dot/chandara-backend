import { EmailProvider, EmailMessage, EmailSendResult } from './EmailProvider.interface';
import logger from '../../utils/logger';

interface MockEmailLog {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
  timestamp: Date;
}

export class MockEmailProvider implements EmailProvider {
  private emailLog: MockEmailLog[] = [];
  private shouldFail: boolean = false;
  private failureRate: number = 0;

  constructor(options: { shouldFail?: boolean; failureRate?: number } = {}) {
    this.shouldFail = options.shouldFail || false;
    this.failureRate = options.failureRate || 0;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Simulate random failures based on failure rate
    if (this.shouldFail || (this.failureRate > 0 && Math.random() < this.failureRate)) {
      logger.warn(`Mock email failed to send to ${message.to}`);
      return {
        success: false,
        error: 'Mock email provider simulated failure',
        provider: this.getProviderName(),
      };
    }

    const logEntry: MockEmailLog = {
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      from: message.from,
      cc: message.cc,
      bcc: message.bcc,
      attachments: message.attachments,
      timestamp: new Date(),
    };

    this.emailLog.push(logEntry);
    logger.info(`Mock email sent to ${message.to}: ${message.subject}`);

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      provider: this.getProviderName(),
    };
  }

  async sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    for (const message of messages) {
      const result = await this.send(message);
      results.push(result);
    }

    return results;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getProviderName(): string {
    return 'Mock';
  }

  isReady(): boolean {
    return true;
  }

  /**
   * Get all logged emails (useful for testing)
   */
  getEmailLog(): MockEmailLog[] {
    return [...this.emailLog];
  }

  /**
   * Clear the email log
   */
  clearLog(): void {
    this.emailLog = [];
  }

  /**
   * Set failure mode for testing
   */
  setFailureMode(shouldFail: boolean, failureRate = 0): void {
    this.shouldFail = shouldFail;
    this.failureRate = failureRate;
  }

  /**
   * Get count of sent emails
   */
  getSentCount(): number {
    return this.emailLog.length;
  }
}
