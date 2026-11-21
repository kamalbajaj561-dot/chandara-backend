import { getCache, setCache, deleteCache } from './redis';

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export class TypingService {
  private readonly TYPING_INDICATOR_TTL = 10; // seconds

  async setTyping(eventId: string, userId: string, userName: string): Promise<void> {
    const cacheKey = `chat:${eventId}:typing:${userId}`;
    const typingUser: TypingUser = {
      userId,
      userName,
      timestamp: Date.now(),
    };

    await setCache(cacheKey, JSON.stringify(typingUser), this.TYPING_INDICATOR_TTL);
  }

  async clearTyping(eventId: string, userId: string): Promise<void> {
    const cacheKey = `chat:${eventId}:typing:${userId}`;
    await deleteCache(cacheKey);
  }

  async getTypingUsers(eventId: string): Promise<TypingUser[]> {
    const typingUsers: TypingUser[] = [];

    for (let i = 0; i < 100; i++) {
      const cacheKey = `chat:${eventId}:typing:${i}`;
      const cachedResult = await getCache<string>(cacheKey);
      if (cachedResult.data) {
        try {
          const typingUser = JSON.parse(cachedResult.data) as TypingUser;
          if (Date.now() - typingUser.timestamp < this.TYPING_INDICATOR_TTL * 1000) {
            typingUsers.push(typingUser);
          } else {
            await deleteCache(cacheKey);
          }
        } catch (error) {
          await deleteCache(cacheKey);
        }
      }
    }

    return typingUsers;
  }

  async isUserTyping(eventId: string, userId: string): Promise<boolean> {
    const cacheKey = `chat:${eventId}:typing:${userId}`;
    const cachedResult = await getCache<string>(cacheKey);

    if (!cachedResult.data) {
      return false;
    }

    try {
      const typingUser = JSON.parse(cachedResult.data) as TypingUser;
      const isTyping = Date.now() - typingUser.timestamp < this.TYPING_INDICATOR_TTL * 1000;

      if (!isTyping) {
        await deleteCache(cacheKey);
      }

      return isTyping;
    } catch (error) {
      await deleteCache(cacheKey);
      return false;
    }
  }

  async clearAllTyping(eventId: string): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const cacheKey = `chat:${eventId}:typing:${i}`;
      await deleteCache(cacheKey);
    }
  }
}

export const typingService = new TypingService();
