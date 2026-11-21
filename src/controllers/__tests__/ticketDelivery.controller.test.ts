import { Request, Response, NextFunction } from 'express';
import { TicketDeliveryController } from '../ticketDelivery.controller';
import { ticketDeliveryService } from '../../services/ticketDelivery.service';
import { ticketRepository } from '../../repositories/ticket.repository';
import { orderRepository } from '../../repositories/order.repository';
import { eventRepository } from '../../repositories/event.repository';
import { receiptService } from '../../services/receipt.service';
import { qrCodeService } from '../../services/qrCode.service';

jest.mock('../../services/ticketDelivery.service');
jest.mock('../../repositories/ticket.repository');
jest.mock('../../repositories/order.repository');
jest.mock('../../repositories/event.repository');
jest.mock('../../services/pdf.service');
jest.mock('../../services/receipt.service');
jest.mock('../../services/qrCode.service');

describe('TicketDeliveryController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {},
    } as any;
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('downloadTicket', () => {
    it('should return 401 if not authenticated', async () => {
      mockRequest.user = undefined;

      await TicketDeliveryController.downloadTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
        message: 'User not authenticated',
      }));
    });

    it('should return 404 if ticket not found', async () => {
      mockRequest.params = { id: 'TKT-999' };
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      (ticketRepository.findById as jest.Mock).mockResolvedValue(null);

      await TicketDeliveryController.downloadTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 404,
        message: 'Ticket not found',
      }));
    });

    it('should return 403 if not owner and not admin', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.user = { userId: 'user-456', role: 'viewer' } as any;

      const mockTicket = {
        ticketId: 'TKT-123',
        userId: 'user-123',
      };

      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      await TicketDeliveryController.downloadTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
        message: expect.stringContaining('Access denied'),
      }));
    });
  });

  describe('viewQR', () => {
    it('should return 401 if not authenticated', async () => {
      mockRequest.user = undefined;

      await TicketDeliveryController.viewQR(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });

    it('should view QR code for ticket owner', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      const mockTicket = {
        ticketId: 'TKT-123',
        userId: 'user-123',
        qrSignature: 'mock-signature',
      };

      const mockQR = 'data:image/png;base64,mockqr';

      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (qrCodeService.generateQRBase64 as jest.Mock).mockResolvedValue(mockQR);

      await TicketDeliveryController.viewQR(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          qrCode: mockQR,
          ticketId: 'TKT-123',
        },
      });
    });
  });

  describe('downloadReceipt', () => {
    it('should return 401 if not authenticated', async () => {
      mockRequest.user = undefined;

      await TicketDeliveryController.downloadReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 401,
      }));
    });

    it('should download receipt PDF for order owner', async () => {
      mockRequest.params = { id: 'ORD-123' };
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user-123',
      };

      const mockPDF = Buffer.from('mock-receipt-pdf');

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);
      (receiptService.generateReceiptPDF as jest.Mock).mockResolvedValue({
        success: true,
        pdf: mockPDF,
      });

      await TicketDeliveryController.downloadReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.send).toHaveBeenCalledWith(mockPDF);
    });
  });

  describe('resendTicket', () => {
    it('should resend ticket email for owner', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.body = { recipient: 'new@example.com' };
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      const mockTicket = {
        ticketId: 'TKT-123',
        userId: 'user-123',
        orderId: 'ORD-123',
      };

      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (ticketDeliveryService.sendTicketEmail as jest.Mock).mockResolvedValue({
        success: true,
        deliveryId: 'DLV-123',
      });

      await TicketDeliveryController.resendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { deliveryId: 'DLV-123' },
        message: 'Ticket email resent successfully',
      });
    });

    it('should return 403 if not owner', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.user = { userId: 'user-456', role: 'viewer' } as any;

      const mockTicket = {
        ticketId: 'TKT-123',
        userId: 'user-123',
      };

      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      await TicketDeliveryController.resendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
      }));
    });
  });

  describe('resendReceipt', () => {
    it('should resend receipt email for order owner', async () => {
      mockRequest.params = { id: 'ORD-123' };
      mockRequest.body = { recipient: 'new@example.com' };
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user-123',
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);
      (ticketDeliveryService.sendReceiptEmail as jest.Mock).mockResolvedValue({
        success: true,
        deliveryId: 'DLV-123',
      });

      await TicketDeliveryController.resendReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { deliveryId: 'DLV-123' },
        message: 'Receipt email resent successfully',
      });
    });
  });

  describe('viewTicket', () => {
    it('should view ticket details for owner', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      const mockTicket = {
        ticketId: 'TKT-123',
        userId: 'user-123',
        orderId: 'ORD-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        qrCode: 'mock-qr',
        status: 'active',
      };

      const mockOrder = {
        orderId: 'ORD-123',
        total: 50,
        createdAt: new Date(),
      };

      const mockEvent = {
        title: 'Test Event',
        eventDate: '2024-12-25',
        eventTime: '19:00',
        venue: 'Test Venue',
      };

      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);

      await TicketDeliveryController.viewTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ticket: expect.objectContaining({
            ticketId: 'TKT-123',
            ticketType: 'regular',
          }),
          order: expect.objectContaining({
            orderId: 'ORD-123',
          }),
          event: expect.objectContaining({
            title: 'Test Event',
          }),
        },
      });
    });
  });

  describe('getDeliveryLogs', () => {
    it('should get delivery logs for admin', async () => {
      mockRequest.query = { userId: 'user-123', limit: '50', offset: '0' };
      mockRequest.user = { userId: 'admin-123', role: 'administrator' } as any;

      const mockLogs = [
        {
          deliveryId: 'DLV-123',
          ticketId: 'TKT-123',
          status: 'sent',
        },
      ];

      (ticketDeliveryService.getUserDeliveryLogs as jest.Mock).mockResolvedValue(mockLogs);

      await TicketDeliveryController.getDeliveryLogs(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockLogs,
        pagination: { limit: 50, offset: 0 },
      });
    });

    it('should return 403 for non-admin', async () => {
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      await TicketDeliveryController.getDeliveryLogs(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
      }));
    });
  });

  describe('getStatistics', () => {
    it('should get statistics for admin', async () => {
      mockRequest.query = { userId: 'user-123' };
      mockRequest.user = { userId: 'admin-123', role: 'administrator' } as any;

      const mockStats = {
        total: 100,
        sent: 80,
        delivered: 75,
        failed: 5,
        opened: 60,
        clicked: 40,
      };

      (ticketDeliveryService.getStatistics as jest.Mock).mockResolvedValue(mockStats);

      await TicketDeliveryController.getStatistics(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });

    it('should return 403 for non-admin', async () => {
      mockRequest.user = { userId: 'user-123', role: 'viewer' } as any;

      await TicketDeliveryController.getStatistics(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 403,
      }));
    });
  });

  describe('adminResendTicket', () => {
    it('should admin resend ticket', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.body = { recipient: 'admin@example.com' };
      mockRequest.user = { userId: 'admin-123', role: 'administrator' } as any;

      const mockTicket = {
        ticketId: 'TKT-123',
        userId: 'user-123',
      };

      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (ticketDeliveryService.adminResendTicket as jest.Mock).mockResolvedValue({
        success: true,
        deliveryId: 'DLV-123',
      });

      await TicketDeliveryController.adminResendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { deliveryId: 'DLV-123' },
        message: 'Ticket resent successfully',
      });
    });

    it('should return 400 if recipient missing', async () => {
      mockRequest.params = { id: 'TKT-123' };
      mockRequest.body = {};
      mockRequest.user = { userId: 'admin-123', role: 'administrator' } as any;

      await TicketDeliveryController.adminResendTicket(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: 400,
        message: 'Recipient email is required',
      }));
    });
  });

  describe('adminResendReceipt', () => {
    it('should admin resend receipt', async () => {
      mockRequest.params = { id: 'ORD-123' };
      mockRequest.body = { recipient: 'admin@example.com' };
      mockRequest.user = { userId: 'admin-123', role: 'administrator' } as any;

      const mockOrder = {
        orderId: 'ORD-123',
        userId: 'user-123',
      };

      (orderRepository.findById as jest.Mock).mockResolvedValue(mockOrder);
      (ticketDeliveryService.adminResendReceipt as jest.Mock).mockResolvedValue({
        success: true,
        deliveryId: 'DLV-123',
      });

      await TicketDeliveryController.adminResendReceipt(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { deliveryId: 'DLV-123' },
        message: 'Receipt resent successfully',
      });
    });
  });
});
