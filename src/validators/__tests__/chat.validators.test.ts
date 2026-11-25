import {
  validateSendMessage,
  validateEditMessage,
  validateDeleteMessage,
  validateAddReaction,
  validateRemoveReaction,
  validatePinMessage,
  validateReportMessage,
  validateMuteUser,
  validateUnmuteUser,
  validateTimeoutUser,
  validateBanUser,
  validateUnbanUser,
  validateUpdateSlowMode,
  validateToggleChatEnabled,
  validateSetSubscriberOnly,
  validateSetFollowersOnly,
  validateAddModerator,
  validateRemoveModerator,
  validateSearchMessages,
  validateTyping,
} from '../chat.validators';

describe('Chat Validators', () => {
  describe('validateSendMessage', () => {
    it('should validate valid send message data', () => {
      const validData = {
        message: 'Hello world',
        messageType: 'text',
      };
      const result = validateSendMessage(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty message', () => {
      const invalidData = {
        message: '',
        messageType: 'text',
      };
      expect(() => validateSendMessage(invalidData)).toThrow('Validation failed');
    });

    it('should reject message exceeding max length', () => {
      const invalidData = {
        message: 'a'.repeat(501),
        messageType: 'text',
      };
      expect(() => validateSendMessage(invalidData)).toThrow('Validation failed');
    });

    it('should reject invalid message type', () => {
      const invalidData = {
        message: 'Hello world',
        messageType: 'invalid',
      };
      expect(() => validateSendMessage(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateEditMessage', () => {
    it('should validate valid edit message data', () => {
      const validData = {
        message: 'Updated message',
      };
      const result = validateEditMessage(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty message', () => {
      const invalidData = {
        message: '',
      };
      expect(() => validateEditMessage(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateDeleteMessage', () => {
    it('should validate delete message data', () => {
      const validData = {};
      const result = validateDeleteMessage(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateAddReaction', () => {
    it('should validate valid add reaction data', () => {
      const validData = {
        emoji: '👍',
      };
      const result = validateAddReaction(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty emoji', () => {
      const invalidData = {
        emoji: '',
      };
      expect(() => validateAddReaction(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateRemoveReaction', () => {
    it('should validate valid remove reaction data', () => {
      const validData = {
        emoji: '👍',
      };
      const result = validateRemoveReaction(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validatePinMessage', () => {
    it('should validate pin message data', () => {
      const validData = {};
      const result = validatePinMessage(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateReportMessage', () => {
    it('should validate valid report message data', () => {
      const validData = {
        messageId: 'msg123',
        reason: 'Inappropriate content',
        description: 'Message contains offensive language',
      };
      const result = validateReportMessage(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty reason', () => {
      const invalidData = {
        messageId: 'msg123',
        reason: '',
        description: 'Description',
      };
      expect(() => validateReportMessage(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateMuteUser', () => {
    it('should validate valid mute user data', () => {
      const validData = {
        eventId: 'event123',
        userId: 'user456',
      };
      const result = validateMuteUser(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty userId', () => {
      const invalidData = {
        eventId: 'event123',
        userId: '',
      };
      expect(() => validateMuteUser(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateUnmuteUser', () => {
    it('should validate valid unmute user data', () => {
      const validData = {
        eventId: 'event123',
        userId: 'user456',
      };
      const result = validateUnmuteUser(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateTimeoutUser', () => {
    it('should validate valid timeout user data', () => {
      const validData = {
        eventId: 'event123',
        userId: 'user456',
        userName: 'User to timeout',
        duration: 3600,
        reason: 'Spam',
      };
      const result = validateTimeoutUser(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid duration', () => {
      const invalidData = {
        eventId: 'event123',
        userId: 'user456',
        userName: 'User',
        duration: -1,
        reason: 'Spam',
      };
      expect(() => validateTimeoutUser(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateBanUser', () => {
    it('should validate valid ban user data', () => {
      const validData = {
        eventId: 'event123',
        userId: 'user456',
        userName: 'User to ban',
        reason: 'Harassment',
      };
      const result = validateBanUser(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateUnbanUser', () => {
    it('should validate valid unban user data', () => {
      const validData = {
        eventId: 'event123',
        userId: 'user456',
      };
      const result = validateUnbanUser(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateUpdateSlowMode', () => {
    it('should validate valid slow mode data', () => {
      const validData = {
        slowMode: true,
        interval: 30,
      };
      const result = validateUpdateSlowMode(validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid interval', () => {
      const invalidData = {
        slowMode: true,
        interval: -1,
      };
      expect(() => validateUpdateSlowMode(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateToggleChatEnabled', () => {
    it('should validate valid toggle chat enabled data', () => {
      const validData = {
        enabled: false,
      };
      const result = validateToggleChatEnabled(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateSetSubscriberOnly', () => {
    it('should validate valid subscriber only data', () => {
      const validData = {
        subscriberOnly: true,
      };
      const result = validateSetSubscriberOnly(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateSetFollowersOnly', () => {
    it('should validate valid followers only data', () => {
      const validData = {
        followersOnly: true,
      };
      const result = validateSetFollowersOnly(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateAddModerator', () => {
    it('should validate valid add moderator data', () => {
      const validData = {
        moderatorId: 'mod456',
      };
      const result = validateAddModerator(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateRemoveModerator', () => {
    it('should validate valid remove moderator data', () => {
      const validData = {
        moderatorId: 'mod456',
      };
      const result = validateRemoveModerator(validData);
      expect(result).toEqual(validData);
    });
  });

  describe('validateSearchMessages', () => {
    it('should validate valid search messages data', () => {
      const validData = {
        q: 'search query',
      };
      const result = validateSearchMessages(validData);
      // schema applies a default page size
      expect(result).toEqual({ ...validData, limit: 50 });
    });

    it('should reject empty query', () => {
      const invalidData = {
        q: '',
      };
      expect(() => validateSearchMessages(invalidData)).toThrow('Validation failed');
    });
  });

  describe('validateTyping', () => {
    it('should validate typing data', () => {
      const validData = {};
      const result = validateTyping(validData);
      expect(result).toEqual(validData);
    });
  });
});
