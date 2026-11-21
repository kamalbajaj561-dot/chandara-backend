import admin from 'firebase-admin';
import { PushProvider, PushPayload, PushResult } from './pushProvider.interface';
import logger from '../utils/logger';

/**
 * Firebase Cloud Messaging (FCM) Provider
 * Implements push notifications using Firebase Cloud Messaging
 */
export class FCMProvider implements PushProvider {
  private messaging: admin.messaging.Messaging;

  constructor() {
    this.messaging = admin.messaging();
  }

  async send(deviceToken: string, payload: PushPayload): Promise<PushResult> {
    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: payload.data,
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          ttl: payload.ttl ? payload.ttl * 1000 : undefined, // Convert to milliseconds
          notification: {
            sound: payload.sound || 'default',
            notificationCount: payload.badge,
          },
        },
        apns: {
          payload: {
                aps: {
                  badge: payload.badge,
                  sound: payload.sound || 'default',
                  'content-available': payload.silent ? 1 : undefined,
                },
              },
        },
      };

      if (payload.collapseKey) {
        message.android = { ...message.android, collapseKey: payload.collapseKey };
      }

      const messageId = await this.messaging.send(message);
      logger.info(`FCM message sent successfully: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error(`FCM send failed: ${error.message}`, { deviceToken, error });

      // Check if token is invalid
      const invalidTokens: string[] = [];
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        invalidTokens.push(deviceToken);
      }

      return {
        success: false,
        error: error.message,
        invalidTokens,
      };
    }
  }

  async sendBatch(deviceTokens: string[], payload: PushPayload): Promise<PushResult[]> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: payload.data,
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          ttl: payload.ttl ? payload.ttl * 1000 : undefined,
          notification: {
            sound: payload.sound || 'default',
            notificationCount: payload.badge,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              sound: payload.sound || 'default',
              'content-available': payload.silent ? 1 : undefined,
            },
          },
        },
      };

      if (payload.collapseKey) {
        message.android = { ...message.android, collapseKey: payload.collapseKey };
      }

      const response = await this.messaging.sendMulticast(message);
      logger.info(`FCM batch sent: ${response.successCount} success, ${response.failureCount} failed`);

      const results: PushResult[] = [];
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, index) => {
        if (resp.success) {
          results.push({
            success: true,
            messageId: resp.messageId,
          });
        } else {
          const error = resp.error;
          if (error?.code === 'messaging/registration-token-not-registered' ||
              error?.code === 'messaging/invalid-registration-token') {
            invalidTokens.push(deviceTokens[index]);
          }
          results.push({
            success: false,
            error: error?.message,
          });
        }
      });

      // Add invalid tokens to failed results
      if (invalidTokens.length > 0) {
        results.forEach(result => {
          if (!result.success) {
            result.invalidTokens = invalidTokens;
          }
        });
      }

      return results;
    } catch (error: any) {
      logger.error(`FCM batch send failed: ${error.message}`, { error });
      
      return deviceTokens.map(() => ({
        success: false,
        error: error.message,
      }));
    }
  }

  async sendToTopic(topic: string, payload: PushPayload): Promise<PushResult> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: payload.data,
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          ttl: payload.ttl ? payload.ttl * 1000 : undefined,
          notification: {
            sound: payload.sound || 'default',
            notificationCount: payload.badge,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              sound: payload.sound || 'default',
              'content-available': payload.silent ? 1 : undefined,
            },
          },
        },
      };

      if (payload.collapseKey) {
        message.android = { ...message.android, collapseKey: payload.collapseKey };
      }

      const messageId = await this.messaging.send(message);
      logger.info(`FCM topic message sent: ${messageId} to topic: ${topic}`);

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      logger.error(`FCM topic send failed: ${error.message}`, { topic, error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<void> {
    try {
      await this.messaging.subscribeToTopic(deviceToken, topic);
      logger.info(`Device subscribed to topic: ${topic}`);
    } catch (error: any) {
      logger.error(`FCM subscribe failed: ${error.message}`, { deviceToken, topic });
      throw error;
    }
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<void> {
    try {
      await this.messaging.unsubscribeFromTopic(deviceToken, topic);
      logger.info(`Device unsubscribed from topic: ${topic}`);
    } catch (error: any) {
      logger.error(`FCM unsubscribe failed: ${error.message}`, { deviceToken, topic });
      throw error;
    }
  }

  async validateToken(deviceToken: string): Promise<boolean> {
    try {
      // Send a silent test message to validate the token
      const message: admin.messaging.Message = {
        token: deviceToken,
        data: { test: 'true' },
        android: { priority: 'normal' },
        apns: {
          payload: {
            aps: {
              'content-available': 1,
            },
          },
        },
      };

      await this.messaging.send(message);
      return true;
    } catch (error: any) {
      // Token is invalid if it's not registered
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        return false;
      }
      // Other errors might be temporary, so return true
      return true;
    }
  }

  getProviderName(): string {
    return 'FCM';
  }
}
