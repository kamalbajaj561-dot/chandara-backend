import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Analytics Validators
 * Joi validation schemas for analytics endpoints
 */

/**
 * Validate date range query
 */
export const validateDateRange = (req: Request, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  next();
};

/**
 * Validate analytics track request
 */
export const validateAnalyticsTrack = (req: Request, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    eventType: Joi.string().required(),
    data: Joi.object().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  next();
};

/**
 * Validate export request
 */
export const validateExportRequest = (req: Request, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    format: Joi.string().valid('csv', 'json', 'xlsx').required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    metrics: Joi.array().items(Joi.string()).optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  next();
};

/**
 * Validate analytics filters
 */
export const validateAnalyticsFilters = (req: Request, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    period: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly', 'yearly').optional(),
    filters: Joi.object().optional(),
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  next();
};

/**
 * Validate trends query
 */
export const validateTrendsQuery = (req: Request, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').optional(),
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  next();
};
