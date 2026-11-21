import { MockPushProvider } from '../mockPushProvider';
import { PushPayload } from '../pushProvider.interface';

describe('MockPushProvider', () => {
  let provider: MockPushProvider;

  beforeEach(() => {
    provider = new MockPushProvider();
  });

  describe('send', () => {
    it('should send a push notification successfully', async () => {
      const payload: PushPayload = {
        title: 'Test Title',
        body: 'Test Body',
        data: { key: 'value' },
      };

      const result = await provider.send('test-token', payload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^msg-/);
    });

    it('should handle delay parameter', async () => {
      const providerWithDelay = new MockPushProvider(100);
      const payload: PushPayload = {
        title: 'Test Title',
        body: 'Test Body',
      };

      const startTime = Date.now();
      await providerWithDelay.send('test-token', payload);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('sendBatch', () => {
    it('should send batch push notifications successfully', async () => {
      const tokens = ['token1', 'token2', 'token3'];
      const payload: PushPayload = {
        title: 'Batch Title',
        body: 'Batch Body',
      };

      const result = await provider.sendBatch(tokens, payload);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(true);
    });

    it('should handle empty token array', async () => {
      const payload: PushPayload = {
        title: 'Batch Title',
        body: 'Batch Body',
      };

      const result = await provider.sendBatch([], payload);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('sendToTopic', () => {
    it('should send to topic successfully', async () => {
      const payload: PushPayload = {
        title: 'Topic Title',
        body: 'Topic Body',
      };

      const result = await provider.sendToTopic('test-topic', payload);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('subscribeToTopic', () => {
    it('should subscribe token to topic successfully', async () => {
      const result = await provider.subscribeToTopic('token-1', 'test-topic');

      expect(result).toBeUndefined();
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should unsubscribe token from topic successfully', async () => {
      const result = await provider.unsubscribeFromTopic('token-1', 'test-topic');

      expect(result).toBeUndefined();
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const result = await provider.validateToken('valid-token');

      expect(result).toBe(true);
    });

    it('should invalidate empty token', async () => {
      const result = await provider.validateToken('');

      expect(result).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('mock');
    });
  });
});
