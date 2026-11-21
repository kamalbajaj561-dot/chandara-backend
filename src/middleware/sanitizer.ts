import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Remove HTML tags (basic XSS protection)
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove common XSS patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return email;
  return email.toLowerCase().trim();
};

/**
 * Sanitize URL
 */
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return url;
  const trimmed = url.trim();
  // Basic URL validation - only allow http/https
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return '';
};

/**
 * Sanitize number input
 */
export const sanitizeNumber = (input: any): number => {
  const num = Number(input);
  return isNaN(num) ? 0 : num;
};

/**
 * Sanitize boolean input
 */
export const sanitizeBoolean = (input: any): boolean => {
  if (typeof input === 'boolean') return input;
  if (input === 'true' || input === '1') return true;
  if (input === 'false' || input === '0') return false;
  return false;
};

/**
 * Sanitize array input (remove potential prototype pollution)
 */
export const sanitizeArray = (input: any): any[] => {
  if (!Array.isArray(input)) return [];
  return input.filter(item => {
    // Reject items that could cause prototype pollution
    if (typeof item === 'string' && (item === '__proto__' || item === 'constructor' || item === 'prototype')) {
      return false;
    }
    return true;
  });
};

/**
 * Sanitize object input (remove potential prototype pollution)
 */
export const sanitizeObject = (input: any): any => {
  if (typeof input !== 'object' || input === null) return input;
  
  const sanitized: any = {};
  for (const key in input) {
    // Skip prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key] = input[key];
  }
  return sanitized;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
    
    // Recursively sanitize string values in the body
    const sanitizeRecursive = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeRecursive);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const key in obj) {
          if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
            sanitized[key] = sanitizeRecursive(obj[key]);
          }
        }
        return sanitized;
      }
      return obj;
    };
    
    req.body = sanitizeRecursive(req.body);
  }
  next();
};

/**
 * Middleware to sanitize request query parameters
 */
export const sanitizeQuery = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.query) {
    const sanitized: any = {};
    for (const key in req.query) {
      if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        const value = req.query[key];
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((v: any) => typeof v === 'string' ? sanitizeString(v) : v);
        } else {
          sanitized[key] = value;
        }
      }
    }
    req.query = sanitized;
  }
  next();
};

/**
 * Middleware to sanitize request parameters
 */
export const sanitizeParams = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.params) {
    const sanitized: any = {};
    for (const key in req.params) {
      if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        sanitized[key] = sanitizeString(req.params[key]);
      }
    }
    req.params = sanitized;
  }
  next();
};

/**
 * Combined sanitization middleware
 */
export const sanitizeInput = [
  sanitizeParams,
  sanitizeQuery,
  sanitizeBody,
];

/**
 * Middleware to prevent NoSQL injection in MongoDB/Firestore queries
 * This checks for common NoSQL injection patterns
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction): void => {
  const checkForInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      // Check for common NoSQL injection patterns
      const injectionPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$gt/i,
        /\$lt/i,
        /\$in/i,
        /\$nin/i,
        /\$or/i,
        /\$and/i,
        /\$not/i,
        /\$exists/i,
        /\$regex/i,
        /\$expr/i,
      ];
      
      return injectionPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$')) {
          return true;
        }
        if (checkForInjection(obj[key])) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
    res.status(400).json({
      success: false,
      error: 'Invalid input detected',
    });
    return;
  }
  
  next();
};
