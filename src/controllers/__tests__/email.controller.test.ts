import { EmailController } from '../email.controller';
import { Request, Response, NextFunction } from 'express';
import { emailService } from '../../services/email.service';
import { AppError } from '../../middleware/errorHandler';

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    type: 'access' | 'refresh';
    iat: number;
    exp: number;
  };
}

// Mock email service
jest.mock('../../services/email.service');

// Mock EmailLogRepository to prevent Firebase initialization
jest.mock('../../repositories/emailLog.repository');

describe('EmailController', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'administrator',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockReq.body = {
        recipient: 'test@example.com',
        template: 'welcome',
        variables: { userName: 'John' },
      };

      (emailService.sendEmail as jest.Mock).mockResolvedValue({
        emailId: 'test-id',
        recipient: 'test@example.com',
        status: 'queued',
      });

      await EmailController.sendTestEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Test email sent successfully',
        })
      );
    });

    it('should return 401 if not authenticated', async () => {
      mockReq.user = undefined;

      await EmailController.sendTestEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not authenticated',
        })
      );
    });
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockReq.body = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Test Subject',
        variables: { userName: 'John' },
      };

      (emailService.sendEmail as jest.Mock).mockResolvedValue({
        emailId: 'test-id',
        recipient: 'test@example.com',
        status: 'queued',
      });

      await EmailController.sendEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'welcome',
        'Test Subject',
        { userName: 'John' },
        { userId: 'user-123', queue: undefined }
      );
    });

    it('should allow users to send to themselves', async () => {
      mockReq.body = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Test',
      };

      (emailService.sendEmail as jest.Mock).mockResolvedValue({
        emailId: 'test-id',
        recipient: 'test@example.com',
        status: 'queued',
      });

      await EmailController.sendEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should block users from sending to others', async () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };
      mockReq.body = {
        recipient: 'other@example.com',
        template: 'welcome',
        subject: 'Test',
      };

      await EmailController.sendEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied. Users can only send emails to themselves.',
        })
      );
    });

    it('should allow admins to send to anyone', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        recipient: 'other@example.com',
        template: 'welcome',
        subject: 'Test',
      };

      (emailService.sendEmail as jest.Mock).mockResolvedValue({
        emailId: 'test-id',
        recipient: 'other@example.com',
        status: 'queued',
      });

      await EmailController.sendEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk emails as admin', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        recipients: ['test1@example.com', 'test2@example.com'],
        template: 'welcome',
        subject: 'Test',
      };

      (emailService.sendBulkEmail as jest.Mock).mockResolvedValue([
        { emailId: '1', recipient: 'test1@example.com', status: 'queued' },
        { emailId: '2', recipient: 'test2@example.com', status: 'queued' },
      ]);

      await EmailController.sendBulkEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.sendBulkEmail).toHaveBeenCalled();
    });

    it('should block non-admins from bulk email', async () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };
      mockReq.body = {
        recipients: ['user1@example.com', 'user2@example.com'],
        template: 'newsletter',
        subject: 'Newsletter',
      };

      await EmailController.sendBulkEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied. Bulk email is admin only.',
        })
      );
    });

    it('should validate recipients array', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        recipients: [],
        template: 'welcome',
        subject: 'Test',
      };

      await EmailController.sendBulkEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Recipients array is required',
        })
      );
    });

    it('should enforce max recipients limit', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.body = {
        recipients: Array(101).fill('test@example.com'),
        template: 'welcome',
        subject: 'Test',
      };

      await EmailController.sendBulkEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Maximum 100 recipients per bulk email',
        })
      );
    });
  });

  describe('getEmailLogs', () => {
    it('should get user email logs', async () => {
      mockReq.query = { limit: '25', offset: '0' };
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      (emailService.getUserEmailLogs as jest.Mock).mockResolvedValue([
        { emailId: 'email1', recipient: 'user@example.com', status: 'sent' },
      ]);

      await EmailController.getEmailLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.getUserEmailLogs).toHaveBeenCalledWith('user-123', 25, 0);
    });

    it('should allow admins to view any user logs', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.query = { userId: 'other-user', limit: '25', offset: '0' };

      (emailService.getUserEmailLogs as jest.Mock).mockResolvedValue([]);

      await EmailController.getEmailLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(emailService.getUserEmailLogs).toHaveBeenCalledWith('other-user', 25, 0);
    });
  });

  describe('getEmailLog', () => {
    it('should get single email log', async () => {
      mockReq.params = { id: 'email123' };

      (emailService.getEmailLog as jest.Mock).mockResolvedValue({
        emailId: 'email123',
        recipient: 'test@example.com',
        userId: 'user123',
        status: 'sent',
      });

      await EmailController.getEmailLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.getEmailLog).toHaveBeenCalledWith('email123');
    });

    it('should return 404 if not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      (emailService.getEmailLog as jest.Mock).mockResolvedValue(null);

      await EmailController.getEmailLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Email log not found',
        })
      );
    });

    it('should block users from viewing others logs', async () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };
      mockReq.params = { id: 'email123' };

      (emailService.getEmailLog as jest.Mock).mockResolvedValue({
        emailId: 'email123',
        userId: 'other-user',
        recipient: 'other@example.com',
        status: 'sent',
      });

      await EmailController.getEmailLog(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied',
        })
      );
    });
  });

  describe('retryEmail', () => {
    it('should retry failed email as admin', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.params = { id: 'email123' };

      (emailService.getEmailLog as jest.Mock).mockResolvedValue({
        emailId: 'email123',
        status: 'failed',
      });

      (emailService.retryFailedEmails as jest.Mock).mockResolvedValue(1);

      await EmailController.retryEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.retryFailedEmails).toHaveBeenCalled();
    });

    it('should block non-admins from retry', async () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };
      mockReq.params = { id: 'email123' };

      await EmailController.retryEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied. Retry is admin only.',
        })
      );
    });

    it('should only retry failed emails', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.params = { id: 'email123' };

      (emailService.getEmailLog as jest.Mock).mockResolvedValue({
        emailId: 'email123',
        status: 'sent',
      });

      await EmailController.retryEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Only failed emails can be retried',
        })
      );
    });
  });

  describe('getStatistics', () => {
    it('should get email statistics', async () => {
      mockReq.query = {};
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      (emailService.getStatistics as jest.Mock).mockResolvedValue({
        total: 100,
        sent: 90,
        failed: 10,
      });

      await EmailController.getStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.getStatistics).toHaveBeenCalledWith('user-123');
    });

    it('should allow admins to view global stats', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };

      (emailService.getStatistics as jest.Mock).mockResolvedValue({
        total: 1000,
        sent: 900,
        failed: 50,
        queued: 50,
        opened: 500,
        clicked: 300,
      });

      await EmailController.getStatistics(mockReq as Request, mockRes as Response, mockNext);

      expect(emailService.getStatistics).toHaveBeenCalledWith(undefined);
    });
  });

  describe('processQueue', () => {
    it('should process queue as admin', async () => {
      mockReq.user = { userId: 'admin123', email: 'admin@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockReq.query = { batchSize: '20' };

      (emailService.processQueue as jest.Mock).mockResolvedValue(15);

      await EmailController.processQueue(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(emailService.processQueue).toHaveBeenCalledWith(20);
    });

    it('should block non-admins from processing queue', async () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      await EmailController.processQueue(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied. Queue processing is admin only.',
        })
      );
    });
  });
});
