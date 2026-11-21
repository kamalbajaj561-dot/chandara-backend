/**
 * Digital Wallet Provider Interface
 * 
 * This interface defines the contract for digital wallet providers
 * such as Apple Wallet and Google Wallet.
 * 
 * Designed for future extensibility - wallet passes can be added
 * without refactoring the TicketGenerationService.
 */

export interface WalletPass {
  passId: string;
  ticketId: string;
  orderId: string;
  userId: string;
  eventName: string;
  eventDate: Date;
  venue: string;
  seatNumber?: string;
  ticketType: string;
  qrCode: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface WalletPassResult {
  success: boolean;
  passId?: string;
  passUrl?: string;
  passData?: any;
  error?: string;
}

export interface DigitalWalletProvider {
  /**
   * Get the provider name (e.g., 'Apple Wallet', 'Google Wallet')
   */
  getProviderName(): string;

  /**
   * Check if the provider is ready to generate passes
   */
  isReady(): boolean;

  /**
   * Generate a wallet pass for a ticket
   */
  generatePass(pass: WalletPass): Promise<WalletPassResult>;

  /**
   * Generate multiple wallet passes for an order
   */
  generateBulkPasses(passes: WalletPass[]): Promise<WalletPassResult[]>;

  /**
   * Validate a wallet pass
   */
  validatePass(passId: string): Promise<boolean>;

  /**
   * Revoke a wallet pass
   */
  revokePass(passId: string): Promise<boolean>;

  /**
   * Update a wallet pass (e.g., for event changes)
   */
  updatePass(passId: string, updates: Partial<WalletPass>): Promise<WalletPassResult>;
}
