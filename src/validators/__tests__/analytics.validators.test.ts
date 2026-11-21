import {
  validateDateRange,
  validateAnalyticsTrack,
  validateExportRequest,
  validateAnalyticsFilters,
  validateTrendsQuery,
} from '../analytics.validators';
import { Request, Response, NextFunction } from 'express';

describe('Analytics Validators', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDateRange', () => {
    it('should pass with valid date range', () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      validateDateRange(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass with no date range', () => {
      mockReq.query = {};

      validateDateRange(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid date format', () => {
      mockReq.query = {
        startDate: 'invalid-date',
      };

      validateDateRange(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
      });
    });

    it('should fail when endDate is before startDate', () => {
      mockReq.query = {
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      };

      validateDateRange(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateAnalyticsTrack', () => {
    it('should pass with valid event data', () => {
      mockReq.body = {
        eventType: 'test_event',
        data: { test: 'data' },
      };

      validateAnalyticsTrack(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail with missing eventType', () => {
      mockReq.body = {
        data: { test: 'data' },
      };

      validateAnalyticsTrack(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should pass with only eventType', () => {
      mockReq.body = {
        eventType: 'test_event',
      };

      validateAnalyticsTrack(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateExportRequest', () => {
    it('should pass with valid export request', () => {
      mockReq.body = {
        format: 'csv',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        metrics: ['revenue', 'users'],
      };

      validateExportRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid format', () => {
      mockReq.body = {
        format: 'invalid',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      validateExportRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should fail with missing startDate', () => {
      mockReq.body = {
        format: 'csv',
        endDate: '2024-01-31',
      };

      validateExportRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should fail with missing endDate', () => {
      mockReq.body = {
        format: 'csv',
        startDate: '2024-01-01',
      };

      validateExportRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should pass with valid JSON format', () => {
      mockReq.body = {
        format: 'json',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      validateExportRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with valid Excel format', () => {
      mockReq.body = {
        format: 'xlsx',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      validateExportRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateAnalyticsFilters', () => {
    it('should pass with valid filters', () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        period: 'daily',
        filters: { creatorId: 'creator-123' },
      };

      validateAnalyticsFilters(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with no filters', () => {
      mockReq.query = {};

      validateAnalyticsFilters(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid period', () => {
      mockReq.query = {
        period: 'invalid',
      };

      validateAnalyticsFilters(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should pass with valid period', () => {
      const validPeriods = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];

      validPeriods.forEach(period => {
        mockReq.query = { period };

        validateAnalyticsFilters(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('validateTrendsQuery', () => {
    it('should pass with valid period', () => {
      mockReq.query = {
        period: '30d',
      };

      validateTrendsQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass with no period', () => {
      mockReq.query = {};

      validateTrendsQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail with invalid period', () => {
      mockReq.query = {
        period: 'invalid',
      };

      validateTrendsQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should pass with all valid periods', () => {
      const validPeriods = ['7d', '30d', '90d', '1y'];

      validPeriods.forEach(period => {
        mockReq.query = { period };

        validateTrendsQuery(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });
});
