import { QRService } from '../qr.service';

describe('QRService', () => {
  let qrService: QRService;

  beforeEach(() => {
    qrService = new QRService();
  });

  describe('generateQRCode', () => {
    it('should generate a QR code string', () => {
      const result = qrService.generateQRCode('user1:event1:1234567890');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('QR_');
    });
  });

  describe('generateTicketQR', () => {
    it('should generate a ticket QR code', () => {
      const result = qrService.generateTicketQR('user1', 'event1', 'ticket1');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('QR_');
    });
  });

  describe('generateQRSignature', () => {
    it('should generate a signature for QR code', () => {
      const qrCode = 'user1:event1:1234567890';
      const result = qrService.generateQRSignature(qrCode);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('validateQRCode', () => {
    it('should validate a valid QR code with correct signature', () => {
      const qrCode = 'user1:event1:1234567890';
      const signature = qrService.generateQRSignature(qrCode);

      const result = qrService.validateQRCode(qrCode, signature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const qrCode = 'user1:event1:1234567890';
      const invalidSignature = 'invalid_signature';

      const result = qrService.validateQRCode(qrCode, invalidSignature);

      expect(result).toBe(false);
    });
  });
});
