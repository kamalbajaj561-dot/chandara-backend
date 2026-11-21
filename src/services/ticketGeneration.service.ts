// @ts-ignore - uuid types are available via @types/uuid
import { v4 as uuidv4 } from 'uuid';
import { qrCodeService } from './qrCode.service';
import { DigitalWalletProvider, WalletPass } from '../providers/wallet/DigitalWalletProvider.interface';
import logger from '../utils/logger';

export interface TicketData {
  orderId: string;
  userId: string;
  eventId: string;
  ticketType: string;
  seatNumber?: string;
  price: number;
  currency: string;
  eventName: string;
  eventDate: Date;
  eventTime: string;
  venue: string;
  isVirtual: boolean;
  timezone?: string;
}

export interface GeneratedTicket {
  ticketId: string;
  orderId: string;
  userId: string;
  eventId: string;
  ticketType: string;
  seatNumber?: string;
  price: number;
  currency: string;
  eventName: string;
  eventDate: Date;
  eventTime: string;
  venue: string;
  isVirtual: boolean;
  timezone?: string;
  qrCode: string;
  qrPayload: string;
  createdAt: Date;
}

export interface PrintableTicket extends GeneratedTicket {
  buyerName?: string;
  creatorName?: string;
  terms?: string;
  refundPolicy?: string;
  supportContact?: string;
}

export class TicketGenerationService {
  private walletProviders: Map<string, DigitalWalletProvider> = new Map();

  /**
   * Register a digital wallet provider
   */
  registerWalletProvider(name: string, provider: DigitalWalletProvider): void {
    this.walletProviders.set(name, provider);
    logger.info(`Registered wallet provider: ${name}`);
  }

  /**
   * Generate a unique, secure ticket ID
   */
  generateTicketId(): string {
    // Generate a UUID-based ticket ID with prefix
    const uuid = uuidv4();
    return `TKT-${uuid.substring(0, 8).toUpperCase()}-${uuid.substring(9, 13).toUpperCase()}`;
  }

  /**
   * Generate QR payload for a ticket
   */
  generateQRPayload(ticket: GeneratedTicket): string {
    const signedPayload = qrCodeService.createSignedPayload({
      ticketId: ticket.ticketId,
      orderId: ticket.orderId,
      userId: ticket.userId,
      eventId: ticket.eventId,
    });
    return JSON.stringify(signedPayload);
  }

  /**
   * Generate QR code for a ticket
   */
  async generateQRCode(ticket: GeneratedTicket, format: 'base64' | 'svg' | 'png' = 'base64'): Promise<string | Buffer> {
    return await qrCodeService.generateTicketQR(
      {
        ticketId: ticket.ticketId,
        orderId: ticket.orderId,
        userId: ticket.userId,
        eventId: ticket.eventId,
      },
      format
    );
  }

  /**
   * Generate a single ticket
   */
  async generateTicket(data: TicketData): Promise<GeneratedTicket> {
    const ticketId = this.generateTicketId();

    const ticket: GeneratedTicket = {
      ticketId,
      orderId: data.orderId,
      userId: data.userId,
      eventId: data.eventId,
      ticketType: data.ticketType,
      seatNumber: data.seatNumber,
      price: data.price,
      currency: data.currency,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      venue: data.venue,
      isVirtual: data.isVirtual,
      timezone: data.timezone,
      qrCode: '',
      qrPayload: '',
      createdAt: new Date(),
    };

    // Generate QR payload
    ticket.qrPayload = this.generateQRPayload(ticket);

    // Generate QR code (base64 by default)
    ticket.qrCode = (await this.generateQRCode(ticket, 'base64')) as string;

    logger.info(`Generated ticket: ${ticketId} for order: ${data.orderId}`);

    return ticket;
  }

  /**
   * Generate multiple tickets for an order
   */
  async generateMultipleTickets(data: TicketData[], quantity: number): Promise<GeneratedTicket[]> {
    const tickets: GeneratedTicket[] = [];

    for (let i = 0; i < quantity; i++) {
      const ticketData = data[i] || data[0]; // Use specific data or first data
      const ticket = await this.generateTicket(ticketData);
      tickets.push(ticket);
    }

    logger.info(`Generated ${tickets.length} tickets for order: ${data[0]?.orderId}`);

    return tickets;
  }

  /**
   * Generate printable ticket with additional info
   */
  async generatePrintableTicket(
    ticket: GeneratedTicket,
    additionalInfo: {
      buyerName?: string;
      creatorName?: string;
      terms?: string;
      refundPolicy?: string;
      supportContact?: string;
    }
  ): Promise<PrintableTicket> {
    const printableTicket: PrintableTicket = {
      ...ticket,
      ...additionalInfo,
    };

    return printableTicket;
  }

  /**
   * Validate ticket signature
   */
  validateTicketSignature(qrPayload: string): boolean {
    const result = qrCodeService.verifyQRCode(qrPayload);
    return result.valid;
  }

  /**
   * Verify ticket ownership
   */
  verifyTicketOwnership(_ticketId: string, _userId: string): boolean {
    // This would typically check against the database
    // For now, we'll implement a basic check
    // The actual implementation would query the ticket repository
    return true; // Placeholder
  }

  /**
   * Generate wallet pass for a ticket
   */
  async generateWalletPass(
    ticket: GeneratedTicket,
    providerName: string = 'default'
  ): Promise<{ success: boolean; passId?: string; error?: string }> {
    const provider = this.walletProviders.get(providerName);

    if (!provider) {
      return { success: false, error: `Wallet provider not found: ${providerName}` };
    }

    if (!provider.isReady()) {
      return { success: false, error: 'Wallet provider not ready' };
    }

    try {
      const pass: WalletPass = {
        passId: this.generateTicketId(), // Re-use ticket ID generation for pass ID
        ticketId: ticket.ticketId,
        orderId: ticket.orderId,
        userId: ticket.userId,
        eventName: ticket.eventName,
        eventDate: ticket.eventDate,
        venue: ticket.venue,
        seatNumber: ticket.seatNumber,
        ticketType: ticket.ticketType,
        qrCode: ticket.qrCode,
        createdAt: ticket.createdAt,
      };

      const result = await provider.generatePass(pass);

      if (result.success) {
        logger.info(`Generated wallet pass: ${result.passId} for ticket: ${ticket.ticketId}`);
        return { success: true, passId: result.passId };
      } else {
        logger.error(`Failed to generate wallet pass: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      logger.error('Error generating wallet pass:', error);
      return { success: false, error: 'Internal error generating wallet pass' };
    }
  }

  /**
   * Generate wallet passes for multiple tickets
   */
  async generateBulkWalletPasses(
    tickets: GeneratedTicket[],
    providerName: string = 'default'
  ): Promise<{ success: boolean; passIds?: string[]; errors?: string[] }> {
    const provider = this.walletProviders.get(providerName);

    if (!provider) {
      return { success: false, errors: [`Wallet provider not found: ${providerName}`] };
    }

    const passes: WalletPass[] = tickets.map(ticket => ({
      passId: this.generateTicketId(),
      ticketId: ticket.ticketId,
      orderId: ticket.orderId,
      userId: ticket.userId,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      venue: ticket.venue,
      seatNumber: ticket.seatNumber,
      ticketType: ticket.ticketType,
      qrCode: ticket.qrCode,
      createdAt: ticket.createdAt,
    }));

    try {
      const results = await provider.generateBulkPasses(passes);
      const passIds = results.filter(r => r.success).map(r => r.passId!);
      const errors = results.filter(r => !r.success).map(r => r.error!);

      logger.info(`Generated ${passIds.length} wallet passes for ${tickets.length} tickets`);

      return {
        success: passIds.length === tickets.length,
        passIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('Error generating bulk wallet passes:', error);
      return { success: false, errors: ['Internal error generating wallet passes'] };
    }
  }
}

export const ticketGenerationService = new TicketGenerationService();
