import {
  validateCreateTicket,
  validateValidateTicket,
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateCreatePayment,
  validateVerifyPayment,
  validateProcessRefund,
  validateCreateCoupon,
  validateValidateCoupon,
  validateCreateRefund,
} from '../ticketing.validators';

describe('Ticketing Validators', () => {
  describe('validateCreateTicket', () => {
    it('should validate valid ticket data', () => {
      const validData = {
        eventId: 'event1',
        userId: 'user1',
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'general',
        price: 100,
        currency: 'USD',
      };

      const result = validateCreateTicket(validData);
      expect(result).toBeDefined();
      expect(result.eventId).toBe('event1');
    });

    it('should reject invalid ticket data', () => {
      const invalidData = {
        eventId: 'event1',
        userId: 'user1',
        ticketType: 'invalid_type',
      };

      expect(() => validateCreateTicket(invalidData)).toThrow();
    });
  });

  describe('validateValidateTicket', () => {
    it('should validate ticket QR code', () => {
      const validData = { qrCode: 'QR_abc123' };
      const result = validateValidateTicket(validData);
      expect(result).toBeDefined();
      expect(result.qrCode).toBe('QR_abc123');
    });

    it('should reject missing QR code', () => {
      const invalidData = {};
      expect(() => validateValidateTicket(invalidData)).toThrow();
    });
  });

  describe('validateCreateOrder', () => {
    it('should validate valid order data', () => {
      const validData = {
        eventId: 'event1',
        items: [
          { ticketType: 'general', price: 100, quantity: 2 },
        ],
        currency: 'USD',
        paymentProvider: 'razorpay',
      };

      const result = validateCreateOrder(validData);
      expect(result).toBeDefined();
      expect(result.eventId).toBe('event1');
    });

    it('should reject invalid order data', () => {
      const invalidData = {
        eventId: 'event1',
        items: [],
      };

      expect(() => validateCreateOrder(invalidData)).toThrow();
    });
  });

  describe('validateUpdateOrderStatus', () => {
    it('should validate valid status update', () => {
      const validData = { status: 'paid' };
      const result = validateUpdateOrderStatus(validData);
      expect(result).toBeDefined();
      expect(result.status).toBe('paid');
    });

    it('should reject invalid status', () => {
      const invalidData = { status: 'invalid_status' };
      expect(() => validateUpdateOrderStatus(invalidData)).toThrow();
    });
  });

  describe('validateCreatePayment', () => {
    it('should validate valid payment data', () => {
      const validData = {
        orderId: 'order1',
        amount: 100,
        currency: 'USD',
        provider: 'razorpay',
      };

      const result = validateCreatePayment(validData);
      expect(result).toBeDefined();
      expect(result.orderId).toBe('order1');
    });

    it('should reject invalid payment data', () => {
      const invalidData = {
        orderId: 'order1',
        amount: -100,
      };

      expect(() => validateCreatePayment(invalidData)).toThrow();
    });
  });

  describe('validateVerifyPayment', () => {
    it('should validate payment verification data', () => {
      const validData = {
        providerPaymentId: 'razorpay123',
        provider: 'razorpay',
      };

      const result = validateVerifyPayment(validData);
      expect(result).toBeDefined();
      expect(result.providerPaymentId).toBe('razorpay123');
    });

    it('should reject missing provider payment ID', () => {
      const invalidData = { provider: 'razorpay' };
      expect(() => validateVerifyPayment(invalidData)).toThrow();
    });
  });

  describe('validateProcessRefund', () => {
    it('should validate valid refund process data', () => {
      const validData = {
        paymentId: 'payment1',
        amount: 100,
        reason: 'Not satisfied',
      };

      const result = validateProcessRefund(validData);
      expect(result).toBeDefined();
      expect(result.paymentId).toBe('payment1');
    });

    it('should reject invalid refund data', () => {
      const invalidData = {
        paymentId: 'payment1',
        amount: -100,
      };

      expect(() => validateProcessRefund(invalidData)).toThrow();
    });
  });

  describe('validateCreateCoupon', () => {
    it('should validate valid coupon data', () => {
      const validData = {
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        maxUses: 100,
        minPurchase: 50,
        expiryDate: new Date('2099-12-31'),
      };

      const result = validateCreateCoupon(validData);
      expect(result).toBeDefined();
      expect(result.code).toBe('SAVE20');
    });

    it('should reject invalid coupon data', () => {
      const invalidData = {
        code: 'SAVE20',
        type: 'invalid_type',
      };

      expect(() => validateCreateCoupon(invalidData)).toThrow();
    });
  });

  describe('validateValidateCoupon', () => {
    it('should validate coupon validation data', () => {
      const validData = {
        code: 'SAVE20',
        purchaseAmount: 100,
      };

      const result = validateValidateCoupon(validData);
      expect(result).toBeDefined();
      expect(result.code).toBe('SAVE20');
    });

    it('should reject missing purchase amount', () => {
      const invalidData = { code: 'SAVE20' };
      expect(() => validateValidateCoupon(invalidData)).toThrow();
    });
  });

  describe('validateCreateRefund', () => {
    it('should validate valid refund creation data', () => {
      const validData = {
        orderId: 'order1',
        amount: 100,
        currency: 'USD',
        reason: 'Not satisfied',
      };

      const result = validateCreateRefund(validData);
      expect(result).toBeDefined();
      expect(result.orderId).toBe('order1');
    });

    it('should reject invalid refund data', () => {
      const invalidData = {
        orderId: 'order1',
        amount: -100,
      };

      expect(() => validateCreateRefund(invalidData)).toThrow();
    });
  });
});
