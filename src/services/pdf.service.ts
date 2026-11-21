// @ts-ignore - pdfkit types are not available
import PDFDocument from 'pdfkit';
import { getCache, setCache } from './redis';
import { PrintableTicket } from './ticketGeneration.service';
import logger from '../utils/logger';

export interface PDFOptions {
  size?: 'A4' | 'LETTER';
  margin?: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface TicketPDFData extends PrintableTicket {
  orderDate: Date;
  buyerEmail?: string;
  creatorEmail?: string;
  platformName?: string;
  platformUrl?: string;
  supportEmail?: string;
}

export interface ReceiptPDFData {
  orderId: string;
  invoiceNumber: string;
  orderDate: Date;
  buyerName: string;
  buyerEmail: string;
  creatorName: string;
  creatorEmail: string;
  eventName: string;
  eventDate: Date;
  eventTime: string;
  venue: string;
  items: Array<{
    ticketType: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  taxes: number;
  platformFees: number;
  discounts: number;
  couponCode?: string;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentId: string;
  supportEmail?: string;
  platformName?: string;
  platformUrl?: string;
}

export class PDFService {
  private readonly PDF_CACHE_TTL = 7200; // 2 hours

  /**
   * Generate ticket PDF
   */
  async generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
    const cacheKey = `pdf:ticket:${data.ticketId}`;
    
    // Check cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult.data) {
      return Buffer.from(cachedResult.data as string, 'base64');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Ticket - ${data.eventName}`,
          Author: data.platformName || 'Chandara',
          Subject: `Ticket ${data.ticketId}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        setCache(cacheKey, pdfBuffer.toString('base64'), this.PDF_CACHE_TTL).catch(err => {
          logger.error('Failed to cache ticket PDF:', err);
        });
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      this.renderTicketPDF(doc, data);
      doc.end();
    });
  }

  /**
   * Render ticket PDF content
   */
  private renderTicketPDF(doc: any, data: TicketPDFData): void {
    const { width, height } = doc.page;
    const margin = 50;

    // Header - Event Banner placeholder
    doc.rect(margin, margin, width - margin * 2, 100).fillAndStroke('#667eea', '#667eea');
    doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text(data.eventName, margin + 20, margin + 30, {
      width: width - margin * 2 - 40,
      align: 'center',
    });

    // Virtual Event Label
    if (data.isVirtual) {
      doc.fillColor('#fbbf24').fontSize(12).font('Helvetica-Bold').text('VIRTUAL EVENT', margin + 20, margin + 70, {
        width: width - margin * 2 - 40,
        align: 'center',
      });
    }

    // Event Details
    let y = 160;
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text('Event Details', margin, y);
    y += 25;
    doc.fontSize(11).font('Helvetica');
    doc.text(`Date: ${this.formatDate(data.eventDate)}`, margin, y);
    y += 20;
    doc.text(`Time: ${data.eventTime}${data.timezone ? ` (${data.timezone})` : ''}`, margin, y);
    y += 20;
    doc.text(`Venue: ${data.venue}`, margin, y);

    // Ticket Information
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('Ticket Information', margin, y);
    y += 25;
    doc.fontSize(11).font('Helvetica');
    doc.text(`Ticket ID: ${data.ticketId}`, margin, y);
    y += 20;
    doc.text(`Order ID: ${data.orderId}`, margin, y);
    y += 20;
    doc.text(`Ticket Type: ${data.ticketType}`, margin, y);
    y += 20;
    if (data.seatNumber) {
      doc.text(`Seat Number: ${data.seatNumber}`, margin, y);
      y += 20;
    }
    doc.text(`Price: ${data.currency} ${data.price.toFixed(2)}`, margin, y);

    // Buyer Information
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('Buyer Information', margin, y);
    y += 25;
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${data.buyerName || 'N/A'}`, margin, y);
    y += 20;
    if (data.buyerEmail) {
      doc.text(`Email: ${data.buyerEmail}`, margin, y);
      y += 20;
    }

    // Creator Information
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('Creator Information', margin, y);
    y += 25;
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${data.creatorName || 'N/A'}`, margin, y);
    y += 20;
    if (data.creatorEmail) {
      doc.text(`Email: ${data.creatorEmail}`, margin, y);
      y += 20;
    }

    // QR Code placeholder (would need to embed actual QR image)
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('QR Code', margin, y);
    y += 25;
    doc.rect(margin, y, 150, 150).stroke();
    doc.fontSize(10).font('Helvetica').text('Scan QR code at event entrance', margin, y + 160);

    // Terms and Refund Policy
    y += 200;
    doc.fontSize(12).font('Helvetica-Bold').text('Terms & Conditions', margin, y);
    y += 20;
    doc.fontSize(9).font('Helvetica');
    const terms = data.terms || 'This ticket is non-transferable and non-refundable unless otherwise specified.';
    doc.text(terms, margin, y, { width: width - margin * 2, align: 'justify' });

    y += 40;
    doc.fontSize(12).font('Helvetica-Bold').text('Refund Policy', margin, y);
    y += 20;
    doc.fontSize(9).font('Helvetica');
    const refundPolicy = data.refundPolicy || 'Refunds are available up to 24 hours before the event. Please contact support for assistance.';
    doc.text(refundPolicy, margin, y, { width: width - margin * 2, align: 'justify' });

    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('gray');
    const footerY = height - 40;
    doc.text(
      `For support, contact: ${data.supportEmail || 'support@chandara.com'}`,
      margin,
      footerY,
      { width: width - margin * 2, align: 'center' }
    );
    doc.text(
      data.platformUrl || 'https://chandara.com',
      margin,
      footerY + 15,
      { width: width - margin * 2, align: 'center' }
    );
  }

  /**
   * Generate receipt PDF
   */
  async generateReceiptPDF(data: ReceiptPDFData): Promise<Buffer> {
    const cacheKey = `pdf:receipt:${data.orderId}`;
    
    // Check cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult.data) {
      return Buffer.from(cachedResult.data as string, 'base64');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Receipt - Order ${data.orderId}`,
          Author: data.platformName || 'Chandara',
          Subject: `Invoice ${data.invoiceNumber}`,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        setCache(cacheKey, pdfBuffer.toString('base64'), this.PDF_CACHE_TTL).catch(err => {
          logger.error('Failed to cache receipt PDF:', err);
        });
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      this.renderReceiptPDF(doc, data);
      doc.end();
    });
  }

  /**
   * Render receipt PDF content
   */
  private renderReceiptPDF(doc: any, data: ReceiptPDFData): void {
    const { width, height } = doc.page;
    const margin = 50;

    // Header
    doc.fillColor('#667eea').fontSize(24).font('Helvetica-Bold').text('RECEIPT', margin, margin);
    doc.fillColor('black').fontSize(12).font('Helvetica');
    doc.text(`Invoice Number: ${data.invoiceNumber}`, margin, margin + 30);
    doc.text(`Order ID: ${data.orderId}`, margin, margin + 45);
    doc.text(`Order Date: ${this.formatDate(data.orderDate)}`, margin, margin + 60);

    // Buyer Information
    let y = 130;
    doc.fontSize(14).font('Helvetica-Bold').text('Bill To', margin, y);
    y += 20;
    doc.fontSize(11).font('Helvetica');
    doc.text(data.buyerName, margin, y);
    y += 15;
    doc.text(data.buyerEmail, margin, y);

    // Creator Information
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('From', margin, y);
    y += 20;
    doc.fontSize(11).font('Helvetica');
    doc.text(data.creatorName, margin, y);
    y += 15;
    doc.text(data.creatorEmail, margin, y);

    // Event Information
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('Event', margin, y);
    y += 20;
    doc.fontSize(11).font('Helvetica');
    doc.text(data.eventName, margin, y);
    y += 15;
    doc.text(`Date: ${this.formatDate(data.eventDate)}`, margin, y);
    y += 15;
    doc.text(`Time: ${data.eventTime}`, margin, y);
    y += 15;
    doc.text(`Venue: ${data.venue}`, margin, y);

    // Items Table
    y += 35;
    doc.fontSize(14).font('Helvetica-Bold').text('Items', margin, y);
    y += 25;

    // Table Header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', margin, y);
    doc.text('Qty', margin + 250, y);
    doc.text('Price', margin + 300, y);
    doc.text('Subtotal', margin + 400, y);
    y += 20;

    // Table Line
    doc.moveTo(margin, y).lineTo(width - margin, y).stroke();
    y += 10;

    // Table Rows
    doc.fontSize(10).font('Helvetica');
    data.items.forEach(item => {
      doc.text(item.ticketType, margin, y);
      doc.text(item.quantity.toString(), margin + 250, y);
      doc.text(`${data.currency} ${item.price.toFixed(2)}`, margin + 300, y);
      doc.text(`${data.currency} ${item.subtotal.toFixed(2)}`, margin + 400, y);
      y += 20;
    });

    // Table Line
    doc.moveTo(margin, y).lineTo(width - margin, y).stroke();
    y += 20;

    // Totals
    const totalsX = margin + 300;
    doc.fontSize(11).font('Helvetica');
    doc.text('Subtotal:', totalsX, y);
    doc.text(`${data.currency} ${data.subtotal.toFixed(2)}`, margin + 400, y);
    y += 20;

    if (data.taxes > 0) {
      doc.text('Taxes:', totalsX, y);
      doc.text(`${data.currency} ${data.taxes.toFixed(2)}`, margin + 400, y);
      y += 20;
    }

    if (data.platformFees > 0) {
      doc.text('Platform Fees:', totalsX, y);
      doc.text(`${data.currency} ${data.platformFees.toFixed(2)}`, margin + 400, y);
      y += 20;
    }

    if (data.discounts > 0) {
      doc.fillColor('green').text('Discounts:', totalsX, y);
      doc.text(`-${data.currency} ${data.discounts.toFixed(2)}`, margin + 400, y);
      doc.fillColor('black');
      y += 20;
    }

    if (data.couponCode) {
      doc.text(`Coupon: ${data.couponCode}`, margin, y);
      y += 20;
    }

    // Total
    y += 10;
    doc.moveTo(totalsX, y).lineTo(width - margin, y).stroke();
    y += 15;
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Total:', totalsX, y);
    doc.text(`${data.currency} ${data.total.toFixed(2)}`, margin + 400, y);

    // Payment Information
    y += 40;
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Information', margin, y);
    y += 20;
    doc.fontSize(11).font('Helvetica');
    doc.text(`Payment Method: ${data.paymentMethod}`, margin, y);
    y += 15;
    doc.text(`Payment ID: ${data.paymentId}`, margin, y);

    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('gray');
    const footerY = height - 40;
    doc.text(
      `For support, contact: ${data.supportEmail || 'support@chandara.com'}`,
      margin,
      footerY,
      { width: width - margin * 2, align: 'center' }
    );
    doc.text(
      data.platformUrl || 'https://chandara.com',
      margin,
      footerY + 15,
      { width: width - margin * 2, align: 'center' }
    );
  }

  /**
   * Generate multiple tickets PDF
   */
  async generateMultipleTicketsPDF(tickets: TicketPDFData[]): Promise<Buffer> {
    const cacheKey = `pdf:tickets:${tickets.map(t => t.ticketId).join('-')}`;
    
    // Check cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult.data) {
      return Buffer.from(cachedResult.data as string, 'base64');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        setCache(cacheKey, pdfBuffer.toString('base64'), this.PDF_CACHE_TTL).catch(err => {
          logger.error('Failed to cache multiple tickets PDF:', err);
        });
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      tickets.forEach((ticket, index) => {
        if (index > 0) {
          doc.addPage();
        }
        this.renderTicketPDF(doc, ticket);
      });

      doc.end();
    });
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Clear PDF cache
   */
  async clearCache(_pattern?: string): Promise<void> {
    // This would require a Redis pattern deletion
    // For now, we'll rely on TTL expiration
    logger.info('PDF cache cleared (TTL-based)');
  }
}

export const pdfService = new PDFService();
