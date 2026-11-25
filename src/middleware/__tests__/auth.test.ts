import { authMiddleware, requireRole } from '../auth';
import { AppError } from '../errorHandler';
import { getAuth, getFirestore } from '../../services/firebase';

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should throw error if no token provided', async () => {
      mockReq.headers.authorization = undefined;

      await authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should throw error if token is malformed', async () => {
      mockReq.headers.authorization = 'Bearer';

      await authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should throw error if token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      const mockAuth = {
        verifyIdToken: jest.fn().mockRejectedValue(new Error('Invalid token')),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);

      await authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should set user on request if token is valid', async () => {
      const mockAuth = {
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'test-user-id',
          email: 'test@example.com',
          iat: 1234567890,
          exp: 1234567900,
        }),
      };

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          role: 'viewer',
          status: 'active',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      mockReq.headers.authorization = 'Bearer valid-firebase-token';

      await authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.userId).toBe('test-user-id');
      expect(mockReq.user.role).toBe('viewer');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw error if user is suspended', async () => {
      const mockAuth = {
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'test-user-id',
          email: 'test@example.com',
        }),
      };

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          role: 'viewer',
          status: 'suspended',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      mockReq.headers.authorization = 'Bearer valid-firebase-token';

      await authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should throw error if user is banned', async () => {
      const mockAuth = {
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'test-user-id',
          email: 'test@example.com',
        }),
      };

      const mockUserDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({
          role: 'viewer',
          status: 'banned',
        }),
      };

      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUserDoc),
      };

      (getAuth as jest.Mock).mockReturnValue(mockAuth);
      (getFirestore as jest.Mock).mockReturnValue(mockDb);

      mockReq.headers.authorization = 'Bearer valid-firebase-token';

      await authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('requireRole', () => {
    it('should throw error if user is not authenticated', () => {
      mockReq.user = undefined;
      const middleware = requireRole('administrator');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should throw error if user role is not allowed', () => {
      mockReq.user = { role: 'viewer' };
      const middleware = requireRole('administrator');

      middleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should call next if user has required role', () => {
      mockReq.user = { role: 'administrator' };
      const middleware = requireRole('administrator');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next if user has one of multiple allowed roles', () => {
      mockReq.user = { role: 'creator' };
      const middleware = requireRole('administrator', 'creator');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
