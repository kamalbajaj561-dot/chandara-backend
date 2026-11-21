import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiResponse } from '../types';
import config from '../config';
import { randomBytes } from 'crypto';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string[]>;
  errorId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    this.errorId = randomBytes(8).toString('hex');

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errorId = err instanceof AppError ? err.errorId : randomBytes(8).toString('hex');
  const isProduction = config.nodeEnv === 'production';

  if (err instanceof AppError) {
    logger.error(`Operational Error [${errorId}]: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      errorId,
    });

    const response: ApiResponse = {
      success: false,
      error: err.message,
      ...(isProduction && { errorId }), // Include error ID in production for support
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Unexpected errors - log full details but hide from client in production
  logger.error(`Unexpected Error [${errorId}]: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    errorId,
  });

  const response: ApiResponse = {
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction && { errorId }), // Include error ID in production for support
  };

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorId = randomBytes(8).toString('hex');
  
  logger.warn(`Route not found [${errorId}]: ${req.originalUrl}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    errorId,
  });

  const response: ApiResponse = {
    success: false,
    error: 'Route not found',
    ...(config.nodeEnv === 'production' && { errorId }),
  };

  res.status(404).json(response);
};
