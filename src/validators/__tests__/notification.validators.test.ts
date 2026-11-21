import {
  validateCreateNotification,
  validateUpdateNotification,
  validateNotificationPreferences,
  validateBulkNotifications,
  validateNotificationQuery,
} from '../notification.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Notification Validators', () => {
  describe('validateCreateNotification', () => {
    it('should validate valid notification data', () => {
      const data = {
        targetUserId: 'user123',
        type: 'EVENT',
        title: 'Test Notification',
        message: 'This is a test message',
        data: { key: 'value' },
        priority: 'normal',
      };

      const result = validateCreateNotification(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid type', () => {
      const data = {
        type: 'INVALID_TYPE',
        title: 'Test',
        message: 'Test message',
      };

      expect(() => validateCreateNotification(data)).toThrow(AppError);
      expect(() => validateCreateNotification(data)).toThrow('Validation failed');
    });

    it('should throw error for missing title', () => {
      const data = {
        type: 'EVENT',
        message: 'Test message',
      };

      expect(() => validateCreateNotification(data)).toThrow(AppError);
    });

    it('should throw error for missing message', () => {
      const data = {
        type: 'EVENT',
        title: 'Test',
      };

      expect(() => validateCreateNotification(data)).toThrow(AppError);
    });

    it('should throw error for invalid priority', () => {
      const data = {
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        priority: 'invalid',
      };

      expect(() => validateCreateNotification(data)).toThrow(AppError);
    });

    it('should throw error for expired expiresAt', () => {
      const data = {
        type: 'EVENT',
        title: 'Test',
        message: 'Test message',
        expiresAt: new Date('2020-01-01'),
      };

      expect(() => validateCreateNotification(data)).toThrow(AppError);
    });
  });

  describe('validateUpdateNotification', () => {
    it('should validate valid update data', () => {
      const data = {
        title: 'Updated Title',
        message: 'Updated message',
        priority: 'high',
      };

      const result = validateUpdateNotification(data);

      expect(result).toEqual(data);
    });

    it('should validate partial update data', () => {
      const data = {
        title: 'Updated Title',
      };

      const result = validateUpdateNotification(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid priority', () => {
      const data = {
        priority: 'invalid',
      };

      expect(() => validateUpdateNotification(data)).toThrow(AppError);
    });

    it('should throw error for invalid data type', () => {
      const data = {
        data: 'not an object',
      };

      expect(() => validateUpdateNotification(data)).toThrow(AppError);
    });
  });

  describe('validateNotificationPreferences', () => {
    it('should validate valid preferences data', () => {
      const data = {
        inAppEnabled: true,
        eventNotifications: true,
        streamNotifications: false,
        chatNotifications: true,
        ticketNotifications: true,
        paymentNotifications: true,
        creatorNotifications: true,
        adminNotifications: true,
        language: 'en',
        timezone: 'UTC',
      };

      const result = validateNotificationPreferences(data);

      expect(result).toEqual(data);
    });

    it('should validate partial preferences data', () => {
      const data = {
        inAppEnabled: false,
        language: 'es',
      };

      const result = validateNotificationPreferences(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid language format', () => {
      const data = {
        language: 'english',
      };

      expect(() => validateNotificationPreferences(data)).toThrow(AppError);
    });

    it('should throw error for invalid boolean field', () => {
      const data = {
        inAppEnabled: 'yes',
      };

      expect(() => validateNotificationPreferences(data)).toThrow(AppError);
    });
  });

  describe('validateBulkNotifications', () => {
    it('should validate valid bulk notifications data', () => {
      const data = {
        notifications: [
          {
            userId: 'user123',
            type: 'EVENT',
            title: 'Test 1',
            message: 'Message 1',
          },
          {
            userId: 'user456',
            type: 'STREAM',
            title: 'Test 2',
            message: 'Message 2',
          },
        ],
      };

      const result = validateBulkNotifications(data);

      expect(result).toEqual(data);
    });

    it('should throw error for empty notifications array', () => {
      const data = {
        notifications: [],
      };

      expect(() => validateBulkNotifications(data)).toThrow(AppError);
    });

    it('should throw error for missing notifications array', () => {
      const data = {};

      expect(() => validateBulkNotifications(data)).toThrow(AppError);
    });

    it('should throw error for too many notifications', () => {
      const data = {
        notifications: Array(101).fill({
          userId: 'user123',
          type: 'EVENT',
          title: 'Test',
          message: 'Message',
        }),
      };

      expect(() => validateBulkNotifications(data)).toThrow(AppError);
    });

    it('should throw error for invalid notification in array', () => {
      const data = {
        notifications: [
          {
            userId: 'user123',
            type: 'INVALID_TYPE',
            title: 'Test',
            message: 'Message',
          },
        ],
      };

      expect(() => validateBulkNotifications(data)).toThrow(AppError);
    });

    it('should throw error for missing userId in notification', () => {
      const data = {
        notifications: [
          {
            type: 'EVENT',
            title: 'Test',
            message: 'Message',
          },
        ],
      };

      expect(() => validateBulkNotifications(data)).toThrow(AppError);
    });
  });

  describe('validateNotificationQuery', () => {
    it('should validate valid query parameters', () => {
      const data = {
        limit: 25,
        offset: 0,
        type: 'EVENT',
        priority: 'high',
      };

      const result = validateNotificationQuery(data);

      expect(result).toEqual(data);
    });

    it('should validate empty query parameters', () => {
      const data = {};

      const result = validateNotificationQuery(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid limit', () => {
      const data = {
        limit: 150,
      };

      expect(() => validateNotificationQuery(data)).toThrow(AppError);
    });

    it('should throw error for negative offset', () => {
      const data = {
        offset: -1,
      };

      expect(() => validateNotificationQuery(data)).toThrow(AppError);
    });

    it('should throw error for invalid type', () => {
      const data = {
        type: 'INVALID_TYPE',
      };

      expect(() => validateNotificationQuery(data)).toThrow(AppError);
    });

    it('should throw error for invalid priority', () => {
      const data = {
        priority: 'invalid',
      };

      expect(() => validateNotificationQuery(data)).toThrow(AppError);
    });
  });
});
