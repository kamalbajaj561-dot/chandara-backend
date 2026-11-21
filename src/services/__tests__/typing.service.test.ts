import { TypingService } from '../typing.service';
import { getCache, setCache, deleteCache } from '../redis';

jest.mock('../redis');

describe('TypingService', () => {
  let typingService: TypingService;

  beforeEach(() => {
    typingService = new TypingService();
    jest.clearAllMocks();
  });

  describe('setTyping', () => {
    it('should set typing status for user', async () => {
      (setCache as jest.Mock).mockResolvedValue(undefined);
      await typingService.setTyping('event123', 'user123', 'Test User');
      expect(setCache).toHaveBeenCalledWith(
        'chat:event123:typing:user123',
        expect.any(String),
        10
      );
    });
  });

  describe('clearTyping', () => {
    it('should clear typing status for user', async () => {
      (deleteCache as jest.Mock).mockResolvedValue(undefined);
      await typingService.clearTyping('event123', 'user123');
      expect(deleteCache).toHaveBeenCalledWith('chat:event123:typing:user123');
    });
  });

  describe('getTypingUsers', () => {
    it('should return empty array when no users are typing', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      const result = await typingService.getTypingUsers('event123');
      expect(result).toEqual([]);
    });

    it('should return typing users for event', async () => {
      const typingUsers = [
        { userId: 'user123', userName: 'Test User', timestamp: Date.now() },
        { userId: 'user456', userName: 'Another User', timestamp: Date.now() },
      ];
      (getCache as jest.Mock).mockImplementation((key: string) => {
        if (key === 'chat:event123:typing:0') {
          return Promise.resolve({ data: JSON.stringify(typingUsers[0]) });
        }
        if (key === 'chat:event123:typing:1') {
          return Promise.resolve({ data: JSON.stringify(typingUsers[1]) });
        }
        return Promise.resolve({ data: null });
      });
      const result = await typingService.getTypingUsers('event123');
      expect(result).toHaveLength(2);
    });
  });

  describe('isUserTyping', () => {
    it('should return true when user is typing', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: JSON.stringify({ userId: 'user123', userName: 'Test User', timestamp: Date.now() }) });
      const result = await typingService.isUserTyping('event123', 'user123');
      expect(result).toBe(true);
    });

    it('should return false when user is not typing', async () => {
      (getCache as jest.Mock).mockResolvedValue({ data: null });
      const result = await typingService.isUserTyping('event123', 'user123');
      expect(result).toBe(false);
    });
  });

  describe('clearAllTyping', () => {
    it('should clear all typing indicators for event', async () => {
      (deleteCache as jest.Mock).mockResolvedValue(undefined);
      await typingService.clearAllTyping('event123');
      expect(deleteCache).toHaveBeenCalledTimes(100);
    });
  });
});
