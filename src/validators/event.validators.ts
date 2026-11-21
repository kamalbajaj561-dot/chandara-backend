import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateCreateEvent = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(5000).required(),
    category: Joi.string().valid('music', 'sports', 'gaming', 'education', 'entertainment', 'business', 'other').required(),
    tags: Joi.array().items(Joi.string().min(2).max(30)).max(10).optional(),
    country: Joi.string().length(2).uppercase().required(),
    city: Joi.string().min(2).max(100).required(),
    venue: Joi.string().max(200).optional(),
    ticketPrice: Joi.number().min(0).max(10000).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    cameraType: Joi.string().valid('4K', '1080p', '720p').required(),
    streamType: Joi.string().valid('live', 'vr', '360').required(),
    eventDate: Joi.date().iso().greater('now').required(),
    eventTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    timezone: Joi.string().optional(),
    duration: Joi.number().min(15).max(480).optional(),
    thumbnail: Joi.string().uri().optional(),
    banner: Joi.string().uri().optional(),
    capacity: Joi.number().min(1).max(1000000).required(),
    language: Joi.string().length(2).optional(),
    ageRestriction: Joi.number().min(0).max(21).optional(),
    featured: Joi.boolean().default(false),
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

export const validateUpdateEvent = (data: any) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(5000).optional(),
    category: Joi.string().valid('music', 'sports', 'gaming', 'education', 'entertainment', 'business', 'other').optional(),
    tags: Joi.array().items(Joi.string().min(2).max(30)).max(10).optional(),
    country: Joi.string().length(2).uppercase().optional(),
    city: Joi.string().min(2).max(100).optional(),
    venue: Joi.string().max(200).optional(),
    ticketPrice: Joi.number().min(0).max(10000).optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    cameraType: Joi.string().valid('4K', '1080p', '720p').optional(),
    streamType: Joi.string().valid('live', 'vr', '360').optional(),
    eventDate: Joi.date().iso().greater('now').optional(),
    eventTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: Joi.string().optional(),
    duration: Joi.number().min(15).max(480).optional(),
    thumbnail: Joi.string().uri().optional(),
    banner: Joi.string().uri().optional(),
    capacity: Joi.number().min(1).max(1000000).optional(),
    language: Joi.string().length(2).optional(),
    ageRestriction: Joi.number().min(0).max(21).optional(),
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

export const validateSearchEvents = (data: any) => {
  const schema = Joi.object({
    query: Joi.string().min(2).max(100).required(),
    limit: Joi.number().min(1).max(50).default(20),
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

export const validateListEvents = (data: any) => {
  const schema = Joi.object({
    limit: Joi.number().min(1).max(100).default(20),
    offset: Joi.number().min(0).default(0),
    status: Joi.string().valid('draft', 'scheduled', 'live', 'ended', 'cancelled').optional(),
    category: Joi.string().valid('music', 'sports', 'gaming', 'education', 'entertainment', 'business', 'other').optional(),
    featured: Joi.boolean().optional(),
    creatorUid: Joi.string().optional(),
    language: Joi.string().length(2).optional(),
    country: Joi.string().length(2).uppercase().optional(),
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

export const validateEventsByTags = (data: any) => {
  const schema = Joi.object({
    tags: Joi.array().items(Joi.string().min(2).max(30)).min(1).max(10).required(),
    limit: Joi.number().min(1).max(50).default(20),
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

export const validateSetFeatured = (data: any) => {
  const schema = Joi.object({
    featured: Joi.boolean().required(),
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
