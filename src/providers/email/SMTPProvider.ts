import { EmailProvider, EmailMessage, EmailSendResult } from './EmailProvider.interface';
import logger from '../../utils/logger';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class SMTPProvider implements EmailProvider {
  private config: SMTPConfig;
  private transporter: any;

  constructor(config: SMTPConfig) {
    this.config = config;
    this.transporter = null;
  }

  private async initializeTransporter(): Promise<void> {
    if (this.transporter) {
      return;
    }

    try {
      // Dynamically import nodemailer to avoid build issues if not installed
      const nodemailer = await import('nodemailer');
      
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('SMTP transporter initialized and verified');
    } catch (error) {
      logger.error('Failed to initialize SMTP transporter:', error);
      throw new Error('Failed to initialize SMTP transporter');
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      await this.initializeTransporter();

      const mailOptions = {
        from: message.from || this.config.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully via SMTP: ${info.messageId} to ${message.to}`);

      return {
        success: true,
        messageId: info.messageId,
        provider: this.getProviderName(),
      };
    } catch (error: any) {
      logger.error(`Failed to send email via SMTP to ${message.to}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown SMTP error',
        provider: this.getProviderName(),
      };
    }
  }

  async sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];

    for (const message of messages) {
      const result = await this.send(message);
      results.push(result);
      
      // Small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  getProviderName(): string {
    return 'SMTP';
  }

  isReady(): boolean {
    return !!this.config.host && !!this.config.auth.user && !!this.config.auth.pass;
  }
}
