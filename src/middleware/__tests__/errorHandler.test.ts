import { AppError, errorHandler, notFoundHandler } from '../errorHandler';
import { Request, Response, NextFunction } from 'express';

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('AppError', () => {
    it('should create an error with default status code', () => {
      const error = new AppError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create an error with custom status code', () => {
      const error = new AppError('Test error', 404);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create an error with custom operational flag', () => {
      const error = new AppError('Test error', 500, false);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
      });
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with error message', () => {
      mockReq = {
        originalUrl: '/not-found',
      };

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Route /not-found not found',
      });
    });
  });
});
