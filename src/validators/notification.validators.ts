import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateCreateNotification = (data: any) => {
  const schema = Joi.object({
    targetUserId: Joi.string().optional().messages({
      'string.empty': 'Target user ID cannot be empty',
    }),
    type: Joi.string().valid('IN_APP', 'SYSTEM', 'SECURITY', 'EVENT', 'STREAM', 'TICKET', 'PAYMENT', 'REFUND', 'CHAT', 'CREATOR', 'ADMIN').required().messages({
      'any.only': 'Type must be one of: IN_APP, SYSTEM, SECURITY, EVENT, STREAM, TICKET, PAYMENT, REFUND, CHAT, CREATOR, ADMIN',
      'any.required': 'Type is required',
    }),
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must not exceed 200 characters',
      'string.empty': 'Title cannot be empty',
      'any.required': 'Title is required',
    }),
    message: Joi.string().min(1).max(1000).required().messages({
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message must not exceed 1000 characters',
      'string.empty': 'Message cannot be empty',
      'any.required': 'Message is required',
    }),
    data: Joi.object().optional().messages({
      'object.base': 'Data must be an object',
    }),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent',
    }),
    expiresAt: Joi.date().greater('now').optional().messages({
      'date.greater': 'Expires at must be in the future',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateUpdateNotification = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(200).optional().messages({
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title must not exceed 200 characters',
      'string.empty': 'Title cannot be empty',
    }),
    message: Joi.string().min(1).max(1000).optional().messages({
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message must not exceed 1000 characters',
      'string.empty': 'Message cannot be empty',
    }),
    data: Joi.object().optional().messages({
      'object.base': 'Data must be an object',
    }),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent',
    }),
    expiresAt: Joi.date().greater('now').optional().messages({
      'date.greater': 'Expires at must be in the future',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateNotificationPreferences = (data: any) => {
  const schema = Joi.object({
    inAppEnabled: Joi.boolean().optional().messages({
      'boolean.base': 'In app enabled must be a boolean',
    }),
    eventNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Event notifications must be a boolean',
    }),
    streamNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Stream notifications must be a boolean',
    }),
    chatNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Chat notifications must be a boolean',
    }),
    ticketNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Ticket notifications must be a boolean',
    }),
    paymentNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Payment notifications must be a boolean',
    }),
    creatorNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Creator notifications must be a boolean',
    }),
    adminNotifications: Joi.boolean().optional().messages({
      'boolean.base': 'Admin notifications must be a boolean',
    }),
    language: Joi.string().length(2).optional().messages({
      'string.length': 'Language must be a 2-character ISO code',
    }),
    timezone: Joi.string().optional().messages({
      'string.empty': 'Timezone cannot be empty',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateBulkNotifications = (data: any) => {
  const schema = Joi.object({
    notifications: Joi.array().items(
      Joi.object({
        userId: Joi.string().required().messages({
          'string.empty': 'User ID cannot be empty',
          'any.required': 'User ID is required',
        }),
        type: Joi.string().valid('IN_APP', 'SYSTEM', 'SECURITY', 'EVENT', 'STREAM', 'TICKET', 'PAYMENT', 'REFUND', 'CHAT', 'CREATOR', 'ADMIN').required().messages({
          'any.only': 'Type must be one of: IN_APP, SYSTEM, SECURITY, EVENT, STREAM, TICKET, PAYMENT, REFUND, CHAT, CREATOR, ADMIN',
          'any.required': 'Type is required',
        }),
        title: Joi.string().min(1).max(200).required().messages({
          'string.min': 'Title must be at least 1 character',
          'string.max': 'Title must not exceed 200 characters',
          'string.empty': 'Title cannot be empty',
          'any.required': 'Title is required',
        }),
        message: Joi.string().min(1).max(1000).required().messages({
          'string.min': 'Message must be at least 1 character',
          'string.max': 'Message must not exceed 1000 characters',
          'string.empty': 'Message cannot be empty',
          'any.required': 'Message is required',
        }),
        data: Joi.object().optional().messages({
          'object.base': 'Data must be an object',
        }),
        priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().messages({
          'any.only': 'Priority must be one of: low, normal, high, urgent',
        }),
        expiresAt: Joi.date().greater('now').optional().messages({
          'date.greater': 'Expires at must be in the future',
        }),
      })
    ).min(1).max(100).required().messages({
      'array.min': 'At least 1 notification is required',
      'array.max': 'Cannot send more than 100 notifications at once',
      'any.required': 'Notifications array is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateNotificationQuery = (data: any) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional().messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
    offset: Joi.number().integer().min(0).optional().messages({
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset must be at least 0',
    }),
    type: Joi.string().valid('IN_APP', 'SYSTEM', 'SECURITY', 'EVENT', 'STREAM', 'TICKET', 'PAYMENT', 'REFUND', 'CHAT', 'CREATOR', 'ADMIN').optional().messages({
      'any.only': 'Type must be one of: IN_APP, SYSTEM, SECURITY, EVENT, STREAM, TICKET, PAYMENT, REFUND, CHAT, CREATOR, ADMIN',
    }),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};
