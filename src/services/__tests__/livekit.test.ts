import { generateLiveKitToken } from '../livekit';
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
