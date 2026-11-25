import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import config from './config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import apiRoutes from './routes';

const app: Application = express();

// Security middleware with production settings
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: config.security.csp.defaultSrc,
        scriptSrc: config.security.csp.scriptSrc,
        styleSrc: config.security.csp.styleSrc,
        imgSrc: config.security.csp.imgSrc,
        connectSrc: config.security.csp.connectSrc,
        fontSrc: config.security.csp.fontSrc,
        objectSrc: config.security.csp.objectSrc,
        mediaSrc: config.security.csp.mediaSrc,
        frameSrc: config.security.csp.frameSrc,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
    xContentTypeOptions: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    dnsPrefetchControl: {
      allow: false,
    },
  })
);

// CORS with whitelist
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression
app.use(compression());

// Body parsing
// Keep the raw bytes: payment-provider webhook signatures are computed over the exact request body.
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use(config.apiPrefix, authMiddleware, apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
