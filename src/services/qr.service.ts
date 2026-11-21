export class QRService {
  generateQRCode(data: string): string {
    const encoded = this.base64Encode(data);
    return `QR_${encoded}`;
  }

  generateQRSignature(data: string): string {
    const hash = this.simpleHash(data);
    return `SIG_${hash}`;
  }

  validateQRCode(qrCode: string, signature: string): boolean {
    const expectedSignature = this.generateQRSignature(qrCode);
    return signature === expectedSignature;
  }

  generateTicketQR(userId: string, eventId: string, ticketId: string): string {
    const timestamp = Date.now();
    const data = `${userId}:${eventId}:${ticketId}:${timestamp}`;
    return this.generateQRCode(data);
  }

  private base64Encode(str: string): string {
    try {
      return btoa(str);
    } catch {
      return str.split('').map((c) => c.charCodeAt(0).toString(16)).join('');
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export const qrService = new QRService();
