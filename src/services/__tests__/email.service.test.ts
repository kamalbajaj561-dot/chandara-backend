import { EmailService } from '../email.service';
import { MockEmailProvider } from '../../providers/email/MockEmailProvider';
import { emailLogRepository } from '../../repositories/emailLog.repository';
import { emailTemplateService } from '../emailTemplate.service';
import { getRedisClient } from '../redis';

// Mock dependencies
jest.mock('../../repositories/emailLog.repository');
jest.mock('../emailTemplate.service');
jest.mock('../redis');

describe('EmailService', () => {
  let service: EmailService;
  let mockProvider: MockEmailProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider = new MockEmailProvider();
    service = new EmailService({ provider: mockProvider, queueEnabled: false });

    // Mock repository methods
    (emailLogRepository.create as jest.Mock).mockResolvedValue({
      emailId: 'test-email-id',
      recipient: 'test@example.com',
      template: 'welcome',
      subject: 'Test',
      provider: 'Mock',
      status: 'queued',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (emailLogRepository.updateStatus as jest.Mock).mockResolvedValue({
      emailId: 'test-email-id',
      recipient: 'test@example.com',
      template: 'welcome',
      subject: 'Test',
      provider: 'Mock',
      status: 'sent',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (emailTemplateService.renderTemplate as jest.Mock).mockResolvedValue('<p>Rendered template</p>');
    (emailTemplateService.mergeVariables as jest.Mock).mockReturnValue({ userName: 'John' });

    // Mock Redis client
    const mockRedisClient = {
      lPush: jest.fn().mockResolvedValue(1),
      rPop: jest.fn().mockResolvedValue(null),
    };
    (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await service.sendEmail('test@example.com', 'welcome', 'Test Subject', { userName: 'John' });

      expect(result).toHaveProperty('emailId');
      expect(result.recipient).toBe('test@example.com');
      expect(result.status).toBe('queued');
      expect(emailLogRepository.create).toHaveBeenCalled();
    });

    it('should throw error for invalid email', async () => {
      await expect(service.sendEmail('invalid-email', 'welcome', 'Test')).rejects.toThrow('Invalid email');
    });

    it('should merge variables with defaults', async () => {
      await service.sendEmail('test@example.com', 'welcome', 'Test', { userName: 'John' });

      expect(emailTemplateService.mergeVariables).toHaveBeenCalledWith({ userName: 'John' });
    });

    it('should queue email when queue enabled', async () => {
      const queuedService = new EmailService({ provider: mockProvider, queueEnabled: true });
      const mockRedisClient = { lPush: jest.fn().mockResolvedValue(1), rPop: jest.fn().mockResolvedValue(null) };
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

      await queuedService.sendEmail('test@example.com', 'welcome', 'Test', { userName: 'John' });

      expect(mockRedisClient.lPush).toHaveBeenCalled();
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails', async () => {
      const recipients = ['test1@example.com', 'test2@example.com'];
      const results = await service.sendBulkEmail(recipients, 'welcome', 'Test Subject', { userName: 'John' });

      expect(results).toHaveLength(2);
      expect(emailLogRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      (emailLogRepository.create as jest.Mock)
        .mockResolvedValueOnce({ emailId: '1', recipient: 'test1@example.com', template: 'welcome', subject: 'Test', provider: 'Mock', status: 'queued', retryCount: 0, createdAt: new Date(), updatedAt: new Date() })
        .mockRejectedValueOnce(new Error('Failed'));

      const recipients = ['test1@example.com', 'test2@example.com'];
      const results = await service.sendBulkEmail(recipients, 'welcome', 'Test', { userName: 'John' });

      expect(results).toHaveLength(1);
    });
  });

  describe('processQueue', () => {
    it('should process queued emails', async () => {
      const mockRedisClient = {
        lPush: jest.fn().mockResolvedValue(1),
        rPop: jest.fn()
          .mockResolvedValueOnce(JSON.stringify({
            emailId: '1',
            recipient: 'test@example.com',
            template: 'welcome',
            subject: 'Test',
            variables: { userName: 'John' },
            priority: 0,
            retryCount: 0,
            maxRetries: 3,
            queuedAt: new Date(),
          }))
          .mockResolvedValueOnce(null),
      };
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

      const processed = await service.processQueue(10);

      expect(processed).toBe(1);
      expect(emailLogRepository.updateStatus).toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      const mockRedisClient = {
        lPush: jest.fn().mockResolvedValue(1),
        rPop: jest.fn().mockResolvedValue(null),
      };
      (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

      const processed = await service.processQueue(10);

      expect(processed).toBe(0);
    });
  });

  describe('retryFailedEmails', () => {
    it('should retry failed emails', async () => {
      const failedEmails = [
        {
          emailId: '1',
          recipient: 'test@example.com',
          template: 'welcome',
          subject: 'Test',
          provider: 'Mock',
          status: 'failed',
          retryCount: 1,
          variables: { userName: 'John' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (emailLogRepository.findFailedForRetry as jest.Mock).mockResolvedValue(failedEmails);
      (emailLogRepository.incrementRetryCount as jest.Mock).mockResolvedValue(failedEmails[0]);

      const retried = await service.retryFailedEmails(3);

      expect(retried).toBe(1);
      expect(emailLogRepository.incrementRetryCount).toHaveBeenCalledWith('1');
    });
  });

  describe('getEmailLog', () => {
    it('should get email log by ID', async () => {
      const mockLog = {
        emailId: '1',
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Test',
        provider: 'Mock',
        status: 'sent',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (emailLogRepository.findById as jest.Mock).mockResolvedValue(mockLog);

      const result = await service.getEmailLog('1');

      expect(result).toEqual(mockLog);
      expect(emailLogRepository.findById).toHaveBeenCalledWith('1');
    });
  });

  describe('getUserEmailLogs', () => {
    it('should get user email logs', async () => {
      const mockLogs = [
        { emailId: '1', recipient: 'test@example.com', template: 'welcome', subject: 'Test', provider: 'Mock', status: 'sent', retryCount: 0, createdAt: new Date(), updatedAt: new Date() },
      ];

      (emailLogRepository.findByUserId as jest.Mock).mockResolvedValue(mockLogs);

      const results = await service.getUserEmailLogs('user123', 50, 0);

      expect(results).toEqual(mockLogs);
      expect(emailLogRepository.findByUserId).toHaveBeenCalledWith('user123', 50, 0);
    });
  });

  describe('getStatistics', () => {
    it('should get email statistics', async () => {
      const mockStats = {
        total: 10,
        sent: 8,
        failed: 1,
        queued: 1,
        opened: 5,
        clicked: 3,
      };

      (emailLogRepository.getStatistics as jest.Mock).mockResolvedValue(mockStats);

      const result = await service.getStatistics('user123');

      expect(result).toEqual(mockStats);
      expect(emailLogRepository.getStatistics).toHaveBeenCalledWith('user123');
    });
  });

  describe('trackEmailOpen', () => {
    it('should track email open', async () => {
      await service.trackEmailOpen('email123');

      expect(emailLogRepository.updateStatus).toHaveBeenCalledWith('email123', 'opened');
    });
  });

  describe('trackEmailClick', () => {
    it('should track email click', async () => {
      await service.trackEmailClick('email123');

      expect(emailLogRepository.updateStatus).toHaveBeenCalledWith('email123', 'clicked');
    });
  });

  // Convenience methods tests
  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      await service.sendWelcomeEmail('test@example.com', 'John', 'user123');

      expect(emailLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'test@example.com',
          template: 'welcome',
          subject: 'Welcome to Chandara!',
          userId: 'user123',
        })
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email', async () => {
      await service.sendVerificationEmail('test@example.com', 'John', 'https://example.com/verify', 'user123');

      expect(emailLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'test@example.com',
          template: 'verify-email',
          subject: 'Verify Your Email Address',
        })
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      await service.sendPasswordResetEmail('test@example.com', 'John', 'https://example.com/reset', 'user123');

      expect(emailLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'test@example.com',
          template: 'password-reset',
          subject: 'Reset Your Password',
        })
      );
    });
  });

  describe('sendCreatorApprovedEmail', () => {
    it('should send creator approved email', async () => {
      await service.sendCreatorApprovedEmail('test@example.com', 'John', 'https://example.com/dashboard', 'user123');

      expect(emailLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'test@example.com',
          template: 'creator-approved',
          subject: 'Creator Application Approved',
        })
      );
    });
  });

  describe('sendPaymentSuccessEmail', () => {
    it('should send payment success email', async () => {
      await service.sendPaymentSuccessEmail('test@example.com', 'John', 'order123', '$99.99', '2024-01-01', 'https://example.com/order', 'user123');

      expect(emailLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: 'test@example.com',
          template: 'payment-success',
          subject: 'Payment Successful',
        })
      );
    });
  });
});
