import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateUpdateUserProfile = (data: any) => {
  const schema = Joi.object({
    displayName: Joi.string().min(2).max(50).optional(),
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      }),
    bio: Joi.string().max(500).optional(),
    avatar: Joi.string().uri().optional(),
    banner: Joi.string().uri().optional(),
    language: Joi.string().length(2).optional(),
    country: Joi.string().length(2).optional(),
    socialLinks: Joi.object({
      twitter: Joi.string().uri().optional(),
      instagram: Joi.string().uri().optional(),
      youtube: Joi.string().uri().optional(),
      tiktok: Joi.string().uri().optional(),
      website: Joi.string().uri().optional(),
    }).optional(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};

export const validateUsernameCheck = (data: any) => {
  const schema = Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      }),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};

export const validateSearchUsers = (data: any) => {
  const schema = Joi.object({
    query: Joi.string().min(2).max(50).required(),
    limit: Joi.number().min(1).max(100).optional().default(20),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};

export const validateListUsers = (data: any) => {
  const schema = Joi.object({
    limit: Joi.number().min(1).max(100).optional().default(20),
    offset: Joi.number().min(0).optional().default(0),
    status: Joi.string().valid('active', 'suspended', 'banned').optional(),
    role: Joi.string().valid('viewer', 'creator', 'administrator').optional(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};

export const validateUpdateUserStatus = (data: any) => {
  const schema = Joi.object({
    status: Joi.string().valid('active', 'suspended', 'banned').required(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};

export const validateUpdateUserRole = (data: any) => {
  const schema = Joi.object({
    role: Joi.string().valid('viewer', 'creator', 'administrator').required(),
  });

  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });

    throw new AppError('Validation failed', 400, undefined, errors);
  }

  return value;
};
