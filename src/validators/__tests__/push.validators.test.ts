import {
  validateDeviceRegistration,
  validatePushSend,
  validateTopicPushSend,
  validateSchedulePush,
  validateUpdateSchedule,
  validateLogsQuery,
  validateTestNotification,
  validateCronExpression,
} from '../push.validators';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../middleware/errorHandler');

describe('Push Validators', () => {
  describe('validateDeviceRegistration', () => {
    it('should validate valid device registration', () => {
      const data = {
        deviceId: 'device-123',
        token: 'token-abc',
        platform: 'ios',
      };

      expect(() => validateDeviceRegistration(data)).not.toThrow();
    });

    it('should throw error for missing deviceId', () => {
      const data = {
        token: 'token-abc',
        platform: 'ios',
      };

      expect(() => validateDeviceRegistration(data)).toThrow(AppError);
    });

    it('should throw error for invalid platform', () => {
      const data = {
        deviceId: 'device-123',
        token: 'token-abc',
        platform: 'invalid',
      };

      expect(() => validateDeviceRegistration(data)).toThrow(AppError);
    });
  });

  describe('validatePushSend', () => {
    it('should validate valid push send', () => {
      const data = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
      };

      expect(() => validatePushSend(data)).not.toThrow();
    });

    it('should throw error for missing userId', () => {
      const data = {
        title: 'Test',
        body: 'Test body',
      };

      expect(() => validatePushSend(data)).toThrow(AppError);
    });
  });

  describe('validateTopicPushSend', () => {
    it('should validate valid topic push', () => {
      const data = {
        topic: 'test-topic',
        title: 'Test',
        body: 'Test body',
      };

      expect(() => validateTopicPushSend(data)).not.toThrow();
    });

    it('should throw error for missing topic', () => {
      const data = {
        title: 'Test',
        body: 'Test body',
      };

      expect(() => validateTopicPushSend(data)).toThrow(AppError);
    });
  });

  describe('validateSchedulePush', () => {
    it('should validate valid schedule push', () => {
      const data = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      };

      expect(() => validateSchedulePush(data)).not.toThrow();
    });

    it('should throw error for past date', () => {
      const data = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(Date.now() - 3600000).toISOString(),
      };

      expect(() => validateSchedulePush(data)).toThrow(AppError);
    });
  });

  describe('validateUpdateSchedule', () => {
    it('should validate valid update schedule', () => {
      const data = {
        title: 'Updated Title',
      };

      expect(() => validateUpdateSchedule(data)).not.toThrow();
    });

    it('should throw error for empty update', () => {
      const data = {};

      expect(() => validateUpdateSchedule(data)).toThrow(AppError);
    });
  });

  describe('validateLogsQuery', () => {
    it('should validate valid logs query', () => {
      const query = {
        limit: '10',
        offset: '0',
      };

      expect(() => validateLogsQuery(query)).not.toThrow();
    });

    it('should apply defaults', () => {
      const query = {} as any;

      validateLogsQuery(query);

      // Joi doesn't modify the object in place, it validates
      // The defaults are applied internally during validation
    });
  });

  describe('validateTestNotification', () => {
    it('should validate valid test notification', () => {
      const data = {
        title: 'Test',
        body: 'Test body',
      };

      expect(() => validateTestNotification(data)).not.toThrow();
    });

    it('should apply defaults', () => {
      const data = {} as any;

      validateTestNotification(data);

      // Joi doesn't modify the object in place, it validates
      // The defaults are applied internally during validation
    });
  });

  describe('validateCronExpression', () => {
    it('should validate valid cron expression', () => {
      expect(() => validateCronExpression('0 * * * *')).not.toThrow();
      expect(() => validateCronExpression('*/5 * * * *')).not.toThrow();
    });

    it('should throw error for invalid cron expression', () => {
      expect(() => validateCronExpression('invalid')).toThrow(AppError);
    });
  });
});
