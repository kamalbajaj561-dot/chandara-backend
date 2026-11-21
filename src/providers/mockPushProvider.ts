import { PushProvider, PushPayload, PushResult } from './pushProvider.interface';
import logger from '../utils/logger';

/**
 * Mock Push Provider
 * Used for testing and development
 * Simulates push notification sending without actual delivery
 */
export class MockPushProvider implements PushProvider {
  private mockDelay: number;

  constructor(mockDelay: number = 100) {
    this.mockDelay = mockDelay;
  }

  async send(deviceToken: string, payload: PushPayload): Promise<PushResult> {
    await this.simulateDelay();
    
    logger.info(`[Mock Push] Sent to device: ${deviceToken}`, {
      title: payload.title,
      body: payload.body,
    });

    // Simulate success for most tokens, failure for some
    if (deviceToken.includes('invalid')) {
      return {
        success: false,
        error: 'Invalid token',
        invalidTokens: [deviceToken],
      };
    }

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  async sendBatch(deviceTokens: string[], payload: PushPayload): Promise<PushResult[]> {
    await this.simulateDelay();
    
    logger.info(`[Mock Push] Batch sent to ${deviceTokens.length} devices`, {
      title: payload.title,
      body: payload.body,
    });

    return deviceTokens.map(token => {
      if (token.includes('invalid')) {
        return {
          success: false,
          error: 'Invalid token',
          invalidTokens: [token],
        };
      }
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random()}`,
      };
    });
  }

  async sendToTopic(topic: string, payload: PushPayload): Promise<PushResult> {
    await this.simulateDelay();
    
    logger.info(`[Mock Push] Sent to topic: ${topic}`, {
      title: payload.title,
      body: payload.body,
    });

    return {
      success: true,
      messageId: `mock-topic-${Date.now()}`,
    };
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<void> {
    await this.simulateDelay();
    logger.info(`[Mock Push] Device ${deviceToken} subscribed to topic: ${topic}`);
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<void> {
    await this.simulateDelay();
    logger.info(`[Mock Push] Device ${deviceToken} unsubscribed from topic: ${topic}`);
  }

  async validateToken(deviceToken: string): Promise<boolean> {
    await this.simulateDelay();
    // Invalid tokens contain 'invalid' in the string
    return !deviceToken.includes('invalid');
  }

  getProviderName(): string {
    return 'Mock';
  }

  private async simulateDelay(): Promise<void> {
    if (this.mockDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.mockDelay));
    }
  }
}
