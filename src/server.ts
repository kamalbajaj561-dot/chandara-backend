import http from 'http';
import app from './app';
import config, { validateConfig } from './config';
import logger from './utils/logger';
import { initializeFirebase } from './services/firebase';
import { initializeRedis, getRedisClient } from './services/redis';
import { initializeSocket, getIO } from './sockets';
import { getSchedulerService } from './services/scheduler.service';

const server = http.createServer(app);

const PORT = config.port;
const SHUTDOWN_TIMEOUT_MS = 30000; // 30 seconds for graceful shutdown
const MEMORY_WARNING_THRESHOLD = 0.85; // 85% memory usage triggers warning
const MEMORY_CRITICAL_THRESHOLD = 0.95; // 95% memory usage triggers critical alert

/**
 * Start memory monitoring to track and alert on high memory usage
 */
function startMemoryMonitoring(): void {
  const checkInterval = 60000; // Check every 60 seconds

  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const memoryPercentage = heapUsed / heapTotal;

    if (memoryPercentage >= MEMORY_CRITICAL_THRESHOLD) {
      logger.error(`CRITICAL: Memory usage at ${(memoryPercentage * 100).toFixed(2)}% (${(heapUsed / 1024 / 1024).toFixed(2)}MB / ${(heapTotal / 1024 / 1024).toFixed(2)}MB)`);
    } else if (memoryPercentage >= MEMORY_WARNING_THRESHOLD) {
      logger.warn(`WARNING: Memory usage at ${(memoryPercentage * 100).toFixed(2)}% (${(heapUsed / 1024 / 1024).toFixed(2)}MB / ${(heapTotal / 1024 / 1024).toFixed(2)}MB)`);
    }
  }, checkInterval);

  // Log initial memory state
  const initialMemory = process.memoryUsage();
  logger.info(`Memory monitoring started. Initial usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);
}

async function startServer() {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Initialize Firebase
    await initializeFirebase();
    logger.info('Firebase initialized successfully');

    // Initialize Redis
    await initializeRedis();
    logger.info('Redis initialized successfully');

    // Initialize Socket.io
    initializeSocket(server);
    logger.info('Socket.io initialized successfully');

    // Initialize scheduler service (after Redis is ready)
    const schedulerService = getSchedulerService();
    logger.info('Scheduler service initialized successfully');

    // Start memory monitoring
    startMemoryMonitoring();

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${config.nodeEnv} mode`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`API available at http://localhost:${PORT}${config.apiPrefix}`);
    });

    // Enhanced graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      const shutdownTimeout = setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);

      try {
        // 1. Stop accepting new connections
        server.close(async () => {
          logger.info('HTTP server closed, no longer accepting new connections');
        });

        // 2. Stop Socket.IO
        try {
          const io = getIO();
          if (io) {
            await new Promise<void>((resolve) => {
              io.close((err) => {
                if (err) {
                  logger.error('Error closing Socket.IO:', err);
                } else {
                  logger.info('Socket.IO closed successfully');
                }
                resolve();
              });
            });
          }
        } catch (error) {
          logger.error('Error during Socket.IO shutdown:', error);
        }

        // 3. Stop scheduler
        try {
          await schedulerService.stop();
          logger.info('Scheduler stopped successfully');
        } catch (error) {
          logger.error('Error stopping scheduler:', error);
        }

        // 4. Close Redis connection
        try {
          const redisClient = getRedisClient();
          if (redisClient) {
            await redisClient.quit();
            logger.info('Redis connection closed successfully');
          }
        } catch (error) {
          logger.error('Error closing Redis connection:', error);
        }

        // 5. Clear timeout and exit
        clearTimeout(shutdownTimeout);
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      // Attempt graceful shutdown on uncaught exception
      gracefulShutdown('uncaughtException').catch(() => process.exit(1));
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection:', reason);
      // Attempt graceful shutdown on unhandled rejection
      gracefulShutdown('unhandledRejection').catch(() => process.exit(1));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
