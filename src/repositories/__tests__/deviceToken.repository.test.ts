import { DeviceTokenRepository } from '../deviceToken.repository';
import { getFirestore } from '../../services/firebase';
import { DeviceToken } from '../../types';

// Mock Firestore
jest.mock('../../services/firebase');

describe('DeviceTokenRepository', () => {
  let repository: DeviceTokenRepository;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockGet: any;
  let mockSet: any;
  let mockUpdate: any;
  let mockDelete: any;

  beforeEach(() => {
    mockGet = jest.fn();
    mockSet = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    mockDoc = jest.fn(() => ({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      delete: mockDelete,
    }));

    mockCollection = jest.fn(() => ({
      doc: mockDoc,
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
        get: mockGet,
      })),
      get: mockGet,
    }));

    mockDb = {
      collection: mockCollection,
      batch: jest.fn(() => ({
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    repository = new DeviceTokenRepository();
  });

  describe('create', () => {
    it('should create a device token', async () => {
      const deviceToken: DeviceToken = {
        deviceId: 'device-123',
        userId: 'user-123',
        platform: 'ios',
        token: 'token-abc',
        active: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGet.mockResolvedValue({ exists: false });
      mockSet.mockResolvedValue(undefined);

      await repository.create(deviceToken);

      expect(mockCollection).toHaveBeenCalledWith('device_tokens');
      expect(mockDoc).toHaveBeenCalledWith('device-123');
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        deviceId: 'device-123',
        userId: 'user-123',
        platform: 'ios',
        token: 'token-abc',
        active: true,
      }));
    });
  });

  describe('findById', () => {
    it('should find device token by id', async () => {
      const deviceToken: DeviceToken = {
        deviceId: 'device-123',
        userId: 'user-123',
        platform: 'ios',
        token: 'token-abc',
        active: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGet.mockResolvedValue({ exists: true, id: 'device-123', data: () => ({ ...deviceToken, lastSeen: { toDate: () => deviceToken.lastSeen }, createdAt: { toDate: () => deviceToken.createdAt }, updatedAt: { toDate: () => deviceToken.updatedAt } }) });

      const result = await repository.findById('device-123');

      expect(result).toHaveProperty('deviceId', 'device-123');
      expect(mockDoc).toHaveBeenCalledWith('device-123');
    });

    it('should return null if device not found', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await repository.findById('device-123');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find devices by user id', async () => {
      const deviceTokens: DeviceToken[] = [
        {
          deviceId: 'device-1',
          userId: 'user-123',
          platform: 'ios',
          token: 'token-1',
          active: true,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGet.mockResolvedValue({
        docs: deviceTokens.map(dt => ({ data: () => ({ ...dt, lastSeen: { toDate: () => dt.lastSeen }, createdAt: { toDate: () => dt.createdAt }, updatedAt: { toDate: () => dt.updatedAt } }) })),
      });

      const result = await repository.findByUserId('user-123');

      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update device token', async () => {
      const updateData = { token: 'new-token' };
      mockGet.mockResolvedValue({ exists: true, data: () => ({ deviceId: 'device-123' }) });
      mockUpdate.mockResolvedValue(undefined);

      await repository.update('device-123', updateData);

      expect(mockDoc).toHaveBeenCalledWith('device-123');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });
  });

  describe('deactivate', () => {
    it('should deactivate device token', async () => {
      mockUpdate.mockResolvedValue(undefined);

      await repository.deactivate('device-123');

      expect(mockUpdate).toHaveBeenCalledWith({ active: false, updatedAt: expect.any(Date) });
    });
  });

  describe('delete', () => {
    it('should delete device token', async () => {
      mockDelete.mockResolvedValue(undefined);

      await repository.delete('device-123');

      expect(mockDoc).toHaveBeenCalledWith('device-123');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('cleanupInactiveDevices', () => {
    it('should cleanup inactive devices', async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      mockGet.mockResolvedValue({
        docs: [{ data: () => ({ deviceId: 'device-1' }), ref: { delete: jest.fn() } }],
      });

      await repository.cleanupInactiveDevices(90);

      expect(mockCollection).toHaveBeenCalledWith('device_tokens');
    });
  });
});
