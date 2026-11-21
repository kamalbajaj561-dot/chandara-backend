import { Request, Response, NextFunction } from 'express';
import {
  validateResendTicket,
  validateResendReceipt,
  validateAdminResend,
  validateDeliveryLogsQuery,
  validateQRVerification,
} from '../ticketDelivery.validators';
import { AppError } from '../../middleware/errorHandler';

describe('Ticket Delivery Validators', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  describe('validateResendTicket', () => {
    it('should pass with valid recipient email', () => {
      mockRequest.body = { recipient: 'test@example.com' };

      validateResendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should pass without recipient (optional)', () => {
      mockRequest.body = {};

      validateResendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid email', () => {
      mockRequest.body = { recipient: 'invalid-email' };

      validateResendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Recipient must be a valid email address',
      }));
    });
  });

  describe('validateResendReceipt', () => {
    it('should pass with valid recipient email', () => {
      mockRequest.body = { recipient: 'test@example.com' };

      validateResendReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should pass without recipient (optional)', () => {
      mockRequest.body = {};

      validateResendReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid email', () => {
      mockRequest.body = { recipient: 'not-an-email' };

      validateResendReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Recipient must be a valid email address',
      }));
    });
  });

  describe('validateAdminResend', () => {
    it('should pass with valid recipient email', () => {
      mockRequest.body = { recipient: 'admin@example.com' };

      validateAdminResend(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail without recipient (required)', () => {
      mockRequest.body = {};

      validateAdminResend(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Recipient email is required',
      }));
    });

    it('should fail with invalid email', () => {
      mockRequest.body = { recipient: 'bad-email' };

      validateAdminResend(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Recipient must be a valid email address',
      }));
    });
  });

  describe('validateDeliveryLogsQuery', () => {
    it('should pass with valid query parameters', () => {
      mockRequest.query = { userId: 'user-123', limit: '50', offset: '0' };

      validateDeliveryLogsQuery(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        userId: 'user-123',
        limit: 50,
        offset: 0,
      });
    });

    it('should apply default values for limit and offset', () => {
      mockRequest.query = { userId: 'user-123' };

      validateDeliveryLogsQuery(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        userId: 'user-123',
        limit: 50,
        offset: 0,
      });
    });

    it('should pass without any parameters', () => {
      mockRequest.query = {};

      validateDeliveryLogsQuery(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        limit: 50,
        offset: 0,
      });
    });

    it('should fail with limit below minimum', () => {
      mockRequest.query = { limit: '0' };

      validateDeliveryLogsQuery(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('should fail with limit above maximum', () => {
      mockRequest.query = { limit: '101' };

      validateDeliveryLogsQuery(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });

    it('should fail with negative offset', () => {
      mockRequest.query = { offset: '-1' };

      validateDeliveryLogsQuery(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
      }));
    });
  });

  describe('validateQRVerification', () => {
    it('should pass with valid QR payload', () => {
      mockRequest.body = { qrPayload: 'valid-payload-string' };

      validateQRVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail without QR payload (required)', () => {
      mockRequest.body = {};

      validateQRVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'QR payload is required',
      }));
    });

    it('should fail with empty QR payload', () => {
      mockRequest.body = { qrPayload: '' };

      validateQRVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'QR payload is required',
      }));
    });
  });
});
