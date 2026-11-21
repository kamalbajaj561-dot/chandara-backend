import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }: winston.Logform.TransformableInfo) => {
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

// Create separate loggers for different log types
const createLogger = (filename: string, level: string = 'info') => {
  return winston.createLogger({
    level,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      json()
    ),
    transports: [
      new winston.transports.File({
        filename: `${config.logging.filePath}/${filename}`,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
};

// Security logger - for authentication, authorization, and security events
const securityLogger = createLogger('security.log', 'warn');

// Audit logger - for admin actions and sensitive operations
const auditLogger = createLogger('audit.log', 'info');

// Application logger - for general application events
const appLogger = createLogger('application.log', 'info');

// Error logger - for errors only
const errorLogger = createLogger('error.log', 'error');

// Main logger with all transports
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    ...errorLogger.transports,
  ],
}) as winston.Logger & {
  security: { warn: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void };
  audit: { info: (msg: string, meta?: any) => void; warn: (msg: string, meta?: any) => void };
  app: { info: (msg: string, meta?: any) => void; debug: (msg: string, meta?: any) => void };
};

// Security logging methods
logger.security = {
  warn: (message: string, meta?: any) => {
    securityLogger.warn(message, meta);
    logger.warn(`[SECURITY] ${message}`, meta);
  },
  error: (message: string, meta?: any) => {
    securityLogger.error(message, meta);
    logger.error(`[SECURITY] ${message}`, meta);
  },
};

// Audit logging methods
logger.audit = {
  info: (message: string, meta?: any) => {
    auditLogger.info(message, meta);
    logger.info(`[AUDIT] ${message}`, meta);
  },
  warn: (message: string, meta?: any) => {
    auditLogger.warn(message, meta);
    logger.warn(`[AUDIT] ${message}`, meta);
  },
};

// Application logging methods
logger.app = {
  info: (message: string, meta?: any) => {
    appLogger.info(message, meta);
    logger.info(`[APP] ${message}`, meta);
  },
  debug: (message: string, meta?: any) => {
    appLogger.debug(message, meta);
    logger.debug(`[APP] ${message}`, meta);
  },
};

if (config.nodeEnv === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;
