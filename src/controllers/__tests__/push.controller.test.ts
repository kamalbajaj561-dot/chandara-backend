import { PushController } from '../push.controller';
import { Request, Response, NextFunction } from 'express';
import { deviceTokenRepository } from '../../repositories/deviceToken.repository';
import { pushNotificationService } from '../../services/pushNotification.service';
import { schedulerService } from '../../services/scheduler.service';
import { pushLogRepository } from '../../repositories/pushLog.repository';
import { AppError } from '../../middleware/errorHandler';

jest.mock('../../repositories/deviceToken.repository');
jest.mock('../../services/pushNotification.service');
jest.mock('../../services/scheduler.service');
jest.mock('../../repositories/pushLog.repository');

describe('PushController', () => {
  let controller: PushController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new PushController();
    mockReq = {
      user: { userId: 'user-123', email: 'user@example.com', role: 'viewer', type: 'access', iat: Date.now(), exp: Date.now() + 3600000 } as any,
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      mockReq.body = {
        deviceId: 'device-123',
        token: 'token-abc',
        platform: 'ios',
      };

      (deviceTokenRepository.findById as jest.Mock).mockResolvedValue(null);
      (deviceTokenRepository.create as jest.Mock).mockResolvedValue(undefined);

      await controller.registerDevice(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Device registered successfully',
      });
    });

    it('should update existing device', async () => {
      mockReq.body = {
        deviceId: 'device-123',
        token: 'token-abc',
        platform: 'ios',
      };

      (deviceTokenRepository.findById as jest.Mock).mockResolvedValue({ deviceId: 'device-123' });
      (deviceTokenRepository.update as jest.Mock).mockResolvedValue(undefined);

      await controller.registerDevice(mockReq as Request, mockRes as Response, mockNext);

      expect(deviceTokenRepository.update).toHaveBeenCalled();
    });

    it('should throw error if not authenticated', async () => {
      mockReq.user = undefined;

      await controller.registerDevice(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('deleteDevice', () => {
    it('should delete device', async () => {
      mockReq.params = { id: 'device-123' };

      (deviceTokenRepository.findById as jest.Mock).mockResolvedValue({
        deviceId: 'device-123',
        userId: 'user-123',
      });
      (deviceTokenRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteDevice(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should throw error if device not found', async () => {
      mockReq.params = { id: 'device-123' };

      (deviceTokenRepository.findById as jest.Mock).mockResolvedValue(null);

      await controller.deleteDevice(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('sendPush', () => {
    it('should send push to user', async () => {
      mockReq.body = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
      };

      (pushNotificationService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      await controller.sendPush(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('testPush', () => {
    it('should send test push', async () => {
      (pushNotificationService.sendToUser as jest.Mock).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
      });

      await controller.testPush(mockReq as Request, mockRes as Response, mockNext);

      expect(pushNotificationService.sendToUser).toHaveBeenCalledWith('user-123', {
        title: 'Test Notification',
        body: 'This is a test push notification',
        data: { type: 'test' },
      });
    });
  });

  describe('getLogs', () => {
    it('should get user logs', async () => {
      mockReq.query = { limit: '10', offset: '0' };

      (pushLogRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      await controller.getLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(pushLogRepository.findByUserId).toHaveBeenCalledWith('user-123', 10, 0);
    });
  });

  describe('schedulePush', () => {
    it('should schedule push for self', async () => {
      mockReq.body = {
        userId: 'user-123',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      };

      (schedulerService.schedule as jest.Mock).mockResolvedValue('job-123');

      await controller.schedulePush(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should throw error if scheduling for another user', async () => {
      mockReq.body = {
        userId: 'other-user',
        title: 'Test',
        body: 'Test body',
        scheduledFor: new Date(Date.now() + 3600000).toISOString(),
      };

      await controller.schedulePush(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getDevices', () => {
    it('should get user devices', async () => {
      (deviceTokenRepository.findByUserId as jest.Mock).mockResolvedValue([]);
      (deviceTokenRepository.getUserDeviceStats as jest.Mock).mockResolvedValue({ total: 0 });

      await controller.getDevices(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
