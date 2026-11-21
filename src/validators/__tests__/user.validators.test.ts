import { validateUpdateUserProfile, validateUsernameCheck, validateSearchUsers, validateListUsers, validateUpdateUserStatus, validateUpdateUserRole } from '../user.validators';
import { AppError } from '../../middleware/errorHandler';

describe('User Validators', () => {
  describe('validateUpdateUserProfile', () => {
    it('should validate valid profile update data', () => {
      const data = {
        displayName: 'John Doe',
        username: 'johndoe123',
        bio: 'A bio',
        avatar: 'https://example.com/avatar.jpg',
        banner: 'https://example.com/banner.jpg',
        language: 'en',
        country: 'US',
        socialLinks: {
          twitter: 'https://twitter.com/johndoe',
          instagram: 'https://instagram.com/johndoe',
        },
      };

      const result = validateUpdateUserProfile(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid username format', () => {
      const data = {
        username: 'invalid@username',
      };

      expect(() => validateUpdateUserProfile(data)).toThrow(AppError);
    });

    it('should throw error for invalid URL', () => {
      const data = {
        avatar: 'not-a-url',
      };

      expect(() => validateUpdateUserProfile(data)).toThrow(AppError);
    });

    it('should throw error for too short display name', () => {
      const data = {
        displayName: 'J',
      };

      expect(() => validateUpdateUserProfile(data)).toThrow(AppError);
    });

    it('should throw error for too long bio', () => {
      const data = {
        bio: 'a'.repeat(501),
      };

      expect(() => validateUpdateUserProfile(data)).toThrow(AppError);
    });
  });

  describe('validateUsernameCheck', () => {
    it('should validate valid username', () => {
      const data = {
        username: 'johndoe123',
      };

      const result = validateUsernameCheck(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing username', () => {
      const data = {};

      expect(() => validateUsernameCheck(data)).toThrow(AppError);
    });

    it('should throw error for invalid username format', () => {
      const data = {
        username: 'invalid@username',
      };

      expect(() => validateUsernameCheck(data)).toThrow(AppError);
    });

    it('should throw error for too short username', () => {
      const data = {
        username: 'ab',
      };

      expect(() => validateUsernameCheck(data)).toThrow(AppError);
    });

    it('should throw error for too long username', () => {
      const data = {
        username: 'a'.repeat(31),
      };

      expect(() => validateUsernameCheck(data)).toThrow(AppError);
    });
  });

  describe('validateSearchUsers', () => {
    it('should validate valid search data', () => {
      const data = {
        query: 'john',
        limit: 10,
      };

      const result = validateSearchUsers(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing query', () => {
      const data = {};

      expect(() => validateSearchUsers(data)).toThrow(AppError);
    });

    it('should throw error for too short query', () => {
      const data = {
        query: 'j',
      };

      expect(() => validateSearchUsers(data)).toThrow(AppError);
    });

    it('should throw error for invalid limit', () => {
      const data = {
        query: 'john',
        limit: 200,
      };

      expect(() => validateSearchUsers(data)).toThrow(AppError);
    });
  });

  describe('validateListUsers', () => {
    it('should validate valid list data', () => {
      const data = {
        limit: 10,
        offset: 0,
        status: 'active',
        role: 'viewer',
      };

      const result = validateListUsers(data);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid status', () => {
      const data = {
        status: 'invalid',
      };

      expect(() => validateListUsers(data)).toThrow(AppError);
    });

    it('should throw error for invalid role', () => {
      const data = {
        role: 'invalid',
      };

      expect(() => validateListUsers(data)).toThrow(AppError);
    });

    it('should throw error for negative offset', () => {
      const data = {
        offset: -1,
      };

      expect(() => validateListUsers(data)).toThrow(AppError);
    });
  });

  describe('validateUpdateUserStatus', () => {
    it('should validate valid status update', () => {
      const data = {
        status: 'suspended',
      };

      const result = validateUpdateUserStatus(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing status', () => {
      const data = {};

      expect(() => validateUpdateUserStatus(data)).toThrow(AppError);
    });

    it('should throw error for invalid status', () => {
      const data = {
        status: 'invalid',
      };

      expect(() => validateUpdateUserStatus(data)).toThrow(AppError);
    });
  });

  describe('validateUpdateUserRole', () => {
    it('should validate valid role update', () => {
      const data = {
        role: 'creator',
      };

      const result = validateUpdateUserRole(data);

      expect(result).toEqual(data);
    });

    it('should throw error for missing role', () => {
      const data = {};

      expect(() => validateUpdateUserRole(data)).toThrow(AppError);
    });

    it('should throw error for invalid role', () => {
      const data = {
        role: 'invalid',
      };

      expect(() => validateUpdateUserRole(data)).toThrow(AppError);
    });
  });
});
