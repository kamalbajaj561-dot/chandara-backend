import { SpamDetectionService } from '../spamDetection.service';
import { getCache, setCache } from '../redis';

jest.mock('../redis');

describe('SpamDetectionService', () => {
  let spamDetectionService: SpamDetectionService;

  beforeEach(() => {
    spamDetectionService = new SpamDetectionService();
    jest.clearAllMocks();
    (getCache as jest.Mock).mockResolvedValue({ data: 0 });
    (setCache as jest.Mock).mockResolvedValue(undefined);
  });

  describe('detectSpam', () => {
    it('should detect spam for excessive message length', async () => {
      const longMessage = 'a'.repeat(501);
      const result = await spamDetectionService.detectSpam('user123', 'event123', longMessage, 'text');
      expect(result.isSpam).toBe(true);
      expect(result.reason).toContain('exceeds maximum length');
    });

    it('should detect spam for too many emojis', async () => {
      const emojiMessage = '👍'.repeat(11);
      const result = await spamDetectionService.detectSpam('user123', 'event123', emojiMessage, 'text');
      expect(result.isSpam).toBe(true);
      expect(result.reason).toContain('Too many emojis');
    });

    it('should detect spam for repeated characters', async () => {
      const repeatedMessage = 'aaaaa';
      const result = await spamDetectionService.detectSpam('user123', 'event123', repeatedMessage, 'text');
      expect(result.isSpam).toBe(true);
      expect(result.reason).toContain('repeated characters');
    });

    it('should not detect spam for valid message', async () => {
      const validMessage = 'Hello, how are you?';
      const result = await spamDetectionService.detectSpam('user123', 'event123', validMessage, 'text');
      expect(result.isSpam).toBe(false);
    });

    it('should detect spam for high message frequency', async () => {
      (getCache as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('message_count')) {
          return Promise.resolve({ data: 11 });
        }
        if (key.includes('last_messages')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: null });
      });
      const result = await spamDetectionService.detectSpam('user123', 'event123', 'Hello', 'text');
      expect(result.isSpam).toBe(true);
      expect(result.reason).toContain('frequency limit');
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: 3 });
      await spamDetectionService.logSuspiciousActivity('user123', 'event123', 'spam');
      expect(setCache).toHaveBeenCalled();
    });

    it('should flag user after 5 suspicious activities', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: 5 });
      await spamDetectionService.logSuspiciousActivity('user123', 'event123', 'spam');
      expect(setCache).toHaveBeenCalledWith(
        'spam:event123:flag:user123',
        'true',
        86400
      );
    });
  });

  describe('isUserFlagged', () => {
    it('should return true if user is flagged', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: 'true' });
      const result = await spamDetectionService.isUserFlagged('user123', 'event123');
      expect(result).toBe(true);
    });

    it('should return false if user is not flagged', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: 'false' });
      const result = await spamDetectionService.isUserFlagged('user123', 'event123');
      expect(result).toBe(false);
    });
  });

  describe('resetUserSpamCount', () => {
    it('should reset spam count', async () => {
      await spamDetectionService.resetUserSpamCount('user123', 'event123');
      expect(setCache).toHaveBeenCalledTimes(2);
    });
  });
});
