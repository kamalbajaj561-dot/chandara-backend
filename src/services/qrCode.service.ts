import QRCode from 'qrcode';
import crypto from 'crypto';
import { getCache, setCache } from './redis';
import logger from '../utils/logger';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface SignedQRPayload {
  ticketId: string;
  orderId: string;
  userId: string;
  eventId: string;
  timestamp: number;
  signature: string;
}

export class QRCodeService {
  private readonly QR_CACHE_TTL = 3600; // 1 hour
  private readonly SIGNATURE_SECRET = process.env.QR_SIGNATURE_SECRET || 'chandara-qr-secret';

  /**
   * Generate QR code as base64 string
   */
  async generateQRBase64(payload: string, options?: QRCodeOptions): Promise<string> {
    const cacheKey = `qr:base64:${Buffer.from(payload).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult.data) {
      return cachedResult.data as string;
    }

    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: options?.color || {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    });

    // Cache the result
    await setCache(cacheKey, qrDataUrl, this.QR_CACHE_TTL);

    return qrDataUrl;
  }

  /**
   * Generate QR code as SVG string
   */
  async generateQRSVG(payload: string, options?: QRCodeOptions): Promise<string> {
    const cacheKey = `qr:svg:${Buffer.from(payload).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult.data) {
      return cachedResult.data as string;
    }

    const qrSvg = await QRCode.toString(payload, {
      type: 'svg',
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: options?.color || {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    });

    // Cache the result
    await setCache(cacheKey, qrSvg, this.QR_CACHE_TTL);

    return qrSvg;
  }

  /**
   * Generate QR code as PNG buffer
   */
  async generateQRPNG(payload: string, _options?: QRCodeOptions): Promise<Buffer> {
    const cacheKey = `qr:png:${Buffer.from(payload).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult.data) {
      return Buffer.from(cachedResult.data as string, 'base64');
    }

    const qrBuffer = await QRCode.toBuffer(payload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: _options?.errorCorrectionLevel || 'M',
    });

    // Cache the result
    await setCache(cacheKey, qrBuffer.toString('base64'), this.QR_CACHE_TTL);

    return qrBuffer;
  }

  /**
   * Create signed QR payload
   */
  createSignedPayload(data: {
    ticketId: string;
    orderId: string;
    userId: string;
    eventId: string;
  }): SignedQRPayload {
    const payload: SignedQRPayload = {
      ticketId: data.ticketId,
      orderId: data.orderId,
      userId: data.userId,
      eventId: data.eventId,
      timestamp: Date.now(),
      signature: '',
    };

    // Create signature
    const signatureData = `${data.ticketId}:${data.orderId}:${data.userId}:${data.eventId}:${payload.timestamp}`;
    payload.signature = crypto
      .createHmac('sha256', this.SIGNATURE_SECRET)
      .update(signatureData)
      .digest('hex');

    return payload;
  }

  /**
   * Verify QR payload signature
   */
  verifySignature(payload: SignedQRPayload): boolean {
    const signatureData = `${payload.ticketId}:${payload.orderId}:${payload.userId}:${payload.eventId}:${payload.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.SIGNATURE_SECRET)
      .update(signatureData)
      .digest('hex');

    // Check if signature matches
    if (payload.signature !== expectedSignature) {
      return false;
    }

    // Check if payload is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - payload.timestamp > maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Parse QR payload from string
   */
  parsePayload(payloadString: string): SignedQRPayload | null {
    try {
      const payload = JSON.parse(payloadString) as SignedQRPayload;
      
      // Validate required fields
      if (!payload.ticketId || !payload.orderId || !payload.userId || !payload.eventId || !payload.signature) {
        return null;
      }

      return payload;
    } catch (error) {
      logger.error('Failed to parse QR payload:', error);
      return null;
    }
  }

  /**
   * Verify and parse QR code
   */
  verifyQRCode(payloadString: string): { valid: boolean; payload?: SignedQRPayload; error?: string } {
    const payload = this.parsePayload(payloadString);

    if (!payload) {
      return { valid: false, error: 'Invalid payload format' };
    }

    if (!this.verifySignature(payload)) {
      return { valid: false, error: 'Invalid signature or expired' };
    }

    return { valid: true, payload };
  }

  /**
   * Generate QR code for ticket with signature
   */
  async generateTicketQR(data: {
    ticketId: string;
    orderId: string;
    userId: string;
    eventId: string;
  }, format: 'base64' | 'svg' | 'png' = 'base64'): Promise<string | Buffer> {
    const signedPayload = this.createSignedPayload(data);
    const payloadString = JSON.stringify(signedPayload);

    switch (format) {
      case 'base64':
        return await this.generateQRBase64(payloadString);
      case 'svg':
        return await this.generateQRSVG(payloadString);
      case 'png':
        return await this.generateQRPNG(payloadString);
      default:
        throw new Error(`Unsupported QR format: ${format}`);
    }
  }

  /**
   * Clear QR code cache
   */
  async clearCache(_pattern?: string): Promise<void> {
    // This would require a Redis pattern deletion
    // For now, we'll rely on TTL expiration
    logger.info('QR cache cleared (TTL-based)');
  }
}

export const qrCodeService = new QRCodeService();
