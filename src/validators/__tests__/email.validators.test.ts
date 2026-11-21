import {
  validateSendEmail,
  validateBulkEmail,
  validateRetryEmail,
  validateTemplateVariables,
  validateEmailQuery,
} from '../email.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Email Validators', () => {
  describe('validateSendEmail', () => {
    it('should validate valid email data', () => {
      const data = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'Test Subject',
        variables: { userName: 'John' },
      };

      const result = validateSendEmail(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid email', () => {
      const data = {
        recipient: 'invalid-email',
        template: 'welcome',
        subject: 'Test',
      };

      expect(() => validateSendEmail(data)).toThrow(AppError);
    });

    it('should throw error for missing recipient', () => {
      const data = {
        template: 'welcome',
        subject: 'Test',
      };

      expect(() => validateSendEmail(data)).toThrow(AppError);
    });

    it('should throw error for missing template', () => {
      const data = {
        recipient: 'test@example.com',
        subject: 'Test',
      };

      expect(() => validateSendEmail(data)).toThrow(AppError);
    });

    it('should throw error for subject too long', () => {
      const data = {
        recipient: 'test@example.com',
        template: 'welcome',
        subject: 'a'.repeat(201),
      };

      expect(() => validateSendEmail(data)).toThrow(AppError);
    });
  });

  describe('validateBulkEmail', () => {
    it('should validate valid bulk email data', () => {
      const data = {
        recipients: ['test1@example.com', 'test2@example.com'],
        template: 'welcome',
        subject: 'Test Subject',
      };

      const result = validateBulkEmail(data);

      expect(result).toEqual(data);
    });

    it('should throw error for empty recipients array', () => {
      const data = {
        recipients: [],
        template: 'welcome',
        subject: 'Test',
      };

      expect(() => validateBulkEmail(data)).toThrow(AppError);
    });

    it('should throw error for too many recipients', () => {
      const data = {
        recipients: Array(101).fill('test@example.com'),
        template: 'welcome',
        subject: 'Test',
      };

      expect(() => validateBulkEmail(data)).toThrow(AppError);
    });

    it('should throw error for invalid email in recipients', () => {
      const data = {
        recipients: ['invalid-email'],
        template: 'welcome',
        subject: 'Test',
      };

      expect(() => validateBulkEmail(data)).toThrow(AppError);
    });
  });

  describe('validateRetryEmail', () => {
    it('should validate valid retry data', () => {
      const data = {
        emailId: 'email123',
      };

      const result = validateRetryEmail(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing emailId', () => {
      const data = {};

      expect(() => validateRetryEmail(data)).toThrow(AppError);
    });
  });

  describe('validateTemplateVariables', () => {
    it('should validate valid template variables', () => {
      const data = {
        userName: 'John',
        eventName: 'Test Event',
        date: '2024-01-01',
      };

      const result = validateTemplateVariables(data);

      expect(result).toEqual(data);
    });

    it('should validate partial variables', () => {
      const data = {
        userName: 'John',
      };

      const result = validateTemplateVariables(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid URL', () => {
      const data = {
        verificationUrl: 'not-a-url',
      };

      expect(() => validateTemplateVariables(data)).toThrow(AppError);
    });

    it('should throw error for invalid email', () => {
      const data = {
        supportEmail: 'not-an-email',
      };

      expect(() => validateTemplateVariables(data)).toThrow(AppError);
    });
  });

  describe('validateEmailQuery', () => {
    it('should validate valid query parameters', () => {
      const data = {
        limit: 25,
        offset: 0,
      };

      const result = validateEmailQuery(data);

      expect(result).toEqual(data);
    });

    it('should apply default values', () => {
      const data = {};

      const result = validateEmailQuery(data);

      expect(result).toEqual({
        limit: 50,
        offset: 0,
        batchSize: 10,
      });
    });

    it('should throw error for negative offset', () => {
      const data = {
        offset: -1,
      };

      expect(() => validateEmailQuery(data)).toThrow(AppError);
    });

    it('should throw error for limit too high', () => {
      const data = {
        limit: 101,
      };

      expect(() => validateEmailQuery(data)).toThrow(AppError);
    });
  });
});
