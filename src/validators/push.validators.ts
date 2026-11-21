import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

/**
 * Validate device registration
 */
export const validateDeviceRegistration = (data: any): void => {
  const schema = Joi.object({
    deviceId: Joi.string().required().min(1).max(255),
    token: Joi.string().required().min(1).max(1000),
    platform: Joi.string().valid('ios', 'android', 'web').required(),
    appVersion: Joi.string().max(50),
    deviceModel: Joi.string().max(100),
    osVersion: Joi.string().max(50),
    timezone: Joi.string().max(50),
    language: Joi.string().max(10),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
};

/**
 * Validate push send request
 */
export const validatePushSend = (data: any): void => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    title: Joi.string().required().min(1).max(200),
    body: Joi.string().required().min(1).max(1000),
    data: Joi.object(),
    priority: Joi.string().valid('normal', 'high'),
    ttl: Joi.number().min(0).max(86400), // Max 24 hours
    silent: Joi.boolean(),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
};

/**
 * Validate topic push send request
 */
export const validateTopicPushSend = (data: any): void => {
  const schema = Joi.object({
    topic: Joi.string().required().min(1).max(255),
    title: Joi.string().required().min(1).max(200),
    body: Joi.string().required().min(1).max(1000),
    data: Joi.object(),
    priority: Joi.string().valid('normal', 'high'),
    ttl: Joi.number().min(0).max(86400),
    silent: Joi.boolean(),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
};

/**
 * Validate schedule push request
 */
export const validateSchedulePush = (data: any): void => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    title: Joi.string().required().min(1).max(200),
    body: Joi.string().required().min(1).max(1000),
    scheduledFor: Joi.date().iso().required().min('now'),
    data: Joi.object(),
  });

  const { error } = schema.validate(data);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
};

/**
 * Validate update schedule request
 */
export const validateUpdateSchedule = (data: any): void => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(200),
    body: Joi.string().min(1).max(1000),
    scheduledFor: Joi.date().iso().min('now'),
    data: Joi.object(),
  }).min(1);

  const { error } = schema.validate(data);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
};

/**
 * Validate cron expression
 */
export const validateCronExpression = (cronExpression: string): void => {
  // Basic cron validation (5 parts: minute hour day month weekday)
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  
  if (!cronRegex.test(cronExpression)) {
    throw new AppError('Invalid cron expression', 400);
  }
};

/**
 * Validate logs query parameters
 */
export const validateLogsQuery = (query: any): void => {
  const schema = Joi.object({
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0),
  });

  const { error, value } = schema.validate(query);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Update the query object with validated values
  Object.assign(query, value);
};

/**
 * Validate test notification request
 */
export const validateTestNotification = (data: any): void => {
  const schema = Joi.object({
    title: Joi.string().min(1).max(200).default('Test Notification'),
    body: Joi.string().min(1).max(1000).default('This is a test push notification'),
    data: Joi.object().default({ type: 'test' }),
  });

  const { error, value } = schema.validate(data);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Update the data object with validated values
  Object.assign(data, value);
};
