import { UserService } from '../user.service';
import { UserRepository } from '../../repositories/user.repository';
import { User } from '../../types';

jest.mock('../../repositories/user.repository');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.getProfile('user123');

      expect(result).toEqual(mockUser);
      expect(UserRepository.findById).toHaveBeenCalledWith('user123');
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(UserService.getProfile('user123')).rejects.toThrow('User not found');
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.getPublicProfile('user123');

      expect(result).not.toHaveProperty('email');
      expect(result.username).toBe('testuser');
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(UserService.getPublicProfile('user123')).rejects.toThrow('User not found');
    });
  });

  describe('getPublicProfileByUsername', () => {
    it('should return public profile by username', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(mockUser);

      const result = await UserService.getPublicProfileByUsername('testuser');

      expect(result).not.toHaveProperty('email');
      expect(result.username).toBe('testuser');
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findByUsername as jest.Mock).mockResolvedValue(null);

      await expect(UserService.getPublicProfileByUsername('testuser')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = { ...mockUser, displayName: 'Updated User' };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);
      (UserRepository.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await UserService.updateProfile('user123', { displayName: 'Updated User' });

      expect(result.displayName).toBe('Updated User');
      expect(UserRepository.update).toHaveBeenCalledWith('user123', { displayName: 'Updated User' });
    });

    it('should throw error if username already taken', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserRepository.checkUsernameExists as jest.Mock).mockResolvedValue(true);

      await expect(UserService.updateProfile('user123', { username: 'newuser' })).rejects.toThrow('Username already taken');
    });

    it('should validate username format', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);

      await expect(UserService.updateProfile('user123', { username: 'invalid@username' })).rejects.toThrow('Username must be');
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available if username does not exist', async () => {
      (UserRepository.checkUsernameExists as jest.Mock).mockResolvedValue(false);

      const result = await UserService.checkUsernameAvailability('newuser');

      expect(result.available).toBe(true);
    });

    it('should return not available if username exists', async () => {
      (UserRepository.checkUsernameExists as jest.Mock).mockResolvedValue(true);

      const result = await UserService.checkUsernameAvailability('existinguser');

      expect(result.available).toBe(false);
    });

    it('should validate username format', async () => {
      await expect(UserService.checkUsernameAvailability('ab')).rejects.toThrow('Username must be');
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockUsers: User[] = [
        {
          id: 'user1',
          email: 'test1@example.com',
          username: 'testuser1',
          displayName: 'Test User 1',
          role: 'viewer',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (UserRepository.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

      const result = await UserService.searchUsers('test', 10);

      expect(result).toHaveLength(1);
      expect(UserRepository.searchUsers).toHaveBeenCalledWith('test', 10);
    });

    it('should throw error if query is too short', async () => {
      await expect(UserService.searchUsers('a', 10)).rejects.toThrow('Search query must be at least 2 characters');
    });
  });

  describe('listUsers', () => {
    it('should list users with filters', async () => {
      const mockUsers: User[] = [
        {
          id: 'user1',
          email: 'test1@example.com',
          username: 'testuser1',
          displayName: 'Test User 1',
          role: 'viewer',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (UserRepository.listUsers as jest.Mock).mockResolvedValue({ users: mockUsers, total: 1 });

      const result = await UserService.listUsers({ limit: 10, offset: 0, status: 'active' });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserRepository.delete as jest.Mock).mockResolvedValue(true);

      await UserService.deleteUser('user123');

      expect(UserRepository.delete).toHaveBeenCalledWith('user123');
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(UserService.deleteUser('user123')).rejects.toThrow('User not found');
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = { ...mockUser, status: 'suspended' as const };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserRepository.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await UserService.updateUserStatus('user123', 'suspended');

      expect(result.status).toBe('suspended');
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(UserService.updateUserStatus('user123', 'suspended')).rejects.toThrow('User not found');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = { ...mockUser, role: 'creator' as const };

      (UserRepository.findById as jest.Mock).mockResolvedValue(mockUser);
      (UserRepository.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await UserService.updateUserRole('user123', 'creator');

      expect(result.role).toBe('creator');
    });

    it('should throw error if user not found', async () => {
      (UserRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(UserService.updateUserRole('user123', 'creator')).rejects.toThrow('User not found');
    });
  });
});
