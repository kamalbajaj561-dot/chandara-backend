// Test-only throwaway credentials (not real); the global jest setup mocks '../livekit', so load the real module.
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-test-secret-test-secret-123456';
let generateLiveKitToken: any;
jest.isolateModules(() => {
  generateLiveKitToken = jest.requireActual('../livekit').generateLiveKitToken;
});
import { LiveKitTokenRequest } from '../../types';

describe('LiveKit Service', () => {
  describe('generateLiveKitToken', () => {
    it('should generate a token for publisher', async () => {
      const request: LiveKitTokenRequest = {
        roomName: 'test-room',
        participantName: 'test-user',
        role: 'publisher',
      };

      const result = await generateLiveKitToken(request);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.url).toBeDefined();
    });

    it('should generate a token for subscriber', async () => {
      const request: LiveKitTokenRequest = {
        roomName: 'test-room',
        participantName: 'test-user',
        role: 'subscriber',
      };

      const result = await generateLiveKitToken(request);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.url).toBeDefined();
    });

    it('should generate a token for moderator', async () => {
      const request: LiveKitTokenRequest = {
        roomName: 'test-room',
        participantName: 'test-user',
        role: 'moderator',
      };

      const result = await generateLiveKitToken(request);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.url).toBeDefined();
    });
  });
});
