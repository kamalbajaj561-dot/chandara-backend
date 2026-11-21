import { getCache, setCache } from './redis';

export interface SpamDetectionResult {
  isSpam: boolean;
  reason?: string;
  score: number;
}

export class SpamDetectionService {
  private readonly MAX_MESSAGE_LENGTH = 500;
  private readonly MAX_EMOJI_COUNT = 10;
  // private readonly MAX_REPEATED_CHAR_COUNT = 5; // Reserved for future use
  private readonly MESSAGE_FREQUENCY_LIMIT = 10; // messages per minute
  private readonly DUPLICATE_MESSAGE_THRESHOLD = 3;

  async detectSpam(
    userId: string,
    eventId: string,
    message: string,
    messageType: 'text' | 'emoji' | 'image' | 'system'
  ): Promise<SpamDetectionResult> {
    if (messageType === 'system') {
      return { isSpam: false, score: 0 };
    }

    const checks = [
      this.checkMessageLength(message),
      this.checkEmojiCount(message),
      this.checkRepeatedCharacters(message),
      this.checkMessageFrequency(userId, eventId),
      this.checkDuplicateMessages(userId, eventId, message),
      this.checkUrlFilter(message),
      this.checkProfanity(message),
    ];

    const results = await Promise.all(checks);
    const spamChecks = results.filter((r) => r.isSpam);

    if (spamChecks.length > 0) {
      return {
        isSpam: true,
        reason: spamChecks[0].reason,
        score: spamChecks.reduce((sum, r) => sum + r.score, 0),
      };
    }

    return { isSpam: false, score: 0 };
  }

  private checkMessageLength(message: string): SpamDetectionResult {
    if (message.length > this.MAX_MESSAGE_LENGTH) {
      return {
        isSpam: true,
        reason: 'Message exceeds maximum length',
        score: 50,
      };
    }
    return { isSpam: false, score: 0 };
  }

  private checkEmojiCount(message: string): SpamDetectionResult {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = message.match(emojiRegex) || [];

    if (emojis.length > this.MAX_EMOJI_COUNT) {
      return {
        isSpam: true,
        reason: 'Too many emojis in message',
        score: 30,
      };
    }

    return { isSpam: false, score: 0 };
  }

  private checkRepeatedCharacters(message: string): SpamDetectionResult {
    const repeatedCharRegex = /(.)\1{4,}/g;
    const matches = message.match(repeatedCharRegex);

    if (matches && matches.length > 0) {
      return {
        isSpam: true,
        reason: 'Message contains repeated characters',
        score: 20,
      };
    }

    return { isSpam: false, score: 0 };
  }

  private async checkMessageFrequency(userId: string, eventId: string): Promise<SpamDetectionResult> {
    const cacheKey = `spam:${eventId}:user:${userId}:message_count`;
    const countResult = await getCache<number>(cacheKey);
    const count = countResult.data || 0;

    if (count >= this.MESSAGE_FREQUENCY_LIMIT) {
      return {
        isSpam: true,
        reason: 'Message frequency limit exceeded',
        score: 60,
      };
    }

    await setCache(cacheKey, (count + 1).toString(), 60);
    return { isSpam: false, score: 0 };
  }

  private async checkDuplicateMessages(userId: string, eventId: string, message: string): Promise<SpamDetectionResult> {
    const cacheKey = `spam:${eventId}:user:${userId}:last_messages`;
    const lastMessagesResult = await getCache<string[]>(cacheKey);
    const lastMessages = lastMessagesResult.data || [];

    const duplicateCount = lastMessages.filter((m) => m === message).length;

    if (duplicateCount >= this.DUPLICATE_MESSAGE_THRESHOLD) {
      return {
        isSpam: true,
        reason: 'Duplicate message detected',
        score: 40,
      };
    }

    lastMessages.push(message);
    if (lastMessages.length > 10) {
      lastMessages.shift();
    }

    await setCache(cacheKey, lastMessages, 300);
    return { isSpam: false, score: 0 };
  }

  private checkUrlFilter(message: string): SpamDetectionResult {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (urls && urls.length > 3) {
      return {
        isSpam: true,
        reason: 'Too many URLs in message',
        score: 35,
      };
    }

    return { isSpam: false, score: 0 };
  }

  private checkProfanity(message: string): SpamDetectionResult {
    const profanityList = ['badword1', 'badword2', 'badword3'];
    const lowerMessage = message.toLowerCase();

    const hasProfanity = profanityList.some((word) => lowerMessage.includes(word));

    if (hasProfanity) {
      return {
        isSpam: true,
        reason: 'Message contains inappropriate language',
        score: 45,
      };
    }

    return { isSpam: false, score: 0 };
  }

  async logSuspiciousActivity(userId: string, eventId: string, _reason: string): Promise<void> {
    const cacheKey = `spam:${eventId}:suspicious:${userId}`;
    const countResult = await getCache<number>(cacheKey);
    const count = countResult.data || 0;

    await setCache(cacheKey, count + 1, 3600);

    if (count + 1 >= 5) {
      await setCache(`spam:${eventId}:flag:${userId}`, 'true', 86400);
    }
  }

  async isUserFlagged(userId: string, eventId: string): Promise<boolean> {
    const cacheKey = `spam:${eventId}:flag:${userId}`;
    const flaggedResult = await getCache<string>(cacheKey);
    return flaggedResult.data === 'true';
  }

  async resetUserSpamCount(userId: string, eventId: string): Promise<void> {
    const messageCountKey = `spam:${eventId}:user:${userId}:message_count`;
    const lastMessagesKey = `spam:${eventId}:user:${userId}:last_messages`;

    await setCache(messageCountKey, 0, 60);
    await setCache(lastMessagesKey, [], 300);
  }
}

export const spamDetectionService = new SpamDetectionService();
