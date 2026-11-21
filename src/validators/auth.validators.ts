import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../middleware/errorHandler';

export const validateRegister = (req: Request, _res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),
    displayName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name must not exceed 50 characters',
      'any.required': 'Display name is required',
    }),
    role: Joi.string().valid('viewer', 'creator').optional().messages({
      'any.only': 'Role must be either viewer or creator',
    }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  req.body = value;
  next();
};

export const validateLogin = (req: Request, _res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  req.body = value;
  next();
};

export const validateRefreshToken = (req: Request, _res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  req.body = value;
  next();
};

export const validateResetPassword = (req: Request, _res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  req.body = value;
  next();
};

export const validateConfirmResetPassword = (req: Request, _res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    oobCode: Joi.string().required().messages({
      'any.required': 'Reset code is required',
    }),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required',
      }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  req.body = value;
  next();
};

export const validateVerifyEmail = (req: Request, _res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    oobCode: Joi.string().required().messages({
      'any.required': 'Verification code is required',
    }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
  });

  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  req.body = value;
  next();
};
