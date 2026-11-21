/**
 * Push Provider Interface
 * Defines the contract for push notification providers
 * Implementations: FCM, Mock, OneSignal, Expo, Apple Push, Huawei Push
 */

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  sound?: string;
  badge?: number;
  priority?: 'normal' | 'high';
  collapseKey?: string;
  ttl?: number; // Time to live in seconds
  silent?: boolean;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  invalidTokens?: string[];
}

export interface PushProvider {
  /**
   * Send a push notification to a single device
   */
  send(deviceToken: string, payload: PushPayload): Promise<PushResult>;

  /**
   * Send push notifications to multiple devices
   */
  sendBatch(deviceTokens: string[], payload: PushPayload): Promise<PushResult[]>;

  /**
   * Send a push notification to a topic
   */
  sendToTopic(topic: string, payload: PushPayload): Promise<PushResult>;

  /**
   * Subscribe a device to a topic
   */
  subscribeToTopic(deviceToken: string, topic: string): Promise<void>;

  /**
   * Unsubscribe a device from a topic
   */
  unsubscribeFromTopic(deviceToken: string, topic: string): Promise<void>;

  /**
   * Validate a device token
   */
  validateToken(deviceToken: string): Promise<boolean>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
