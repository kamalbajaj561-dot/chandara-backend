import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateStartStream = (data: any) => {
  const schema = Joi.object({
    recordingEnabled: Joi.boolean().strict().default(false),
  });

  const { error, value } = schema.validate(data);

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });
    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateStopStream = (data: any) => {
  const schema = Joi.object({});

  const { error, value } = schema.validate(data);

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });
    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateTokenRequest = (data: any) => {
  const schema = Joi.object({
    role: Joi.string().valid('publisher', 'subscriber', 'moderator').required(),
  });

  const { error, value } = schema.validate(data);

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });
    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateUpdateViewers = (data: any) => {
  const schema = Joi.object({
    delta: Joi.number().integer().min(-1000).max(1000).required(),
  });

  const { error, value } = schema.validate(data);

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });
    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateUpdateHealth = (data: any) => {
  const schema = Joi.object({
    publisherConnected: Joi.boolean().optional(),
    roomExists: Joi.boolean().optional(),
    viewerCount: Joi.number().min(0).optional(),
    reconnectAttempts: Joi.number().min(0).optional(),
    liveKitAvailable: Joi.boolean().optional(),
    health: Joi.string().valid('healthy', 'warning', 'offline').optional(),
  }).min(1);

  const { error, value } = schema.validate(data);

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });
    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};

export const validateJoinStream = (data: any) => {
  const schema = Joi.object({
    role: Joi.string().valid('subscriber', 'moderator').default('subscriber'),
  });

  const { error, value } = schema.validate(data);

  if (error) {
    const errors: Record<string, string[]> = {};
    error.details.forEach((detail: any) => {
      const field = detail.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(detail.message);
    });
    throw new AppError('Validation failed', 400, true, errors);
  }

  return value;
};
