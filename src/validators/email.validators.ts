import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateSendEmail = (data: any) => {
  const schema = Joi.object({
    recipient: Joi.string().email().required().messages({
      'string.email': 'Invalid email address',
      'any.required': 'Recipient email is required',
    }),
    template: Joi.string().required().messages({
      'any.required': 'Template name is required',
    }),
    subject: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Subject must be at least 1 character',
      'string.max': 'Subject must not exceed 200 characters',
      'any.required': 'Subject is required',
    }),
    variables: Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number())).optional(),
    queue: Joi.boolean().optional(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach(detail => {
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

export const validateBulkEmail = (data: any) => {
  const schema = Joi.object({
    recipients: Joi.array()
      .items(Joi.string().email())
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least 1 recipient is required',
        'array.max': 'Maximum 100 recipients allowed',
        'any.required': 'Recipients array is required',
      }),
    template: Joi.string().required().messages({
      'any.required': 'Template name is required',
    }),
    subject: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Subject must be at least 1 character',
      'string.max': 'Subject must not exceed 200 characters',
      'any.required': 'Subject is required',
    }),
    variables: Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number())).optional(),
    queue: Joi.boolean().optional(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach(detail => {
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

export const validateRetryEmail = (data: any) => {
  const schema = Joi.object({
    emailId: Joi.string().required().messages({
      'any.required': 'Email ID is required',
    }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach(detail => {
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

export const validateTemplateVariables = (data: any) => {
  const schema = Joi.object({
    userName: Joi.string().optional(),
    creatorName: Joi.string().optional(),
    eventName: Joi.string().optional(),
    date: Joi.string().optional(),
    time: Joi.string().optional(),
    description: Joi.string().optional(),
    supportEmail: Joi.string().email().optional(),
    platformName: Joi.string().optional(),
    orderId: Joi.string().optional(),
    amount: Joi.string().optional(),
    reason: Joi.string().optional(),
    announcementTitle: Joi.string().optional(),
    announcementBody: Joi.string().optional(),
    verificationUrl: Joi.string().uri().optional(),
    resetUrl: Joi.string().uri().optional(),
    creatorDashboardUrl: Joi.string().uri().optional(),
    eventUrl: Joi.string().uri().optional(),
    orderUrl: Joi.string().uri().optional(),
    platformUrl: Joi.string().uri().optional(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach(detail => {
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

export const validateEmailQuery = (data: any) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
    offset: Joi.number().integer().min(0).default(0).optional(),
    userId: Joi.string().optional(),
    batchSize: Joi.number().integer().min(1).max(50).default(10).optional(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach(detail => {
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
