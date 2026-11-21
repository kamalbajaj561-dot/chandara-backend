import { pdfService } from '../pdf.service';
import { getCache, setCache } from '../redis';

// Mock Redis
jest.mock('../redis');

describe('PDFService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTicketPDF', () => {
    it('should generate a ticket PDF buffer', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const ticketData = {
        ticketId: 'TKT-123',
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
        timezone: 'UTC',
        orderDate: new Date(),
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        creatorName: 'Jane Smith',
        creatorEmail: 'jane@example.com',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
        supportEmail: 'support@chandara.com',
        qrCode: 'data:image/png;base64,mockqr',
        qrPayload: 'mock-payload',
        createdAt: new Date(),
      };

      const pdf = await pdfService.generateTicketPDF(ticketData);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      expect(setCache).toHaveBeenCalled();
    });

    it('should return cached PDF if available', async () => {
      const cachedPDF = Buffer.from('cached-pdf');
      (getCache as jest.Mock).mockResolvedValue({ data: cachedPDF });

      const ticketData = {
        ticketId: 'TKT-123',
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
        timezone: 'UTC',
        orderDate: new Date(),
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        creatorName: 'Jane Smith',
        creatorEmail: 'jane@example.com',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
        supportEmail: 'support@chandara.com',
        qrCode: 'data:image/png;base64,mockqr',
        qrPayload: 'mock-payload',
        createdAt: new Date(),
      };

      const pdf = await pdfService.generateTicketPDF(ticketData);

      expect(pdf).toEqual(cachedPDF);
      expect(getCache).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });
  });

  describe('generateReceiptPDF', () => {
    it('should generate a receipt PDF buffer', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const receiptData = {
        orderId: 'ORD-123',
        invoiceNumber: 'INV-123',
        orderDate: new Date(),
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        creatorName: 'Jane Smith',
        creatorEmail: 'jane@example.com',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        items: [
          {
            ticketType: 'regular',
            quantity: 2,
            price: 50,
            subtotal: 100,
          },
        ],
        subtotal: 100,
        taxes: 10,
        platformFees: 5,
        discounts: 0,
        couponCode: undefined,
        total: 115,
        currency: 'USD',
        paymentMethod: 'stripe',
        paymentId: 'pay_123',
        supportEmail: 'support@chandara.com',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
      };

      const pdf = await pdfService.generateReceiptPDF(receiptData);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      expect(setCache).toHaveBeenCalled();
    });

    it('should return cached receipt PDF if available', async () => {
      const cachedPDF = Buffer.from('cached-pdf');
      (getCache as jest.Mock).mockResolvedValue({ data: cachedPDF });

      const receiptData = {
        orderId: 'ORD-123',
        invoiceNumber: 'INV-123',
        orderDate: new Date(),
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        creatorName: 'Jane Smith',
        creatorEmail: 'jane@example.com',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        items: [
          {
            ticketType: 'regular',
            quantity: 1,
            price: 50,
            subtotal: 50,
          },
        ],
        subtotal: 50,
        taxes: 5,
        platformFees: 2.5,
        discounts: 0,
        couponCode: undefined,
        total: 57.5,
        currency: 'USD',
        paymentMethod: 'stripe',
        paymentId: 'pay_123',
        supportEmail: 'support@chandara.com',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
      };

      const pdf = await pdfService.generateReceiptPDF(receiptData);

      expect(pdf).toEqual(cachedPDF);
      expect(getCache).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });

    it('should handle receipt with discounts and coupon', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const receiptData = {
        orderId: 'ORD-123',
        invoiceNumber: 'INV-123',
        orderDate: new Date(),
        buyerName: 'John Doe',
        buyerEmail: 'john@example.com',
        creatorName: 'Jane Smith',
        creatorEmail: 'jane@example.com',
        eventName: 'Test Event',
        eventDate: new Date('2024-12-25'),
        eventTime: '19:00',
        venue: 'Test Venue',
        items: [
          {
            ticketType: 'regular',
            quantity: 2,
            price: 50,
            subtotal: 100,
          },
        ],
        subtotal: 100,
        taxes: 10,
        platformFees: 5,
        discounts: 15,
        couponCode: 'SAVE15',
        total: 100,
        currency: 'USD',
        paymentMethod: 'stripe',
        paymentId: 'pay_123',
        supportEmail: 'support@chandara.com',
        platformName: 'Chandara',
        platformUrl: 'https://chandara.com',
      };

      const pdf = await pdfService.generateReceiptPDF(receiptData);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });
  });

  describe('generateMultipleTicketsPDF', () => {
    it('should generate a PDF with multiple tickets', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const tickets = [
        {
          ticketId: 'TKT-123',
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
          timezone: 'UTC',
          orderDate: new Date(),
          buyerName: 'John Doe',
          buyerEmail: 'john@example.com',
          creatorName: 'Jane Smith',
          creatorEmail: 'jane@example.com',
          platformName: 'Chandara',
          platformUrl: 'https://chandara.com',
          supportEmail: 'support@chandara.com',
          qrCode: 'data:image/png;base64,mockqr',
          qrPayload: 'mock-payload',
          createdAt: new Date(),
        },
        {
          ticketId: 'TKT-124',
          orderId: 'ORD-123',
          userId: 'user-123',
          eventId: 'event-123',
          ticketType: 'vip',
          price: 100,
          currency: 'USD',
          eventName: 'Test Event',
          eventDate: new Date('2024-12-25'),
          eventTime: '19:00',
          venue: 'Test Venue',
          isVirtual: false,
          timezone: 'UTC',
          orderDate: new Date(),
          buyerName: 'John Doe',
          buyerEmail: 'john@example.com',
          creatorName: 'Jane Smith',
          creatorEmail: 'jane@example.com',
          platformName: 'Chandara',
          platformUrl: 'https://chandara.com',
          supportEmail: 'support@chandara.com',
          qrCode: 'data:image/png;base64,mockqr2',
          qrPayload: 'mock-payload2',
          createdAt: new Date(),
        },
      ];

      const pdf = await pdfService.generateMultipleTicketsPDF(tickets);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      expect(setCache).toHaveBeenCalled();
    });

    it('should return cached multiple tickets PDF if available', async () => {
      const cachedPDF = Buffer.from('cached-pdf');
      (getCache as jest.Mock).mockResolvedValue({ data: cachedPDF });

      const tickets = [
        {
          ticketId: 'TKT-123',
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
          timezone: 'UTC',
          orderDate: new Date(),
          buyerName: 'John Doe',
          buyerEmail: 'john@example.com',
          creatorName: 'Jane Smith',
          creatorEmail: 'jane@example.com',
          platformName: 'Chandara',
          platformUrl: 'https://chandara.com',
          supportEmail: 'support@chandara.com',
          qrCode: 'data:image/png;base64,mockqr',
          qrPayload: 'mock-payload',
          createdAt: new Date(),
        },
      ];

      const pdf = await pdfService.generateMultipleTicketsPDF(tickets);

      expect(pdf).toEqual(cachedPDF);
      expect(getCache).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-12-25');
      const formatted = (pdfService as any).formatDate(date);

      expect(formatted).toContain('December');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('25');
    });
  });

  describe('clearCache', () => {
    it('should clear cache (TTL-based)', async () => {
      await pdfService.clearCache();

      // This is a no-op that relies on TTL expiration
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });
});
