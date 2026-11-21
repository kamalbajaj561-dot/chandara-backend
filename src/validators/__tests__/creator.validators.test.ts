import { validateCreateCreator, validateUpdateCreatorProfile, validateCreatorUsernameCheck, validateSearchCreators, validateListCreators, validateSubmitVerificationRequest, validateRejectVerificationRequest, validateSetFeatured } from '../creator.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Creator Validators', () => {
  describe('validateCreateCreator', () => {
    it('should validate valid creator creation data', () => {
      const data = {
        username: 'creator123',
        displayName: 'Test Creator',
        bio: 'A bio',
        avatar: 'https://example.com/avatar.jpg',
        banner: 'https://example.com/banner.jpg',
        category: 'music',
        language: 'en',
        country: 'US',
        socialLinks: {
          twitter: 'https://twitter.com/creator',
          instagram: 'https://instagram.com/creator',
        },
      };

      const result = validateCreateCreator(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing username', () => {
      const data = {
        displayName: 'Test Creator',
      };

      expect(() => validateCreateCreator(data)).toThrow(AppError);
    });

    it('should throw error for missing displayName', () => {
      const data = {
        username: 'creator123',
      };

      expect(() => validateCreateCreator(data)).toThrow(AppError);
    });

    it('should throw error for invalid username format', () => {
      const data = {
        username: 'invalid@username',
        displayName: 'Test Creator',
      };

      expect(() => validateCreateCreator(data)).toThrow(AppError);
    });

    it('should throw error for too short displayName', () => {
      const data = {
        username: 'creator123',
        displayName: 'T',
      };

      expect(() => validateCreateCreator(data)).toThrow(AppError);
    });
  });

  describe('validateUpdateCreatorProfile', () => {
    it('should validate valid profile update data', () => {
      const data = {
        displayName: 'Updated Creator',
        bio: 'Updated bio',
        avatar: 'https://example.com/new-avatar.jpg',
        category: 'gaming',
      };

      const result = validateUpdateCreatorProfile(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid username format', () => {
      const data = {
        username: 'invalid@username',
      };

      expect(() => validateUpdateCreatorProfile(data)).toThrow(AppError);
    });

    it('should throw error for invalid URL', () => {
      const data = {
        avatar: 'not-a-url',
      };

      expect(() => validateUpdateCreatorProfile(data)).toThrow(AppError);
    });
  });

  describe('validateCreatorUsernameCheck', () => {
    it('should validate valid username', () => {
      const data = {
        username: 'creator123',
      };

      const result = validateCreatorUsernameCheck(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing username', () => {
      const data = {};

      expect(() => validateCreatorUsernameCheck(data)).toThrow(AppError);
    });

    it('should throw error for invalid username format', () => {
      const data = {
        username: 'invalid@username',
      };

      expect(() => validateCreatorUsernameCheck(data)).toThrow(AppError);
    });

    it('should throw error for too short username', () => {
      const data = {
        username: 'ab',
      };

      expect(() => validateCreatorUsernameCheck(data)).toThrow(AppError);
    });
  });

  describe('validateSearchCreators', () => {
    it('should validate valid search data', () => {
      const data = {
        query: 'music',
        limit: 10,
      };

      const result = validateSearchCreators(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing query', () => {
      const data = {};

      expect(() => validateSearchCreators(data)).toThrow(AppError);
    });

    it('should throw error for too short query', () => {
      const data = {
        query: 'm',
      };

      expect(() => validateSearchCreators(data)).toThrow(AppError);
    });

    it('should throw error for invalid limit', () => {
      const data = {
        query: 'music',
        limit: 200,
      };

      expect(() => validateSearchCreators(data)).toThrow(AppError);
    });
  });

  describe('validateListCreators', () => {
    it('should validate valid list data', () => {
      const data = {
        limit: 10,
        offset: 0,
        verified: true,
        featured: false,
        category: 'music',
      };

      const result = validateListCreators(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid category', () => {
      const data = {
        category: 'invalid',
      };

      expect(() => validateListCreators(data)).toThrow(AppError);
    });

    it('should throw error for negative offset', () => {
      const data = {
        offset: -1,
      };

      expect(() => validateListCreators(data)).toThrow(AppError);
    });
  });

  describe('validateSubmitVerificationRequest', () => {
    it('should validate valid verification request', () => {
      const data = {
        documentType: 'passport',
        documentNumber: '123456789',
        additionalInfo: 'Additional information',
      };

      const result = validateSubmitVerificationRequest(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing documentType', () => {
      const data = {};

      expect(() => validateSubmitVerificationRequest(data)).toThrow(AppError);
    });

    it('should throw error for invalid documentType', () => {
      const data = {
        documentType: 'invalid',
      };

      expect(() => validateSubmitVerificationRequest(data)).toThrow(AppError);
    });

    it('should throw error for too long additionalInfo', () => {
      const data = {
        documentType: 'passport',
        additionalInfo: 'a'.repeat(1001),
      };

      expect(() => validateSubmitVerificationRequest(data)).toThrow(AppError);
    });
  });

  describe('validateRejectVerificationRequest', () => {
    it('should validate valid rejection data', () => {
      const data = {
        rejectionReason: 'Invalid document',
      };

      const result = validateRejectVerificationRequest(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing rejectionReason', () => {
      const data = {};

      expect(() => validateRejectVerificationRequest(data)).toThrow(AppError);
    });

    it('should throw error for too short rejectionReason', () => {
      const data = {
        rejectionReason: 'a',
      };

      expect(() => validateRejectVerificationRequest(data)).toThrow(AppError);
    });

    it('should throw error for too long rejectionReason', () => {
      const data = {
        rejectionReason: 'a'.repeat(501),
      };

      expect(() => validateRejectVerificationRequest(data)).toThrow(AppError);
    });
  });

  describe('validateSetFeatured', () => {
    it('should validate valid featured data', () => {
      const data = {
        featured: true,
      };

      const result = validateSetFeatured(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing featured', () => {
      const data = {};

      expect(() => validateSetFeatured(data)).toThrow(AppError);
    });

    it('should throw error for non-boolean featured', () => {
      const data = {
        featured: 'true',
      };

      expect(() => validateSetFeatured(data)).toThrow(AppError);
    });
  });
});
