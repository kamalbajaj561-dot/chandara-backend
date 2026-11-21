import { ticketGenerationService } from '../ticketGeneration.service';
import { qrCodeService } from '../qrCode.service';
import { DigitalWalletProvider } from '../../providers/wallet/DigitalWalletProvider.interface';

// Mock QR code service
jest.mock('../qrCode.service');

describe('TicketGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTicketId', () => {
    it('should generate a unique ticket ID with TKT prefix', () => {
      const ticketId = ticketGenerationService.generateTicketId();
      
      expect(ticketId).toMatch(/^TKT-[A-Z0-9]{8}-[A-Z0-9]{4}$/);
    });

    it('should generate different IDs on multiple calls', () => {
      const id1 = ticketGenerationService.generateTicketId();
      const id2 = ticketGenerationService.generateTicketId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateTicket', () => {
    it('should generate a ticket with all required fields', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const ticket = await ticketGenerationService.generateTicket(ticketData);

      expect(ticket).toHaveProperty('ticketId');
      expect(ticket).toHaveProperty('orderId', ticketData.orderId);
      expect(ticket).toHaveProperty('userId', ticketData.userId);
      expect(ticket).toHaveProperty('eventId', ticketData.eventId);
      expect(ticket).toHaveProperty('ticketType', ticketData.ticketType);
      expect(ticket).toHaveProperty('price', ticketData.price);
      expect(ticket).toHaveProperty('currency', ticketData.currency);
      expect(ticket).toHaveProperty('eventName', ticketData.eventName);
      expect(ticket).toHaveProperty('qrCode', mockQRCode);
      expect(ticket).toHaveProperty('qrPayload');
      expect(ticket).toHaveProperty('createdAt');
    });

    it('should generate QR code for the ticket', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      await ticketGenerationService.generateTicket(ticketData);

      expect(qrCodeService.generateTicketQR).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: expect.any(String),
          orderId: ticketData.orderId,
          userId: ticketData.userId,
          eventId: ticketData.eventId,
        }),
        'base64'
      );
    });
  });

  describe('generateMultipleTickets', () => {
    it('should generate multiple tickets for an order', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const tickets = await ticketGenerationService.generateMultipleTickets([ticketData], 3);

      expect(tickets).toHaveLength(3);
      expect(tickets[0].ticketId).not.toBe(tickets[1].ticketId);
      expect(tickets[1].ticketId).not.toBe(tickets[2].ticketId);
    });

    it('should use the same ticket data for all tickets if only one provided', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const tickets = await ticketGenerationService.generateMultipleTickets([ticketData], 2);

      expect(tickets[0].ticketType).toBe(ticketData.ticketType);
      expect(tickets[1].ticketType).toBe(ticketData.ticketType);
    });
  });

  describe('generatePrintableTicket', () => {
    it('should add additional info to ticket', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const ticket = await ticketGenerationService.generateTicket(ticketData);

      const printableTicket = await ticketGenerationService.generatePrintableTicket(ticket, {
        buyerName: 'John Doe',
        creatorName: 'Jane Smith',
        terms: 'Test terms',
        refundPolicy: 'Test refund policy',
        supportContact: 'support@test.com',
      });

      expect(printableTicket).toHaveProperty('buyerName', 'John Doe');
      expect(printableTicket).toHaveProperty('creatorName', 'Jane Smith');
      expect(printableTicket).toHaveProperty('terms', 'Test terms');
      expect(printableTicket).toHaveProperty('refundPolicy', 'Test refund policy');
      expect(printableTicket).toHaveProperty('supportContact', 'support@test.com');
    });
  });

  describe('validateTicketSignature', () => {
    it('should validate a valid QR payload', () => {
      const validPayload = JSON.stringify({
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        timestamp: Date.now(),
        signature: 'valid-signature',
      });

      (qrCodeService.verifyQRCode as jest.Mock).mockReturnValue({ valid: true });

      const isValid = ticketGenerationService.validateTicketSignature(validPayload);

      expect(isValid).toBe(true);
      expect(qrCodeService.verifyQRCode).toHaveBeenCalledWith(validPayload);
    });

    it('should reject an invalid QR payload', () => {
      const invalidPayload = JSON.stringify({
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        timestamp: Date.now(),
        signature: 'invalid-signature',
      });

      (qrCodeService.verifyQRCode as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid signature' });

      const isValid = ticketGenerationService.validateTicketSignature(invalidPayload);

      expect(isValid).toBe(false);
    });
  });

  describe('verifyTicketOwnership', () => {
    it('should return true for ownership check (placeholder)', () => {
      const isValid = ticketGenerationService.verifyTicketOwnership('TKT-123', 'user-123');
      
      expect(isValid).toBe(true);
    });
  });

  describe('Digital Wallet Integration', () => {
    let mockWalletProvider: DigitalWalletProvider;

    beforeEach(() => {
      mockWalletProvider = {
        getProviderName: () => 'Test Wallet',
        isReady: () => true,
        generatePass: jest.fn().mockResolvedValue({
          success: true,
          passId: 'PASS-123',
          passUrl: 'https://wallet.example.com/pass/123',
        }),
        generateBulkPasses: jest.fn().mockResolvedValue([
          { success: true, passId: 'PASS-123' },
          { success: true, passId: 'PASS-124' },
        ]),
        validatePass: jest.fn().mockResolvedValue(true),
        revokePass: jest.fn().mockResolvedValue(true),
        updatePass: jest.fn().mockResolvedValue({
          success: true,
          passId: 'PASS-123',
        }),
      };

      ticketGenerationService.registerWalletProvider('test', mockWalletProvider);
    });

    it('should register a wallet provider', () => {
      // Provider already registered in beforeEach
      expect(mockWalletProvider.getProviderName()).toBe('Test Wallet');
    });

    it('should generate wallet pass for a ticket', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const ticket = await ticketGenerationService.generateTicket(ticketData);
      const result = await ticketGenerationService.generateWalletPass(ticket, 'test');

      expect(result.success).toBe(true);
      expect(result.passId).toBe('PASS-123');
      expect(mockWalletProvider.generatePass).toHaveBeenCalled();
    });

    it('should return error if wallet provider not found', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const ticket = await ticketGenerationService.generateTicket(ticketData);
      const result = await ticketGenerationService.generateWalletPass(ticket, 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet provider not found');
    });

    it('should generate bulk wallet passes', async () => {
      const mockQRCode = 'data:image/png;base64,mockqr';
      (qrCodeService.generateTicketQR as jest.Mock).mockResolvedValue(mockQRCode);

      const ticketData = {
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        ticketType: 'regular',
        price: 50,
        currency: 'USD',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        isVirtual: false,
      };

      const tickets = await ticketGenerationService.generateMultipleTickets([ticketData], 2);
      const result = await ticketGenerationService.generateBulkWalletPasses(tickets, 'test');

      expect(result.success).toBe(true);
      expect(result.passIds).toHaveLength(2);
      expect(mockWalletProvider.generateBulkPasses).toHaveBeenCalled();
    });
  });
});
