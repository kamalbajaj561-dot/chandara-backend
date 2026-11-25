import { Request, Response, NextFunction } from 'express';
import { sanitizeBody, sanitizeQuery, sanitizeParams, preventNoSQLInjection } from '../sanitizer';
import { authMiddleware, requireRole } from '../auth';
import { AppError } from '../errorHandler';

describe('Security Middleware Tests', () => {
  describe('Input Sanitization Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        body: {},
        query: {},
        params: {},
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    describe('sanitizeBody', () => {
      it('should sanitize XSS in body strings', () => {
        mockReq.body = {
          name: '<script>alert("xss")</script>',
          description: 'Test <img src=x onerror=alert(1)>',
        };

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        // Tags are stripped entirely: no <script>/<img> can survive.
        expect(mockReq.body.name).toBe('alert("xss")');
        expect(mockReq.body.name).not.toMatch(/</);
        expect(mockReq.body.description).toBe('Test');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should remove prototype pollution keys', () => {
        // JSON.parse creates real own properties named __proto__/constructor
        mockReq.body = JSON.parse(
          '{"name":"test","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'
        );

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        expect(Object.keys(mockReq.body)).toEqual(['name']);
        expect(Object.prototype.hasOwnProperty.call(mockReq.body, '__proto__')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(mockReq.body, 'constructor')).toBe(false);
        expect(({} as any).polluted).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle nested objects', () => {
        mockReq.body = {
          user: {
            name: '<script>alert("xss")</script>',
            email: 'test@example.com',
          },
        };

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.user.name).toBe('alert("xss")');
        expect(mockReq.body.user.email).toBe('test@example.com');
      });

      it('should handle arrays', () => {
        mockReq.body = {
          tags: ['<script>alert(1)</script>', 'normal', '<img src=x onerror=alert(1)>'],
        };

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.tags[0]).toBe('alert(1)');
        expect(mockReq.body.tags[1]).toBe('normal');
        expect(mockReq.body.tags[2]).toBe('');
      });
    });

    describe('sanitizeQuery', () => {
      it('should sanitize query parameters', () => {
        mockReq.query = {
          search: '<script>alert("xss")</script>',
          filter: 'test',
        };

        sanitizeQuery(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query.search).toBe('alert("xss")');
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('sanitizeParams', () => {
      it('should sanitize route parameters', () => {
        mockReq.params = {
          id: '<script>alert("xss")</script>',
        };

        sanitizeParams(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.params.id).toBe('alert("xss")');
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('preventNoSQLInjection', () => {
      it('should block NoSQL injection attempts', () => {
        mockReq.body = {
          $where: 'this.password == "admin"',
          $ne: null,
        };

        preventNoSQLInjection(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });

      it('should allow safe requests', () => {
        mockReq.body = {
          name: 'test',
          email: 'test@example.com',
        };

        preventNoSQLInjection(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication Security Tests', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        headers: {},
        user: undefined,
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    describe('authMiddleware', () => {
      const firebase = require('../../services/firebase');
      const mockUserDoc = (data: any | null) => ({
        collection: () => ({ doc: () => ({ get: async () => ({ exists: data !== null, data: () => data }) }) }),
      });
      const withFirebase = (verifyIdToken: jest.Mock, userData: any | null) => {
        firebase.getAuth.mockReturnValue({ verifyIdToken });
        firebase.getFirestore.mockReturnValue(mockUserDoc(userData));
      };
      const nextError = () => (mockNext as jest.Mock).mock.calls[0][0];

      it('rejects requests without a token via next(401) and never throws', async () => {
        mockReq.headers = {};
        await expect(authMiddleware(mockReq as Request, mockRes as Response, mockNext)).resolves.toBeUndefined();
        expect(nextError()).toBeInstanceOf(AppError);
        expect(nextError().statusCode).toBe(401);
      });

      it('rejects a malformed Authorization header', async () => {
        mockReq.headers = { authorization: 'InvalidFormat token' };
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError().statusCode).toBe(401);
      });

      it('rejects an invalid/expired Firebase token with 401', async () => {
        withFirebase(jest.fn().mockRejectedValue(new Error('expired')), { role: 'user' });
        mockReq.headers = { authorization: 'Bearer bad' };
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError().statusCode).toBe(401);
      });

      it('rejects tokens whose user has no Firestore record', async () => {
        withFirebase(jest.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.c' }), null);
        mockReq.headers = { authorization: 'Bearer ok' };
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError().statusCode).toBe(404);
        expect(mockReq.user).toBeUndefined();
      });

      it('rejects suspended users with 403', async () => {
        withFirebase(jest.fn().mockResolvedValue({ uid: 'u1' }), { role: 'user', status: 'suspended' });
        mockReq.headers = { authorization: 'Bearer ok' };
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError().statusCode).toBe(403);
      });

      it('rejects banned users with 403', async () => {
        withFirebase(jest.fn().mockResolvedValue({ uid: 'u1' }), { role: 'user', status: 'banned' });
        mockReq.headers = { authorization: 'Bearer ok' };
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(nextError().statusCode).toBe(403);
      });

      it('accepts a valid user, normalizes the role and exposes userId and id', async () => {
        withFirebase(jest.fn().mockResolvedValue({ uid: 'u1', email: 'a@b.c' }), { role: 'admin', status: 'active' });
        mockReq.headers = { authorization: 'Bearer ok' };
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();
        expect(mockReq.user).toMatchObject({ userId: 'u1', id: 'u1', role: 'administrator' });
      });
    });

    describe('requireRole', () => {
      it('should allow users with correct role', () => {
        mockReq.user = {
          userId: 'test_user',
          email: 'test@example.com',
          role: 'administrator',
          type: 'access',
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };

        const middleware = requireRole('administrator');
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject users with incorrect role', () => {
        mockReq.user = {
          userId: 'test_user',
          email: 'test@example.com',
          role: 'viewer',
          type: 'access',
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };

        const middleware = requireRole('administrator');
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
      });

      it('should reject unauthenticated users', () => {
        mockReq.user = undefined;

        const middleware = requireRole('administrator');
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
      });
    });
  });

  describe('Error Handling Security Tests', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        path: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: jest.fn(),
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('should generate unique error IDs', () => {
      const error1 = new AppError('Test error', 500);
      const error2 = new AppError('Test error', 500);

      expect(error1.errorId).toBeDefined();
      expect(error2.errorId).toBeDefined();
      expect(error1.errorId).not.toBe(error2.errorId);
    });

    it('should hide stack traces in production', () => {
      const error = new AppError('Test error', 500);
      mockReq = { path: '/test', method: 'GET', ip: '127.0.0.1', get: jest.fn() } as Partial<Request>;

      // Mock production environment
      process.env.NODE_ENV = 'production';

      const errorHandler = require('../errorHandler').errorHandler;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const body = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(body).toMatchObject({ success: false, error: 'Test error' });
      // Never leak stack traces or internals to clients
      expect(body).not.toHaveProperty('stack');
      expect(JSON.stringify(body)).not.toMatch(/at .*\.ts:\d+/);
    });
  });

  describe('Security Configuration Tests', () => {
    it('should have secure CSP directives', () => {
      const config = require('../../config').default;

      expect(config.security).toBeDefined();
      expect(config.security.csp).toBeDefined();
      expect(config.security.csp.defaultSrc).toContain("'self'");
    });

    it('should have CORS whitelist configured', () => {
      const config = require('../../config').default;

      expect(config.cors).toBeDefined();
      expect(config.cors.origin).toBeDefined();
      expect(Array.isArray(config.cors.origin)).toBe(true);
    });

    it('should have rate limiting configured', () => {
      const config = require('../../config').default;

      expect(config.rateLimit).toBeDefined();
      expect(config.rateLimit.windowMs).toBeGreaterThan(0);
      expect(config.rateLimit.maxRequests).toBeGreaterThan(0);
    });
  });
});
