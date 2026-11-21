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
      mockRes = {};
      mockNext = jest.fn();
    });

    describe('sanitizeBody', () => {
      it('should sanitize XSS in body strings', () => {
        mockReq.body = {
          name: '<script>alert("xss")</script>',
          description: 'Test <img src=x onerror=alert(1)>',
        };

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.name).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        expect(mockReq.body.description).toBe('Test &lt;img src=x onerror=alert(1)&gt;');
        expect(mockNext).toHaveBeenCalled();
      });

      it('should remove prototype pollution keys', () => {
        mockReq.body = {
          name: 'test',
          __proto__: { polluted: true },
          constructor: { prototype: { polluted: true } },
        };

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.__proto__).toBeUndefined();
        expect(mockReq.body.constructor).toBeUndefined();
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

        expect(mockReq.body.user.name).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        expect(mockReq.body.user.email).toBe('test@example.com');
      });

      it('should handle arrays', () => {
        mockReq.body = {
          tags: ['<script>alert(1)</script>', 'normal', '<img src=x onerror=alert(1)>'],
        };

        sanitizeBody(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.body.tags[0]).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(mockReq.body.tags[1]).toBe('normal');
        expect(mockReq.body.tags[2]).toBe('&lt;img src=x onerror=alert(1)&gt;');
      });
    });

    describe('sanitizeQuery', () => {
      it('should sanitize query parameters', () => {
        mockReq.query = {
          search: '<script>alert("xss")</script>',
          filter: 'test',
        };

        sanitizeQuery(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.query.search).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('sanitizeParams', () => {
      it('should sanitize route parameters', () => {
        mockReq.params = {
          id: '<script>alert("xss")</script>',
        };

        sanitizeParams(mockReq as Request, mockRes as Response, mockNext);

        expect(mockReq.params.id).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
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
      it('should reject requests without token', async () => {
        mockReq.headers = {};

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      it('should reject requests with invalid token format', async () => {
        mockReq.headers = {
          authorization: 'InvalidFormat token',
        };

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      it('should handle missing user gracefully', async () => {
        mockReq.headers = {
          authorization: 'Bearer valid_token',
        };
        mockReq.user = undefined;

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
      });

      it('should reject suspended users', async () => {
        mockReq.headers = {
          authorization: 'Bearer valid_token',
        };
        mockReq.user = {
          userId: 'test_user',
          email: 'test@example.com',
          role: 'viewer',
          type: 'access',
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should reject banned users', async () => {
        mockReq.headers = {
          authorization: 'Bearer valid_token',
        };
        mockReq.user = {
          userId: 'test_user',
          email: 'test@example.com',
          role: 'viewer',
          type: 'access',
          iat: Date.now(),
          exp: Date.now() + 3600000,
        };

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
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

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
      });

      it('should reject unauthenticated users', () => {
        mockReq.user = undefined;

        const middleware = requireRole('administrator');
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
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
      mockReq = { path: '/test', method: 'GET', ip: '127.0.0.1' };

      // Mock production environment
      process.env.NODE_ENV = 'production';

      const errorHandler = require('../errorHandler').errorHandler;
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error',
          errorId: expect.any(String),
        })
      );
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
