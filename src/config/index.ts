import dotenv from 'dotenv';

dotenv.config();

/**
 * Validate required environment variables
 * Throws an error if critical variables are missing in production
 */
export function validateConfig(): void {
  const requiredVars: Record<string, string> = {
    'FIREBASE_PROJECT_ID': config.firebase.projectId,
    'FIREBASE_CLIENT_EMAIL': config.firebase.clientEmail,
    'JWT_SECRET': config.jwt.secret,
  };

  // If not using service account key file, require private key
  if (!config.firebase.serviceAccountKeyPath) {
    requiredVars['FIREBASE_PRIVATE_KEY'] = config.firebase.privateKey;
  }

  const missing: string[] = [];

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    if (config.nodeEnv === 'production') {
      throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
    } else {
      console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    }
  }

  // Warn about weak JWT secret in production
  if (config.nodeEnv === 'production' && config.jwt.secret.length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters in production');
  }
}

interface Config {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
    databaseUrl: string;
    serviceAccountKeyPath: string;
  };
  livekit: {
    url: string;
    apiKey: string;
    apiSecret: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    connectTimeoutMs: number;
    reconnectMaxRetries: number;
    commandTimeoutMs: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  cors: {
    origin: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    filePath: string;
  };
  socket: {
    corsOrigin: string;
  };
  security: {
    csp: {
      defaultSrc: string[];
      scriptSrc: string[];
      styleSrc: string[];
      imgSrc: string[];
      connectSrc: string[];
      fontSrc: string[];
      objectSrc: string[];
      mediaSrc: string[];
      frameSrc: string[];
    };
  };
  razorpay: {
    keyId: string;
    keySecret: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
    fromName: string;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    databaseUrl: process.env.FIREBASE_DATABASE_URL || '',
    serviceAccountKeyPath: process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || '',
  },
  livekit: {
    url: process.env.LIVEKIT_URL || '',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    connectTimeoutMs: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '10000', 10),
    reconnectMaxRetries: parseInt(process.env.REDIS_RECONNECT_MAX_RETRIES || '10', 10),
    commandTimeoutMs: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '5000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs',
  },
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
  },
  security: {
    csp: {
      defaultSrc: process.env.CSP_DEFAULT_SRC
        ? process.env.CSP_DEFAULT_SRC.split(',').map((s) => s.trim())
        : ["'self'"],
      scriptSrc: process.env.CSP_SCRIPT_SRC
        ? process.env.CSP_SCRIPT_SRC.split(',').map((s) => s.trim())
        : ["'self'", "'unsafe-inline'", 'https://www.gstatic.com', 'https://cdn.jsdelivr.net'],
      styleSrc: process.env.CSP_STYLE_SRC
        ? process.env.CSP_STYLE_SRC.split(',').map((s) => s.trim())
        : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: process.env.CSP_IMG_SRC
        ? process.env.CSP_IMG_SRC.split(',').map((s) => s.trim())
        : ["'self'", 'data:', 'https:'],
      connectSrc: process.env.CSP_CONNECT_SRC
        ? process.env.CSP_CONNECT_SRC.split(',').map((s) => s.trim())
        : ["'self'", 'https://*.firebaseio.com', 'https://*.firebasedatabase.app', 'wss://*.livekit.cloud', 'http://localhost:7880', 'ws://localhost:7880', 'ws://localhost:*', 'wss://localhost:*', 'https://cdn.jsdelivr.net'],
      fontSrc: process.env.CSP_FONT_SRC
        ? process.env.CSP_FONT_SRC.split(',').map((s) => s.trim())
        : ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: process.env.CSP_OBJECT_SRC
        ? process.env.CSP_OBJECT_SRC.split(',').map((s) => s.trim())
        : ["'none'"],
      mediaSrc: process.env.CSP_MEDIA_SRC
        ? process.env.CSP_MEDIA_SRC.split(',').map((s) => s.trim())
        : ["'self'"],
      frameSrc: process.env.CSP_FRAME_SRC
        ? process.env.CSP_FRAME_SRC.split(',').map((s) => s.trim())
        : ["'self'"],
    },
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@chandara.com',
    fromName: process.env.SMTP_FROM_NAME || 'Chandara',
  },
};

export default config;
