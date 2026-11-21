import {
  validateStartStream,
  validateStopStream,
  validateTokenRequest,
  validateUpdateViewers,
  validateUpdateHealth,
  validateJoinStream,
} from '../stream.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Stream Validators', () => {
  describe('validateStartStream', () => {
    it('should validate valid start stream data', () => {
      const validData = {
        recordingEnabled: true,
      };

      const result = validateStartStream(validData);

      expect(result).toEqual(validData);
    });

    it('should use default value for recordingEnabled', () => {
      const validData = {};

      const result = validateStartStream(validData);

      expect(result.recordingEnabled).toBe(false);
    });

    it('should throw error for invalid recordingEnabled type', () => {
      const invalidData = {
        recordingEnabled: 'true',
      };

      expect(() => validateStartStream(invalidData)).toThrow(AppError);
    });
  });

  describe('validateStopStream', () => {
    it('should validate empty stop stream data', () => {
      const validData = {};

      const result = validateStopStream(validData);

      expect(result).toEqual(validData);
    });
  });

  describe('validateTokenRequest', () => {
    it('should validate valid token request', () => {
      const validData = {
        role: 'publisher',
      };

      const result = validateTokenRequest(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for missing role', () => {
      const invalidData = {};

      expect(() => validateTokenRequest(invalidData)).toThrow(AppError);
    });

    it('should throw error for invalid role', () => {
      const invalidData = {
        role: 'invalid',
      };

      expect(() => validateTokenRequest(invalidData)).toThrow(AppError);
    });

    it('should accept subscriber role', () => {
      const validData = {
        role: 'subscriber',
      };

      const result = validateTokenRequest(validData);

      expect(result).toEqual(validData);
    });

    it('should accept moderator role', () => {
      const validData = {
        role: 'moderator',
      };

      const result = validateTokenRequest(validData);

      expect(result).toEqual(validData);
    });
  });

  describe('validateUpdateViewers', () => {
    it('should validate valid viewer update', () => {
      const validData = {
        delta: 10,
      };

      const result = validateUpdateViewers(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for missing delta', () => {
      const invalidData = {};

      expect(() => validateUpdateViewers(invalidData)).toThrow(AppError);
    });

    it('should throw error for non-integer delta', () => {
      const invalidData = {
        delta: 10.5,
      };

      expect(() => validateUpdateViewers(invalidData)).toThrow(AppError);
    });

    it('should throw error for delta below minimum', () => {
      const invalidData = {
        delta: -1001,
      };

      expect(() => validateUpdateViewers(invalidData)).toThrow(AppError);
    });

    it('should throw error for delta above maximum', () => {
      const invalidData = {
        delta: 1001,
      };

      expect(() => validateUpdateViewers(invalidData)).toThrow(AppError);
    });

    it('should accept negative delta within range', () => {
      const validData = {
        delta: -500,
      };

      const result = validateUpdateViewers(validData);

      expect(result).toEqual(validData);
    });
  });

  describe('validateUpdateHealth', () => {
    it('should validate valid health update with publisherConnected', () => {
      const validData = {
        publisherConnected: true,
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });

    it('should validate valid health update with roomExists', () => {
      const validData = {
        roomExists: false,
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });

    it('should validate valid health update with viewerCount', () => {
      const validData = {
        viewerCount: 100,
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });

    it('should validate valid health update with reconnectAttempts', () => {
      const validData = {
        reconnectAttempts: 5,
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });

    it('should validate valid health update with liveKitAvailable', () => {
      const validData = {
        liveKitAvailable: true,
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });

    it('should validate valid health update with health status', () => {
      const validData = {
        health: 'warning',
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for invalid health status', () => {
      const invalidData = {
        health: 'invalid',
      };

      expect(() => validateUpdateHealth(invalidData)).toThrow(AppError);
    });

    it('should throw error for negative viewerCount', () => {
      const invalidData = {
        viewerCount: -1,
      };

      expect(() => validateUpdateHealth(invalidData)).toThrow(AppError);
    });

    it('should throw error for negative reconnectAttempts', () => {
      const invalidData = {
        reconnectAttempts: -1,
      };

      expect(() => validateUpdateHealth(invalidData)).toThrow(AppError);
    });

    it('should throw error for empty object', () => {
      const invalidData = {};

      expect(() => validateUpdateHealth(invalidData)).toThrow(AppError);
    });

    it('should accept multiple fields', () => {
      const validData = {
        publisherConnected: true,
        viewerCount: 100,
        health: 'healthy',
      };

      const result = validateUpdateHealth(validData);

      expect(result).toEqual(validData);
    });
  });

  describe('validateJoinStream', () => {
    it('should validate valid join stream data', () => {
      const validData = {
        role: 'subscriber',
      };

      const result = validateJoinStream(validData);

      expect(result).toEqual(validData);
    });

    it('should use default role when not provided', () => {
      const validData = {};

      const result = validateJoinStream(validData);

      expect(result.role).toBe('subscriber');
    });

    it('should throw error for invalid role', () => {
      const invalidData = {
        role: 'publisher',
      };

      expect(() => validateJoinStream(invalidData)).toThrow(AppError);
    });

    it('should accept moderator role', () => {
      const validData = {
        role: 'moderator',
      };

      const result = validateJoinStream(validData);

      expect(result).toEqual(validData);
    });
  });
});
