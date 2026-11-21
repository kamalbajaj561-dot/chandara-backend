import { CouponRepository } from '../coupon.repository';
import { getFirestore } from '../../services/firebase';
import { Coupon, CouponType } from '../../types';

jest.mock('../../services/firebase');

describe('CouponRepository', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockQuery: any;
  let mockTimestamp: any;

  beforeEach(() => {
    mockTimestamp = {
      toDate: jest.fn(() => new Date()),
      toMillis: jest.fn(() => Date.now()),
      seconds: 0,
      nanoseconds: 0,
    };

    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      data: jest.fn(),
    };
    mockCollection = {
      doc: jest.fn(() => mockDoc),
      add: jest.fn(),
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockQuery = {
      where: jest.fn(() => mockQuery),
      orderBy: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery),
      offset: jest.fn(() => mockQuery),
      get: jest.fn(),
    };
    mockDb = {
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn(),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return coupon if found', async () => {
      const mockCoupon: Coupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage' as CouponType,
        value: 20,
        maxUses: 100,
        usedCount: 10,
        minPurchase: 50,
        expiryDate: mockTimestamp,
        creatorId: 'creator1',
        isPlatformCoupon: false,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'coupon1',
        data: () => mockCoupon,
      });

      const repository = new CouponRepository();
      const result = await repository.findById('coupon1');

      expect(result).not.toBeNull();
      expect(result?.couponId).toBe('coupon1');
      expect(result?.code).toBe('SAVE20');
    });

    it('should return null if coupon not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const repository = new CouponRepository();
      const result = await repository.findById('coupon1');

      expect(result).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('should return coupon by code', async () => {
      const mockCoupon: Coupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage' as CouponType,
        value: 20,
        maxUses: 100,
        usedCount: 10,
        minPurchase: 50,
        expiryDate: mockTimestamp,
        creatorId: 'creator1',
        isPlatformCoupon: false,
        createdAt: mockTimestamp,
        updatedAt: mockTimestamp,
      };

      mockQuery.get.mockResolvedValue({
        docs: [{ id: 'coupon1', data: () => mockCoupon }],
      });

      const repository = new CouponRepository();
      const result = await repository.findByCode('SAVE20');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('SAVE20');
      expect(mockCollection.where).toHaveBeenCalledWith('code', '==', 'SAVE20');
    });
  });

  describe('incrementUsedCount', () => {
    it('should increment used count', async () => {
      mockDoc.get.mockResolvedValue({ exists: true, data: () => ({ couponId: 'coupon1', usedCount: 10 }) });
      mockDoc.update.mockResolvedValue(undefined);

      const repository = new CouponRepository();
      const result = await repository.incrementUsedCount('coupon1');

      expect(mockDoc.update).toHaveBeenCalledWith(expect.objectContaining({ usedCount: 11 }));
      expect(result).toBeDefined();
    });
  });
});
