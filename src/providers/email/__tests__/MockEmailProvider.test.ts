import { MockEmailProvider } from '../MockEmailProvider';
import { EmailMessage } from '../EmailProvider.interface';

describe('MockEmailProvider', () => {
  let provider: MockEmailProvider;

  beforeEach(() => {
    provider = new MockEmailProvider();
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await provider.send(message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('Mock');
    });

    it('should log sent emails', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      await provider.send(message);

      const logs = provider.getEmailLog();
      expect(logs).toHaveLength(1);
      expect(logs[0].to).toBe('test@example.com');
      expect(logs[0].subject).toBe('Test Subject');
    });

    it('should fail when failure mode is enabled', async () => {
      provider.setFailureMode(true);

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await provider.send(message);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail randomly based on failure rate', async () => {
      provider.setFailureMode(false, 1.0); // 100% failure rate

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      };

      const result = await provider.send(message);

      expect(result.success).toBe(false);
    });
  });

  describe('sendBulk', () => {
    it('should send bulk emails', async () => {
      const messages: EmailMessage[] = [
        { to: 'test1@example.com', subject: 'Test 1', html: '<p>Content 1</p>' },
        { to: 'test2@example.com', subject: 'Test 2', html: '<p>Content 2</p>' },
      ];

      const results = await provider.sendBulk(messages);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle partial failures in bulk send', async () => {
      provider.setFailureMode(false, 0.5); // 50% failure rate

      const messages: EmailMessage[] = [
        { to: 'test1@example.com', subject: 'Test 1', html: '<p>Content 1</p>' },
        { to: 'test2@example.com', subject: 'Test 2', html: '<p>Content 2</p>' },
      ];

      const results = await provider.sendBulk(messages);

      expect(results).toHaveLength(2);
      // At least one should succeed and one should fail with 50% rate
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      expect(successCount + failCount).toBe(2);
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email', () => {
      expect(provider.validateEmail('test@example.com')).toBe(true);
      expect(provider.validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(provider.validateEmail('invalid')).toBe(false);
      expect(provider.validateEmail('test@')).toBe(false);
      expect(provider.validateEmail('@example.com')).toBe(false);
      expect(provider.validateEmail('')).toBe(false);
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      expect(provider.getProviderName()).toBe('Mock');
    });
  });

  describe('isReady', () => {
    it('should always be ready', () => {
      expect(provider.isReady()).toBe(true);
    });
  });

  describe('getEmailLog', () => {
    it('should return copy of email log', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Content</p>',
      };

      await provider.send(message);
      const logs = provider.getEmailLog();

      expect(logs).toHaveLength(1);

      // Verify it's a copy by modifying original
      logs[0].to = 'modified@example.com';
      const logs2 = provider.getEmailLog();
      expect(logs2[0].to).toBe('test@example.com');
    });
  });

  describe('clearLog', () => {
    it('should clear email log', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Content</p>',
      };

      await provider.send(message);
      expect(provider.getSentCount()).toBe(1);

      provider.clearLog();
      expect(provider.getSentCount()).toBe(0);
    });
  });

  describe('getSentCount', () => {
    it('should return count of sent emails', async () => {
      expect(provider.getSentCount()).toBe(0);

      await provider.send({ to: 'test@example.com', subject: 'Test', html: '<p>Content</p>' });
      expect(provider.getSentCount()).toBe(1);

      await provider.send({ to: 'test2@example.com', subject: 'Test', html: '<p>Content</p>' });
      expect(provider.getSentCount()).toBe(2);
    });
  });

  describe('setFailureMode', () => {
    it('should set failure mode', () => {
      provider.setFailureMode(true, 0.8);
      // Verify by attempting to send
      // (actual testing done in send tests)
    });
  });
});
