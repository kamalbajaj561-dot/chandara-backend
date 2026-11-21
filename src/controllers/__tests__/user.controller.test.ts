import { Request, Response, NextFunction } from 'express';
import { UserController } from '../user.controller';
import { UserService } from '../../services/user.service';
import { AppError } from '../../middleware/errorHandler';
import { User } from '../../types';

jest.mock('../../services/user.service');

describe('UserController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: { userId: 'user123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 },
      params: {},
      query: {},
      body: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
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

      (UserService.getProfile as jest.Mock).mockResolvedValue(mockUser);

      await UserController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should call next with error if user not authenticated', async () => {
      mockRequest.user = undefined;

      await UserController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call next with error if service fails', async () => {
      (UserService.getProfile as jest.Mock).mockRejectedValue(new AppError('User not found', 404));

      await UserController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getPublicProfile', () => {
    it('should return public user profile', async () => {
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

      mockRequest.params = { userId: 'user123' };
      (UserService.getPublicProfile as jest.Mock).mockResolvedValue(mockUser);

      await UserController.getPublicProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should call next with error if service fails', async () => {
      mockRequest.params = { userId: 'user123' };
      (UserService.getPublicProfile as jest.Mock).mockRejectedValue(new AppError('User not found', 404));

      await UserController.getPublicProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getPublicProfileByUsername', () => {
    it('should return public user profile by username', async () => {
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

      mockRequest.params = { username: 'testuser' };
      (UserService.getPublicProfileByUsername as jest.Mock).mockResolvedValue(mockUser);

      await UserController.getPublicProfileByUsername(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Updated User',
        role: 'viewer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = { displayName: 'Updated User' };
      (UserService.updateProfile as jest.Mock).mockResolvedValue(mockUser);

      await UserController.updateProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'Profile updated successfully',
      });
    });

    it('should call next with error if user not authenticated', async () => {
      mockRequest.user = undefined;

      await UserController.updateProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return username availability', async () => {
      mockRequest.params = { username: 'testuser' };
      (UserService.checkUsernameAvailability as jest.Mock).mockResolvedValue({ available: true });

      await UserController.checkUsernameAvailability(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { available: true },
      });
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
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

      mockRequest.query = { query: 'test', limit: '10' };
      (UserService.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

      await UserController.searchUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
      });
    });
  });

  describe('listUsers', () => {
    it('should list users', async () => {
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

      mockRequest.query = { limit: '10', offset: '0' };
      (UserService.listUsers as jest.Mock).mockResolvedValue({ users: mockUsers, total: 1 });

      await UserController.listUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockUsers,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        }),
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockRequest.params = { userId: 'user123' };
      (UserService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await UserController.deleteUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
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
        status: 'suspended',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { userId: 'user123' };
      mockRequest.body = { status: 'suspended' };
      (UserService.updateUserStatus as jest.Mock).mockResolvedValue(mockUser);

      await UserController.updateUserStatus(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User status updated successfully',
      });
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const mockUser: User = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'creator',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.params = { userId: 'user123' };
      mockRequest.body = { role: 'creator' };
      (UserService.updateUserRole as jest.Mock).mockResolvedValue(mockUser);

      await UserController.updateUserRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
        message: 'User role updated successfully',
      });
    });
  });
});
