import { Request, Response, NextFunction } from 'express';
import { TicketController } from '../ticket.controller';

jest.mock('../../services/ticket.service');
jest.mock('../../services/qr.service');

describe('TicketController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
      user: { userId: 'user1', email: 'user1@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getTicketById', () => {
    it('should return ticket by ID', async () => {
      mockRequest.params = { ticketId: 'ticket1' };

      const { ticketService } = require('../../services/ticket.service');
      ticketService.getTicketById = jest.fn().mockResolvedValue({
        ticketId: 'ticket1',
        userId: 'user1',
      });

      await TicketController.getTicketById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getTicketsByUserId', () => {
    it('should return tickets for user', async () => {
      mockRequest.user = { userId: 'user1', email: 'user1@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };
      mockRequest.query = {};

      const { ticketService } = require('../../services/ticket.service');
      ticketService.getTicketsByUserId = jest.fn().mockResolvedValue([
        { ticketId: 'ticket1', userId: 'user1' },
      ]);

      await TicketController.getTicketsByUserId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('validateTicket', () => {
    it('should validate a ticket', async () => {
      mockRequest.body = { qrCode: 'qr123' };

      const { ticketService } = require('../../services/ticket.service');
      ticketService.validateTicket = jest.fn().mockResolvedValue({
        valid: true,
        ticket: { ticketId: 'ticket1', userId: 'user1' },
      });

      await TicketController.validateTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, data: { ticketId: 'ticket1', userId: 'user1' } });
    });
  });

  describe('markTicketAsUsed', () => {
    it('should mark ticket as used', async () => {
      mockRequest.params = { ticketId: 'ticket1' };
      mockRequest.user = { userId: 'user1', email: 'user1@example.com', role: 'administrator', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 };

      const { ticketService } = require('../../services/ticket.service');
      ticketService.markTicketAsUsed = jest.fn().mockResolvedValue({
        ticketId: 'ticket1',
        status: 'used',
      });

      await TicketController.markTicketAsUsed(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
