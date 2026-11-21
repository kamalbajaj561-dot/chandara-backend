import { PushProvider, PushPayload } from '../providers/pushProvider.interface';
import { FCMProvider } from '../providers/fcmProvider';
import { MockPushProvider } from '../providers/mockPushProvider';
import { deviceTokenRepository } from '../repositories/deviceToken.repository';
import { PushLog } from '../types';
import logger from '../utils/logger';
import { getCache, setCache, getRedisClient } from '../services/redis';

/**
 * Push Notification Service
 * Handles push notification delivery with retry logic and delivery logging
 */
export class PushNotificationService {
  private provider: PushProvider;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor(provider?: PushProvider) {
    // Use FCM provider in production, Mock in development
    const env = process.env.NODE_ENV || 'development';
    this.provider = provider || (env === 'production' ? new FCMProvider() : new MockPushProvider());
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(userId: string, payload: PushPayload): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      // Check user notification preferences (from Phase 8A)
      const userPrefs = await this.getUserPreferences(userId);
      if (!userPrefs?.pushEnabled) {
        logger.info(`Push notifications disabled for user: ${userId}`);
        return { success: true, sent: 0, failed: 0, errors: [] };
      }

      // Check quiet hours
      if (this.isQuietHours(userPrefs)) {
        logger.info(`Quiet hours for user: ${userId}, queuing notification`);
        // Queue for later delivery
        await this.queueForLater(userId, payload);
        return { success: true, sent: 0, failed: 0, errors: [] };
      }

      // Get user's active devices
      const devices = await deviceTokenRepository.findByUserId(userId);
      if (devices.length === 0) {
        logger.warn(`No active devices found for user: ${userId}`);
        return { success: true, sent: 0, failed: 0, errors: [] };
      }

      // Send to all devices
      const results = await this.sendToDevices(devices.map(d => d.token), payload);
      
      // Log delivery
      await this.logDelivery(userId, payload, results);

      return results;
    } catch (error: any) {
      logger.error(`Failed to send push to user ${userId}: ${error.message}`);
      return { success: false, sent: 0, failed: 1, errors: [error.message] };
    }
  }

  /**
   * Send push notification to specific device
   */
  async sendToDevice(deviceId: string, payload: PushPayload): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const device = await deviceTokenRepository.findById(deviceId);
      if (!device || !device.active) {
        return { success: false, error: 'Device not found or inactive' };
      }

      const result = await this.provider.send(device.token, payload);
      
      // Update last seen
      await deviceTokenRepository.updateLastSeen(deviceId);

      // Handle invalid tokens
      if (result.invalidTokens && result.invalidTokens.length > 0) {
        await deviceTokenRepository.deactivate(deviceId);
      }

      // Log delivery
      await this.logDeviceDelivery(deviceId, payload, result);

      return { success: result.success, error: result.error };
    } catch (error: any) {
      logger.error(`Failed to send push to device ${deviceId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(deviceTokens: string[], payload: PushPayload): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const results = await this.provider.sendBatch(deviceTokens, payload);
      
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.success) {
          sent++;
        } else {
          failed++;
          if (result.error) errors.push(result.error);
          
          // Deactivate invalid tokens
          if (result.invalidTokens && result.invalidTokens.length > 0) {
            this.deactivateTokenByString(deviceTokens[index]);
          }
        }
      });

      return { success: failed === 0, sent, failed, errors };
    } catch (error: any) {
      logger.error(`Failed to send batch push: ${error.message}`);
      return { success: false, sent: 0, failed: deviceTokens.length, errors: [error.message] };
    }
  }

  /**
   * Send push notification to a topic
   */
  async sendToTopic(topic: string, payload: PushPayload): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await this.provider.sendToTopic(topic, payload);
      
      // Log topic delivery
      await this.logTopicDelivery(topic, payload, result);

      return { success: result.success, error: result.error };
    } catch (error: any) {
      logger.error(`Failed to send push to topic ${topic}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send silent push (data only, no notification)
   */
  async sendSilentPush(userId: string, data: Record<string, any>): Promise<{
    success: boolean;
    sent: number;
    failed: number;
  }> {
    const payload: PushPayload = {
      title: '',
      body: '',
      data,
      silent: true,
    };

    return this.sendToUser(userId, payload);
  }

  /**
   * Update badge count for user
   */
  async updateBadge(userId: string, badge: number): Promise<void> {
    const payload: PushPayload = {
      title: '',
      body: '',
      badge,
      silent: true,
    };

    await this.sendToUser(userId, payload);
  }

  /**
   * Subscribe device to topic
   */
  async subscribeToTopic(deviceId: string, topic: string): Promise<void> {
    const device = await deviceTokenRepository.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await this.provider.subscribeToTopic(device.token, topic);
    logger.info(`Device ${deviceId} subscribed to topic ${topic}`);
  }

  /**
   * Unsubscribe device from topic
   */
  async unsubscribeFromTopic(deviceId: string, topic: string): Promise<void> {
    const device = await deviceTokenRepository.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    await this.provider.unsubscribeFromTopic(device.token, topic);
    logger.info(`Device ${deviceId} unsubscribed from topic ${topic}`);
  }

  /**
   * Retry failed push notification
   */
  async retryPush(pushLogId: string): Promise<boolean> {
    try {
      // Get push log from cache or database
      const cached = await getCache<PushLog>(`push_log:${pushLogId}`);
      if (!cached) {
        logger.error(`Push log not found: ${pushLogId}`);
        return false;
      }

      const pushLog = cached.data;
      
      if (!pushLog) {
        logger.error(`Push log data not found: ${pushLogId}`);
        return false;
      }

      if ((pushLog.retryCount || 0) >= this.maxRetries) {
        logger.error(`Max retries exceeded for push: ${pushLogId}`);
        return false;
      }

      // Wait before retry (exponential backoff)
      const delay = this.retryDelay * Math.pow(2, pushLog.retryCount || 0);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the push
      let result;
      if (pushLog.deviceId) {
        result = await this.sendToDevice(pushLog.deviceId, {
          title: pushLog.title,
          body: pushLog.body,
          data: pushLog.data || undefined,
        });
      } else if (pushLog.topic) {
        result = await this.sendToTopic(pushLog.topic, {
          title: pushLog.title,
          body: pushLog.body,
          data: pushLog.data || undefined,
        });
      } else {
        return false;
      }

      // Update retry count
      pushLog.retryCount = (pushLog.retryCount || 0) + 1;
      await setCache(`push_log:${pushLogId}`, JSON.stringify(pushLog), 3600);

      return result.success;
    } catch (error: any) {
      logger.error(`Failed to retry push ${pushLogId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    try {
      const cachedResult = await getCache<string>(`user_prefs:${userId}`);
      if (cachedResult.data) {
        return JSON.parse(cachedResult.data);
      }
      
      // Return default preferences
      const defaults = {
        pushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };
      
      await setCache(`user_prefs:${userId}`, JSON.stringify(defaults), 3600);
      return defaults;
    } catch (error) {
      logger.error(`Failed to get user preferences: ${error}`);
      return { pushEnabled: true };
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(prefs: any): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    return currentTime >= prefs.quietHoursStart || currentTime < prefs.quietHoursEnd;
  }

  /**
   * Queue notification for later delivery
   */
  private async queueForLater(userId: string, payload: PushPayload): Promise<void> {
    const client = getRedisClient();
    const queueKey = 'push:queued';

    const queuedItem = {
      userId,
      payload,
      queuedAt: new Date(),
      retryCount: 0,
    };

    await client.lPush(queueKey, JSON.stringify(queuedItem));
    logger.info(`Queued notification for user ${userId}: ${payload.title}`);
  }

  /**
   * Process queued notifications (called by scheduler)
   */
  async processQueuedNotifications(batchSize = 10): Promise<number> {
    const client = getRedisClient();
    const queueKey = 'push:queued';

    let processed = 0;

    for (let i = 0; i < batchSize; i++) {
      const itemStr = await client.rPop(queueKey);
      if (!itemStr) break;

      try {
        const item = JSON.parse(itemStr);
        const prefs = await this.getUserPreferences(item.userId);

        // Check if still in quiet hours
        if (this.isQuietHours(prefs)) {
          // Re-queue for later
          await client.lPush(queueKey, itemStr);
          continue;
        }

        // Send the notification
        await this.sendToUser(item.userId, item.payload);
        processed++;
      } catch (error) {
        logger.error('Error processing queued notification:', error);
      }
    }

    if (processed > 0) {
      logger.info(`Processed ${processed} queued push notifications`);
    }

    return processed;
  }

  /**
   * Log delivery to user
   */
  private async logDelivery(userId: string, payload: PushPayload, results: any): Promise<void> {
    const log: PushLog = {
      id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: results.success ? 'sent' : 'failed',
      provider: this.provider.getProviderName(),
      priority: payload.priority,
      ttl: payload.ttl,
      silent: payload.silent,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Cache for 24 hours
    await setCache(`push_log:${log.id}`, JSON.stringify(log), 86400);
  }

  /**
   * Log device delivery
   */
  private async logDeviceDelivery(deviceId: string, payload: PushPayload, result: any): Promise<void> {
    const log: PushLog = {
      id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: result.success ? 'sent' : 'failed',
      provider: this.provider.getProviderName(),
      messageId: result.messageId,
      error: result.error,
      priority: payload.priority,
      ttl: payload.ttl,
      silent: payload.silent,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setCache(`push_log:${log.id}`, JSON.stringify(log), 86400);
  }

  /**
   * Log topic delivery
   */
  private async logTopicDelivery(topic: string, payload: PushPayload, result: any): Promise<void> {
    const log: PushLog = {
      id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      status: result.success ? 'sent' : 'failed',
      provider: this.provider.getProviderName(),
      messageId: result.messageId,
      error: result.error,
      priority: payload.priority,
      ttl: payload.ttl,
      silent: payload.silent,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setCache(`push_log:${log.id}`, JSON.stringify(log), 86400);
  }

  /**
   * Deactivate token by string
   */
  private async deactivateTokenByString(token: string): Promise<void> {
    const device = await deviceTokenRepository.findByToken(token);
    if (device) {
      await deviceTokenRepository.deactivate(device.deviceId);
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }
}

let pushNotificationServiceInstance: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!pushNotificationServiceInstance) {
    pushNotificationServiceInstance = new PushNotificationService();
  }
  return pushNotificationServiceInstance;
}

// Lazy export that initializes on first access
export const pushNotificationService = new Proxy({} as PushNotificationService, {
  get(_target, prop) {
    return getPushNotificationService()[prop as keyof PushNotificationService];
  },
  set(_target, prop, value) {
    (getPushNotificationService() as any)[prop] = value;
    return true;
  }
});
