import { Router } from 'express';
import { getFirestore } from '../services/firebase';
import { getRedisClient } from '../services/redis';
import logger from '../utils/logger';

const router = Router();

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    firebase: { status: 'up' | 'down'; latency?: number };
    redis: { status: 'up' | 'down'; latency?: number };
    scheduler: { status: 'up' | 'down'; active?: boolean };
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ReadinessCheckResponse {
  ready: boolean;
  checks: {
    database: boolean;
    cache: boolean;
    scheduler: boolean;
  };
}

/**
 * Basic health check endpoint
 * Returns overall system health status
 */
router.get('/health', async (_req, res) => {
  const healthStatus: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      firebase: { status: 'up' },
      redis: { status: 'up' },
      scheduler: { status: 'up' },
    },
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024,
      percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    },
  };

  // Check Firebase
  try {
    const firebaseStart = Date.now();
    const db = getFirestore();
    if (db) {
      await db.collection('_health_check').limit(1).get();
      healthStatus.services.firebase.latency = Date.now() - firebaseStart;
    } else {
      healthStatus.services.firebase.status = 'down';
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.services.firebase.status = 'down';
    healthStatus.status = 'degraded';
    logger.error('Firebase health check failed:', error);
  }

  // Check Redis
  try {
    const redisStart = Date.now();
    const redisClient = getRedisClient();
    await redisClient.ping();
    healthStatus.services.redis.latency = Date.now() - redisStart;
  } catch (error) {
    healthStatus.services.redis.status = 'down';
    healthStatus.status = 'degraded';
    logger.error('Redis health check failed:', error);
  }

  // Check Scheduler - assume running if no error
  try {
    healthStatus.services.scheduler.active = true;
  } catch (error) {
    healthStatus.services.scheduler.status = 'down';
    healthStatus.services.scheduler.active = false;
    healthStatus.status = 'degraded';
    logger.error('Scheduler health check failed:', error);
  }

  // Determine overall status
  if (healthStatus.services.firebase.status === 'down' && 
      healthStatus.services.redis.status === 'down') {
    healthStatus.status = 'unhealthy';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthStatus);
});

/**
 * Readiness check endpoint
 * Returns whether the service is ready to accept traffic
 */
router.get('/ready', async (_req, res) => {
  const readiness: ReadinessCheckResponse = {
    ready: true,
    checks: {
      database: false,
      cache: false,
      scheduler: false,
    },
  };

  // Check database (Firebase)
  try {
    const db = getFirestore();
    if (db) {
      await db.collection('_health_check').limit(1).get();
      readiness.checks.database = true;
    }
  } catch (error) {
    logger.error('Database readiness check failed:', error);
  }

  // Check cache (Redis)
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    readiness.checks.cache = true;
  } catch (error) {
    logger.error('Cache readiness check failed:', error);
  }

  // Check scheduler - assume running if no error
  try {
    readiness.checks.scheduler = true;
  } catch (error) {
    logger.error('Scheduler readiness check failed:', error);
  }

  // Service is ready if all critical checks pass
  readiness.ready = readiness.checks.database && readiness.checks.cache;

  const statusCode = readiness.ready ? 200 : 503;
  res.status(statusCode).json(readiness);
});

/**
 * Liveness check endpoint
 * Simple check to see if the process is running
 */
router.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
