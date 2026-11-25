import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

/**
 * Validate resend ticket request
 */
export const validateResendTicket = (req: any, _res: any, next: any): void => {
  const schema = Joi.object({
    recipient: Joi.string().email().optional().messages({
      'string.email': 'Recipient must be a valid email address',
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  next();
};

/**
 * Validate resend receipt request
 */
export const validateResendReceipt = (req: any, _res: any, next: any): void => {
  const schema = Joi.object({
    recipient: Joi.string().email().optional().messages({
      'string.email': 'Recipient must be a valid email address',
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  next();
};

/**
 * Validate admin resend request
 */
export const validateAdminResend = (req: any, _res: any, next: any): void => {
  const schema = Joi.object({
    recipient: Joi.string().email().required().messages({
      'string.email': 'Recipient must be a valid email address',
      'any.required': 'Recipient email is required',
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  next();
};

/**
 * Validate delivery logs query parameters
 */
export const validateDeliveryLogsQuery = (req: any, _res: any, next: any): void => {
  const schema = Joi.object({
    userId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
    offset: Joi.number().integer().min(0).default(0).optional(),
  });

  const { error, value } = schema.validate(req.query);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  req.query = value;
  next();
};

/**
 * Validate QR verification request
 */
export const validateQRVerification = (req: any, _res: any, next: any): void => {
  const schema = Joi.object({
    qrPayload: Joi.string().required().messages({
      'any.required': 'QR payload is required',
      'string.empty': 'QR payload is required',
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  next();
};
