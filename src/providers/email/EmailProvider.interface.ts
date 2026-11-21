export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface EmailProvider {
  /**
   * Send a single email
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Send bulk emails
   */
  sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]>;

  /**
   * Validate email address
   */
  validateEmail(email: string): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Check if provider is configured and ready
   */
  isReady(): boolean;
}
