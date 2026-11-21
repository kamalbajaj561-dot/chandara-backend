import { CreatorService } from '../creator.service';
import { CreatorRepository } from '../../repositories/creator.repository';
import { UserRepository } from '../../repositories/user.repository';
import { Creator } from '../../types';

jest.mock('../../repositories/creator.repository');
jest.mock('../../repositories/user.repository');

describe('CreatorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return creator profile', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);

      const result = await CreatorService.getProfile('creator123');

      expect(result).toEqual(mockCreator);
      expect(CreatorRepository.findById).toHaveBeenCalledWith('creator123');
    });

    it('should throw error if creator not found', async () => {
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(CreatorService.getProfile('creator123')).rejects.toThrow('Creator not found');
    });
  });

  describe('getProfileByUserId', () => {
    it('should return creator profile by user ID', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findByUserId as jest.Mock).mockResolvedValue(mockCreator);

      const result = await CreatorService.getProfileByUserId('user123');

      expect(result).toEqual(mockCreator);
      expect(CreatorRepository.findByUserId).toHaveBeenCalledWith('user123');
    });

    it('should throw error if creator profile not found', async () => {
      (CreatorRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(CreatorService.getProfileByUserId('user123')).rejects.toThrow('Creator profile not found');
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);

      const result = await CreatorService.getPublicProfile('creator123');

      expect(result).not.toHaveProperty('verificationStatus');
      expect(result.username).toBe('testcreator');
    });

    it('should throw error if creator not found', async () => {
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(CreatorService.getPublicProfile('creator123')).rejects.toThrow('Creator not found');
    });
  });

  describe('createCreator', () => {
    it('should create creator profile', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator: Creator = {
        id: 'creator_user123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);
      (CreatorRepository.create as jest.Mock).mockResolvedValue(mockCreator);
      (UserRepository.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await CreatorService.createCreator('user123', {
        username: 'testcreator',
        displayName: 'Test Creator',
      });

      expect(result).toEqual(mockCreator);
      expect(UserRepository.update).toHaveBeenCalledWith('user123', { role: 'creator' });
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(CreatorService.createCreator('user123', { username: 'test', displayName: 'Test' })).rejects.toThrow('User not found');
    });

    it('should throw error if creator profile already exists', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findByUserId as jest.Mock).mockResolvedValue(mockCreator);

      await expect(CreatorService.createCreator('user123', { username: 'test', displayName: 'Test' })).rejects.toThrow('Creator profile already exists');
    });

    it('should throw error if username already taken', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(true);

      await expect(CreatorService.createCreator('user123', { username: 'test', displayName: 'Test' })).rejects.toThrow('Username already taken');
    });

    it('should validate username format', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);

      await expect(CreatorService.createCreator('user123', { username: 'invalid@', displayName: 'Test' })).rejects.toThrow('Username must be');
    });
  });

  describe('updateProfile', () => {
    it('should update creator profile', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCreator = { ...mockCreator, displayName: 'Updated Creator' };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);
      (CreatorRepository.update as jest.Mock).mockResolvedValue(updatedCreator);

      const result = await CreatorService.updateProfile('creator123', { displayName: 'Updated Creator' });

      expect(result.displayName).toBe('Updated Creator');
    });

    it('should throw error if username already taken', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(true);

      await expect(CreatorService.updateProfile('creator123', { username: 'newuser' })).rejects.toThrow('Username already taken');
    });
  });

  describe('deleteCreator', () => {
    it('should delete creator profile', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.delete as jest.Mock).mockResolvedValue(true);
      (UserRepository.update as jest.Mock).mockResolvedValue({ role: 'viewer' });

      await CreatorService.deleteCreator('creator123');

      expect(CreatorRepository.delete).toHaveBeenCalledWith('creator123');
      expect(UserRepository.update).toHaveBeenCalledWith('user123', { role: 'viewer' });
    });

    it('should throw error if creator not found', async () => {
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(CreatorService.deleteCreator('creator123')).rejects.toThrow('Creator not found');
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available if username does not exist', async () => {
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);

      const result = await CreatorService.checkUsernameAvailability('newuser');

      expect(result.available).toBe(true);
    });

    it('should return not available if username exists', async () => {
      (CreatorRepository.checkUsernameExists as jest.Mock).mockResolvedValue(true);

      const result = await CreatorService.checkUsernameAvailability('existinguser');

      expect(result.available).toBe(false);
    });
  });

  describe('searchCreators', () => {
    it('should search creators by query', async () => {
      const mockCreators: Creator[] = [
        {
          id: 'creator1',
          userId: 'user1',
          username: 'creator1',
          displayName: 'Creator 1',
          verified: false,
          verificationStatus: 'pending',
          featured: false,
          followersCount: 0,
          eventsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (CreatorRepository.searchCreators as jest.Mock).mockResolvedValue(mockCreators);

      const result = await CreatorService.searchCreators('creator', 10);

      expect(result).toHaveLength(1);
    });

    it('should throw error if query is too short', async () => {
      await expect(CreatorService.searchCreators('a', 10)).rejects.toThrow('Search query must be at least 2 characters');
    });
  });

  describe('listCreators', () => {
    it('should list creators with filters', async () => {
      const mockCreators: Creator[] = [
        {
          id: 'creator1',
          userId: 'user1',
          username: 'creator1',
          displayName: 'Creator 1',
          verified: false,
          verificationStatus: 'pending',
          featured: false,
          followersCount: 0,
          eventsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (CreatorRepository.listCreators as jest.Mock).mockResolvedValue({ creators: mockCreators, total: 1 });

      const result = await CreatorService.listCreators({ limit: 10, offset: 0, verified: true });

      expect(result.creators).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('submitVerificationRequest', () => {
    it('should submit verification request', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCreator = { ...mockCreator, verificationStatus: 'pending' as const };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.updateVerificationStatus as jest.Mock).mockResolvedValue(updatedCreator);

      const result = await CreatorService.submitVerificationRequest('creator123', {
        documentType: 'passport',
        documentNumber: '123456',
      });

      expect(result).toBeDefined();
      expect(CreatorRepository.updateVerificationStatus).toHaveBeenCalledWith(
        'creator123',
        'pending',
        expect.objectContaining({
          documentType: 'passport',
          documentNumber: '123456',
        })
      );
    });

    it('should throw error if creator already verified', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: true,
        verificationStatus: 'approved',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);

      await expect(CreatorService.submitVerificationRequest('creator123', { documentType: 'passport' })).rejects.toThrow('Creator is already verified');
    });
  });

  describe('approveVerificationRequest', () => {
    it('should approve verification request', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCreator = { ...mockCreator, verified: true, verificationStatus: 'approved' as const };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.updateVerificationStatus as jest.Mock).mockResolvedValue(updatedCreator);

      const result = await CreatorService.approveVerificationRequest('creator123', 'admin123');

      expect(result).toBeDefined();
      expect(CreatorRepository.updateVerificationStatus).toHaveBeenCalledWith(
        'creator123',
        'approved',
        expect.objectContaining({
          reviewedBy: 'admin123',
        })
      );
    });

    it('should throw error if creator already verified', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: true,
        verificationStatus: 'approved',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);

      await expect(CreatorService.approveVerificationRequest('creator123', 'admin123')).rejects.toThrow('Creator is already verified');
    });
  });

  describe('rejectVerificationRequest', () => {
    it('should reject verification request', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCreator = { ...mockCreator, verificationStatus: 'rejected' as const };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.updateVerificationStatus as jest.Mock).mockResolvedValue(updatedCreator);

      const result = await CreatorService.rejectVerificationRequest('creator123', 'admin123', 'Invalid document');

      expect(result).toBeDefined();
      expect(CreatorRepository.updateVerificationStatus).toHaveBeenCalledWith(
        'creator123',
        'rejected',
        expect.objectContaining({
          reviewedBy: 'admin123',
          rejectionReason: 'Invalid document',
        })
      );
    });

    it('should throw error if creator already verified', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: true,
        verificationStatus: 'approved',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);

      await expect(CreatorService.rejectVerificationRequest('creator123', 'admin123', 'Reason')).rejects.toThrow('Cannot reject an already verified creator');
    });
  });

  describe('setFeatured', () => {
    it('should set featured status', async () => {
      const mockCreator: Creator = {
        id: 'creator123',
        userId: 'user123',
        username: 'testcreator',
        displayName: 'Test Creator',
        verified: false,
        verificationStatus: 'pending',
        featured: false,
        followersCount: 0,
        eventsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCreator = { ...mockCreator, featured: true };

      (CreatorRepository.findById as jest.Mock).mockResolvedValue(mockCreator);
      (CreatorRepository.setFeatured as jest.Mock).mockResolvedValue(updatedCreator);

      const result = await CreatorService.setFeatured('creator123', true);

      expect(result.featured).toBe(true);
      expect(CreatorRepository.setFeatured).toHaveBeenCalledWith('creator123', true);
    });

    it('should throw error if creator not found', async () => {
      (CreatorRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(CreatorService.setFeatured('creator123', true)).rejects.toThrow('Creator not found');
    });
  });
});
