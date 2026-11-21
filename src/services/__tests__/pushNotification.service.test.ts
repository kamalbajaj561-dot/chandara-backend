import { PushNotificationService } from '../pushNotification.service';
import { MockPushProvider } from '../../providers/mockPushProvider';
import { deviceTokenRepository } from '../../repositories/deviceToken.repository';
import { pushLogRepository } from '../../repositories/pushLog.repository';
import { getCache, setCache } from '../redis';

jest.mock('../../repositories/deviceToken.repository');
jest.mock('../../repositories/pushLog.repository');
jest.mock('../redis');

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockProvider: MockPushProvider;

  beforeEach(() => {
    mockProvider = new MockPushProvider();
    service = new PushNotificationService(mockProvider);
    jest.clearAllMocks();
  });

  describe('sendToUser', () => {
    it('should send push to user successfully', async () => {
      const mockDevices = [
        { deviceId: 'device-1', token: 'token-1', active: true },
        { deviceId: 'device-2', token: 'token-2', active: true },
      ];

      (deviceTokenRepository.findByUserId as jest.Mock).mockResolvedValue(mockDevices);
      (pushLogRepository.create as jest.Mock).mockResolvedValue(undefined);
      (getCache as jest.Mock).mockResolvedValue(null);

      const result = await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle user with no devices', async () => {
      (deviceTokenRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await service.sendToUser('user-123', {
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.sent).toBe(0);
    });
  });

  describe('sendToTopic', () => {
    it('should send to topic successfully', async () => {
      (pushLogRepository.create as jest.Mock).mockResolvedValue(undefined);
      (getCache as jest.Mock).mockResolvedValue(null);

      const result = await service.sendToTopic('test-topic', {
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('retryPush', () => {
    it('should retry failed push', async () => {
      const pushLog = {
        id: 'push-123',
        deviceId: 'device-123',
        title: 'Test',
        body: 'Test body',
        data: {},
        status: 'failed',
        retryCount: 0,
      };

      (getCache as jest.Mock).mockResolvedValue({ data: pushLog });
      (deviceTokenRepository.findById as jest.Mock).mockResolvedValue({
        deviceId: 'device-123',
        token: 'token-1',
        active: true,
      });
      (deviceTokenRepository.updateLastSeen as jest.Mock).mockResolvedValue(undefined);
      (setCache as jest.Mock).mockResolvedValue(undefined);
      
      // Mock the provider's send method
      jest.spyOn(service['provider'], 'send').mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await service.retryPush('push-123');

      expect(result).toBe(true);
    });

    it('should not retry if max retries exceeded', async () => {
      const pushLog = {
        id: 'push-123',
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        data: {},
        status: 'failed',
        retryCount: 3,
      };

      (getCache as jest.Mock).mockResolvedValue({ data: pushLog });

      const result = await service.retryPush('push-123');

      expect(result).toBe(false);
    });
  });
});
