import {
  validateCreateEvent,
  validateUpdateEvent,
  validateSearchEvents,
  validateListEvents,
  validateEventsByTags,
  validateSetFeatured,
} from '../event.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Event Validators', () => {
  describe('validateCreateEvent', () => {
    it('should validate valid event data', () => {
      const validData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'music',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: '2099-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      const result = validateCreateEvent(validData);

      // Joi converts the ISO date string to a Date
      expect(result).toEqual({ ...validData, eventDate: new Date(validData.eventDate) });
    });

    it('should throw error for missing required fields', () => {
      const invalidData = {
        title: 'Test Event',
      };

      expect(() => validateCreateEvent(invalidData)).toThrow(AppError);
      expect(() => validateCreateEvent(invalidData)).toThrow('Validation failed');
    });

    it('should throw error for invalid category', () => {
      const invalidData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'invalid',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: '2099-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      expect(() => validateCreateEvent(invalidData)).toThrow(AppError);
    });

    it('should throw error for invalid stream type', () => {
      const invalidData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'music',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'invalid',
        eventDate: '2099-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      expect(() => validateCreateEvent(invalidData)).toThrow(AppError);
    });

    it('should throw error for past event date', () => {
      const invalidData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'music',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: '2020-12-31',
        eventTime: '20:00',
        capacity: 1000,
      };

      expect(() => validateCreateEvent(invalidData)).toThrow(AppError);
    });

    it('should throw error for invalid event time format', () => {
      const invalidData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'music',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: '2099-12-31',
        eventTime: '25:00',
        capacity: 1000,
      };

      expect(() => validateCreateEvent(invalidData)).toThrow(AppError);
    });

    it('should accept optional fields', () => {
      const validData = {
        title: 'Test Event',
        description: 'This is a test event description',
        category: 'music',
        country: 'US',
        city: 'New York',
        ticketPrice: 50,
        currency: 'USD',
        cameraType: '4K',
        streamType: 'live',
        eventDate: '2099-12-31',
        eventTime: '20:00',
        capacity: 1000,
        tags: ['music', 'live'],
        venue: 'Test Venue',
        thumbnail: 'https://firebasestorage.googleapis.com/v0/b/app/o/thumb.jpg',
        banner: 'https://firebasestorage.googleapis.com/v0/b/app/o/banner.jpg',
        language: 'en',
        ageRestriction: 18,
      };

      const result = validateCreateEvent(validData);

      // Joi converts the ISO date string to a Date
      expect(result).toEqual({ ...validData, eventDate: new Date(validData.eventDate) });
    });
  });

  describe('creator-supplied fields that must be rejected', () => {
    const base = {
      title: 'Test Event', description: 'A valid description for the event', category: 'sports', country: 'US', city: 'New York',
      ticketPrice: 10, currency: 'USD', cameraType: '4K', streamType: 'live', eventDate: '2099-12-31', eventTime: '20:00', capacity: 100,
    };
    it('does not let a creator self-feature an event', () => {
      expect(() => validateCreateEvent({ ...base, featured: true })).toThrow('Validation failed');
    });
    it('only accepts images hosted on approved storage hosts over https', () => {
      expect(() => validateCreateEvent({ ...base, thumbnail: 'https://example.com/x.jpg' })).toThrow('Validation failed');
      expect(() => validateCreateEvent({ ...base, thumbnail: 'http://firebasestorage.googleapis.com/x.jpg' })).toThrow('Validation failed');
      expect(() => validateCreateEvent({ ...base, banner: 'https://evilfirebasestorage.googleapis.com.attacker.io/x.jpg' })).toThrow('Validation failed');
      expect(() => validateCreateEvent({ ...base, thumbnail: 'https://firebasestorage.googleapis.com/v0/b/a/o/x.jpg' })).not.toThrow();
    });
    it('accepts the camera types used by the web client', () => {
      for (const cameraType of ['mobile', '180vr', '360vr']) {
        expect(() => validateCreateEvent({ ...base, cameraType })).not.toThrow();
      }
    });
  });

  describe('validateUpdateEvent', () => {
    it('should validate valid update data', () => {
      const validData = {
        title: 'Updated Event',
      };

      const result = validateUpdateEvent(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for empty update data', () => {
      const invalidData = {};

      expect(() => validateUpdateEvent(invalidData)).toThrow(AppError);
    });

    it('should throw error for invalid category', () => {
      const invalidData = {
        category: 'invalid',
      };

      expect(() => validateUpdateEvent(invalidData)).toThrow(AppError);
    });

    it('should accept multiple update fields', () => {
      const validData = {
        title: 'Updated Event',
        description: 'Updated description',
        ticketPrice: 75,
      };

      const result = validateUpdateEvent(validData);

      expect(result).toEqual(validData);
    });
  });

  describe('validateSearchEvents', () => {
    it('should validate valid search data', () => {
      const validData = {
        query: 'test',
        limit: 10,
      };

      const result = validateSearchEvents(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for missing query', () => {
      const invalidData = {
        limit: 10,
      };

      expect(() => validateSearchEvents(invalidData)).toThrow(AppError);
    });

    it('should throw error for short query', () => {
      const invalidData = {
        query: 't',
      };

      expect(() => validateSearchEvents(invalidData)).toThrow(AppError);
    });

    it('should use default limit when not provided', () => {
      const validData = {
        query: 'test',
      };

      const result = validateSearchEvents(validData);

      expect(result.limit).toBe(20);
    });
  });

  describe('validateListEvents', () => {
    it('should validate valid list data', () => {
      const validData = {
        limit: 10,
        offset: 0,
        status: 'scheduled',
        category: 'music',
      };

      const result = validateListEvents(validData);

      expect(result).toEqual(validData);
    });

    it('should use default values when not provided', () => {
      const validData = {};

      const result = validateListEvents(validData);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should throw error for invalid status', () => {
      const invalidData = {
        status: 'invalid',
      };

      expect(() => validateListEvents(invalidData)).toThrow(AppError);
    });

    it('should throw error for invalid category', () => {
      const invalidData = {
        category: 'invalid',
      };

      expect(() => validateListEvents(invalidData)).toThrow(AppError);
    });
  });

  describe('validateEventsByTags', () => {
    it('should validate valid tags data', () => {
      const validData = {
        tags: ['music', 'live'],
        limit: 10,
      };

      const result = validateEventsByTags(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for missing tags', () => {
      const invalidData = {
        limit: 10,
      };

      expect(() => validateEventsByTags(invalidData)).toThrow(AppError);
    });

    it('should throw error for empty tags array', () => {
      const invalidData = {
        tags: [],
      };

      expect(() => validateEventsByTags(invalidData)).toThrow(AppError);
    });

    it('should throw error for too many tags', () => {
      const invalidData = {
        tags: Array(11).fill('tag'),
      };

      expect(() => validateEventsByTags(invalidData)).toThrow(AppError);
    });

    it('should use default limit when not provided', () => {
      const validData = {
        tags: ['music'],
      };

      const result = validateEventsByTags(validData);

      expect(result.limit).toBe(20);
    });
  });

  describe('validateSetFeatured', () => {
    it('should validate valid featured data', () => {
      const validData = {
        featured: true,
      };

      const result = validateSetFeatured(validData);

      expect(result).toEqual(validData);
    });

    it('should throw error for missing featured field', () => {
      const invalidData = {};

      expect(() => validateSetFeatured(invalidData)).toThrow(AppError);
    });

    it('should accept false value', () => {
      const validData = {
        featured: false,
      };

      const result = validateSetFeatured(validData);

      expect(result).toEqual(validData);
    });
  });
});
