import { getCache, setCache, deleteCache, deleteCachePattern, incrementCache, decrementCache } from './redis';
import logger from '../utils/logger';

const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
};

const CACHE_PREFIXES = {
  TICKET_AVAILABILITY: 'ticket:availability:',
  EVENT_CAPACITY: 'event:capacity:',
  COUPON_VALIDATION: 'coupon:validation:',
  PAYMENT_SESSION: 'payment:session:',
  RECEIPT: 'receipt:',
};

export class TicketingCacheService {
  // Ticket Availability Caching
  static async getTicketAvailability(eventId: string, ticketType: string): Promise<number | null> {
    const key = `${CACHE_PREFIXES.TICKET_AVAILABILITY}${eventId}:${ticketType}`;
    try {
      const availabilityResult = await getCache<number>(key);
      return availabilityResult.data;
    } catch (error) {
      logger.error('Failed to get ticket availability from cache:', error);
      return null;
    }
  }

  static async setTicketAvailability(eventId: string, ticketType: string, availability: number): Promise<void> {
    const key = `${CACHE_PREFIXES.TICKET_AVAILABILITY}${eventId}:${ticketType}`;
    try {
      await setCache(key, availability, CACHE_TTL.MEDIUM);
    } catch (error) {
      logger.error('Failed to set ticket availability in cache:', error);
    }
  }

  static async decrementTicketAvailability(eventId: string, ticketType: string): Promise<number> {
    const key = `${CACHE_PREFIXES.TICKET_AVAILABILITY}${eventId}:${ticketType}`;
    try {
      return await decrementCache(key);
    } catch (error) {
      logger.error('Failed to decrement ticket availability in cache:', error);
      throw error;
    }
  }

  static async incrementTicketAvailability(eventId: string, ticketType: string): Promise<number> {
    const key = `${CACHE_PREFIXES.TICKET_AVAILABILITY}${eventId}:${ticketType}`;
    try {
      return await incrementCache(key);
    } catch (error) {
      logger.error('Failed to increment ticket availability in cache:', error);
      throw error;
    }
  }

  // Event Capacity Caching
  static async getEventCapacity(eventId: string): Promise<number | null> {
    const key = `${CACHE_PREFIXES.EVENT_CAPACITY}${eventId}`;
    try {
      const capacityResult = await getCache<number>(key);
      return capacityResult.data;
    } catch (error) {
      logger.error('Failed to get event capacity from cache:', error);
      return null;
    }
  }

  static async setEventCapacity(eventId: string, capacity: number): Promise<void> {
    const key = `${CACHE_PREFIXES.EVENT_CAPACITY}${eventId}`;
    try {
      await setCache(key, capacity, CACHE_TTL.LONG);
    } catch (error) {
      logger.error('Failed to set event capacity in cache:', error);
    }
  }

  static async decrementEventCapacity(eventId: string): Promise<number> {
    const key = `${CACHE_PREFIXES.EVENT_CAPACITY}${eventId}`;
    try {
      return await decrementCache(key);
    } catch (error) {
      logger.error('Failed to decrement event capacity in cache:', error);
      throw error;
    }
  }

  static async incrementEventCapacity(eventId: string): Promise<number> {
    const key = `${CACHE_PREFIXES.EVENT_CAPACITY}${eventId}`;
    try {
      return await incrementCache(key);
    } catch (error) {
      logger.error('Failed to increment event capacity in cache:', error);
      throw error;
    }
  }

  // Coupon Validation Caching
  static async getCouponValidation(code: string): Promise<any | null> {
    const key = `${CACHE_PREFIXES.COUPON_VALIDATION}${code}`;
    try {
      const validationResult = await getCache(key);
      return validationResult.data;
    } catch (error) {
      logger.error('Failed to get coupon validation from cache:', error);
      return null;
    }
  }

  static async setCouponValidation(code: string, validation: any): Promise<void> {
    const key = `${CACHE_PREFIXES.COUPON_VALIDATION}${code}`;
    try {
      await setCache(key, validation, CACHE_TTL.MEDIUM);
    } catch (error) {
      logger.error('Failed to set coupon validation in cache:', error);
    }
  }

  static async invalidateCouponCache(code: string): Promise<void> {
    const key = `${CACHE_PREFIXES.COUPON_VALIDATION}${code}`;
    try {
      await deleteCache(key);
    } catch (error) {
      logger.error('Failed to invalidate coupon cache:', error);
    }
  }

  // Payment Session Caching
  static async getPaymentSession(sessionId: string): Promise<any | null> {
    const key = `${CACHE_PREFIXES.PAYMENT_SESSION}${sessionId}`;
    try {
      const sessionResult = await getCache(key);
      return sessionResult.data;
    } catch (error) {
      logger.error('Failed to get payment session from cache:', error);
      return null;
    }
  }

  static async setPaymentSession(sessionId: string, session: any): Promise<void> {
    const key = `${CACHE_PREFIXES.PAYMENT_SESSION}${sessionId}`;
    try {
      await setCache(key, session, CACHE_TTL.SHORT);
    } catch (error) {
      logger.error('Failed to set payment session in cache:', error);
    }
  }

  static async invalidatePaymentSession(sessionId: string): Promise<void> {
    const key = `${CACHE_PREFIXES.PAYMENT_SESSION}${sessionId}`;
    try {
      await deleteCache(key);
    } catch (error) {
      logger.error('Failed to invalidate payment session cache:', error);
    }
  }

  // Receipt Caching
  static async getReceipt(receiptId: string): Promise<any | null> {
    const key = `${CACHE_PREFIXES.RECEIPT}${receiptId}`;
    try {
      const receiptResult = await getCache(key);
      return receiptResult.data;
    } catch (error) {
      logger.error('Failed to get receipt from cache:', error);
      return null;
    }
  }

  static async setReceipt(receiptId: string, receipt: any): Promise<void> {
    const key = `${CACHE_PREFIXES.RECEIPT}${receiptId}`;
    try {
      await setCache(key, receipt, CACHE_TTL.LONG);
    } catch (error) {
      logger.error('Failed to set receipt in cache:', error);
    }
  }

  static async invalidateReceiptCache(receiptId: string): Promise<void> {
    const key = `${CACHE_PREFIXES.RECEIPT}${receiptId}`;
    try {
      await deleteCache(key);
    } catch (error) {
      logger.error('Failed to invalidate receipt cache:', error);
    }
  }

  // Cache Invalidation
  static async invalidateEventCache(eventId: string): Promise<void> {
    try {
      await deleteCachePattern(`${CACHE_PREFIXES.TICKET_AVAILABILITY}${eventId}:*`);
      await deleteCache(`${CACHE_PREFIXES.EVENT_CAPACITY}${eventId}`);
    } catch (error) {
      logger.error('Failed to invalidate event cache:', error);
    }
  }

  static async invalidateCouponCacheAll(): Promise<void> {
    try {
      await deleteCachePattern(`${CACHE_PREFIXES.COUPON_VALIDATION}*`);
    } catch (error) {
      logger.error('Failed to invalidate all coupon cache:', error);
    }
  }

  static async invalidatePaymentCacheAll(): Promise<void> {
    try {
      await deleteCachePattern(`${CACHE_PREFIXES.PAYMENT_SESSION}*`);
    } catch (error) {
      logger.error('Failed to invalidate all payment cache:', error);
    }
  }
}
