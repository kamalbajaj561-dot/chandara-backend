import { qrCodeService } from '../qrCode.service';
import { getCache, setCache } from '../redis';

// Mock Redis
jest.mock('../redis');

describe('QRCodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateQRBase64', () => {
    it('should generate a base64 QR code', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const payload = 'test-payload';
      const qrCode = await qrCodeService.generateQRBase64(payload);

      expect(qrCode).toBeDefined();
      expect(qrCode).toMatch(/^data:image\/png;base64,/);
      expect(setCache).toHaveBeenCalled();
    });

    it('should return cached QR code if available', async () => {
      const cachedQR = 'data:image/png;base64,cached';
      (getCache as jest.Mock).mockResolvedValue({ data: cachedQR });

      const payload = 'test-payload';
      const qrCode = await qrCodeService.generateQRBase64(payload);

      expect(qrCode).toBe(cachedQR);
      expect(getCache).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });

    it('should use custom options', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const payload = 'test-payload';
      const options = {
        width: 400,
        margin: 4,
        color: { dark: '#0000FF', light: '#FFFFFF' },
        errorCorrectionLevel: 'H' as const,
      };

      await qrCodeService.generateQRBase64(payload, options);

      expect(setCache).toHaveBeenCalled();
    });
  });

  describe('generateQRSVG', () => {
    it('should generate an SVG QR code', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const payload = 'test-payload';
      const svg = await qrCodeService.generateQRSVG(payload);

      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(setCache).toHaveBeenCalled();
    });

    it('should return cached SVG if available', async () => {
      const cachedSVG = '<svg>cached</svg>';
      (getCache as jest.Mock).mockResolvedValue({ data: cachedSVG });

      const payload = 'test-payload';
      const svg = await qrCodeService.generateQRSVG(payload);

      expect(svg).toBe(cachedSVG);
      expect(getCache).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });
  });

  describe('generateQRPNG', () => {
    it('should generate a PNG QR code', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const payload = 'test-payload';
      const png = await qrCodeService.generateQRPNG(payload);

      expect(png).toBeInstanceOf(Buffer);
      expect(png.length).toBeGreaterThan(0);
      expect(setCache).toHaveBeenCalled();
    });

    it('should return cached PNG if available', async () => {
      const cachedPNG = Buffer.from('cached-png');
      (getCache as jest.Mock).mockResolvedValue({ data: cachedPNG });

      const payload = 'test-payload';
      const png = await qrCodeService.generateQRPNG(payload);

      expect(png).toEqual(cachedPNG);
      expect(getCache).toHaveBeenCalled();
      expect(setCache).not.toHaveBeenCalled();
    });
  });

  describe('createSignedPayload', () => {
    it('should create a signed payload with all required fields', () => {
      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const payload = qrCodeService.createSignedPayload(data);

      expect(payload).toHaveProperty('ticketId', data.ticketId);
      expect(payload).toHaveProperty('orderId', data.orderId);
      expect(payload).toHaveProperty('userId', data.userId);
      expect(payload).toHaveProperty('eventId', data.eventId);
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('signature');
      expect(payload.signature).toBeTruthy();
    });

    it('should generate unique signatures for different payloads', () => {
      const data1 = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const data2 = {
        ticketId: 'TKT-456',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const payload1 = qrCodeService.createSignedPayload(data1);
      const payload2 = qrCodeService.createSignedPayload(data2);

      expect(payload1.signature).not.toBe(payload2.signature);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const payload = qrCodeService.createSignedPayload(data);
      const isValid = qrCodeService.verifySignature(payload);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payload = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        timestamp: Date.now(),
        signature: 'invalid-signature',
      };

      const isValid = qrCodeService.verifySignature(payload);

      expect(isValid).toBe(false);
    });

    it('should reject an expired payload', () => {
      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const payload = qrCodeService.createSignedPayload(data);
      // Set timestamp to 25 hours ago (beyond 24 hour limit)
      payload.timestamp = Date.now() - (25 * 60 * 60 * 1000);

      const isValid = qrCodeService.verifySignature(payload);

      expect(isValid).toBe(false);
    });
  });

  describe('parsePayload', () => {
    it('should parse a valid JSON payload', () => {
      const payloadString = JSON.stringify({
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        timestamp: Date.now(),
        signature: 'test-signature',
      });

      const parsed = qrCodeService.parsePayload(payloadString);

      expect(parsed).not.toBeNull();
      expect(parsed?.ticketId).toBe('TKT-123');
    });

    it('should return null for invalid JSON', () => {
      const invalidPayload = 'not-valid-json';

      const parsed = qrCodeService.parsePayload(invalidPayload);

      expect(parsed).toBeNull();
    });

    it('should return null for payload missing required fields', () => {
      const incompletePayload = JSON.stringify({
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
      });

      const parsed = qrCodeService.parsePayload(incompletePayload);

      expect(parsed).toBeNull();
    });
  });

  describe('verifyQRCode', () => {
    it('should verify a valid QR code', () => {
      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const payload = qrCodeService.createSignedPayload(data);
      const payloadString = JSON.stringify(payload);

      const result = qrCodeService.verifyQRCode(payloadString);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it('should reject an invalid QR code', () => {
      const invalidPayload = JSON.stringify({
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
        timestamp: Date.now(),
        signature: 'invalid',
      });

      const result = qrCodeService.verifyQRCode(invalidPayload);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject malformed payload', () => {
      const malformedPayload = 'not-valid-json';

      const result = qrCodeService.verifyQRCode(malformedPayload);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateTicketQR', () => {
    it('should generate QR code for ticket in base64 format', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const qr = await qrCodeService.generateTicketQR(data, 'base64');

      expect(qr).toMatch(/^data:image\/png;base64,/);
    });

    it('should generate QR code for ticket in SVG format', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const qr = await qrCodeService.generateTicketQR(data, 'svg');

      expect(qr).toContain('<svg');
    });

    it('should generate QR code for ticket in PNG format', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      (setCache as jest.Mock).mockResolvedValue(true);

      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      const qr = await qrCodeService.generateTicketQR(data, 'png');

      expect(qr).toBeInstanceOf(Buffer);
    });

    it('should throw error for unsupported format', async () => {
      const data = {
        ticketId: 'TKT-123',
        orderId: 'ORD-123',
        userId: 'user-123',
        eventId: 'event-123',
      };

      await expect(
        qrCodeService.generateTicketQR(data, 'unsupported' as any)
      ).rejects.toThrow('Unsupported QR format');
    });
  });

  describe('clearCache', () => {
    it('should clear cache (TTL-based)', async () => {
      await qrCodeService.clearCache();

      // This is a no-op that relies on TTL expiration
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });
});
