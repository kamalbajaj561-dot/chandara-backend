import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import {
  validateSendMessage,
  validateEditMessage,
  validateAddReaction,
  validateRemoveReaction,
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
  validateTyping,
} from '../validators/chat.validators';

const router = Router();

// Public routes
router.get('/:eventId/messages', chatController.getMessages.bind(chatController));
router.get('/:eventId/room', chatController.getChatRoom.bind(chatController));
router.get('/:eventId/pinned', chatController.getPinnedMessages.bind(chatController));
router.get('/:eventId/typing', chatController.getTypingUsers.bind(chatController));
router.get('/:eventId/search', chatController.searchMessages.bind(chatController));
router.get('/:eventId/pagination', chatController.getPaginatedMessages.bind(chatController));

// Protected routes - authenticated users
router.post('/:eventId/messages', authMiddleware, validateSendMessage, chatController.sendMessage.bind(chatController));
router.put('/messages/:id', authMiddleware, validateEditMessage, chatController.editMessage.bind(chatController));
router.delete('/messages/:id', authMiddleware, chatController.deleteMessage.bind(chatController));
router.post('/messages/:id/reaction', authMiddleware, validateAddReaction, chatController.addReaction.bind(chatController));
router.delete('/messages/:id/reaction', authMiddleware, validateRemoveReaction, chatController.removeReaction.bind(chatController));
router.post('/messages/:id/pin', authMiddleware, chatController.pinMessage.bind(chatController));
router.post('/report', authMiddleware, validateReportMessage, chatController.reportMessage.bind(chatController));
router.post('/:eventId/typing', authMiddleware, validateTyping, chatController.setTyping.bind(chatController));
router.delete('/:eventId/typing', authMiddleware, validateTyping, chatController.clearTyping.bind(chatController));

// Moderation routes - moderators and creators
router.post('/mute', authMiddleware, requireRole('creator', 'moderator', 'administrator'), validateMuteUser, chatController.muteUser.bind(chatController));
router.post('/unmute', authMiddleware, requireRole('creator', 'moderator', 'administrator'), validateUnmuteUser, chatController.unmuteUser.bind(chatController));
router.post('/timeout', authMiddleware, requireRole('creator', 'moderator', 'administrator'), validateTimeoutUser, chatController.timeoutUser.bind(chatController));
router.post('/ban', authMiddleware, requireRole('creator', 'moderator', 'administrator'), validateBanUser, chatController.banUser.bind(chatController));
router.post('/unban', authMiddleware, requireRole('creator', 'moderator', 'administrator'), validateUnbanUser, chatController.unbanUser.bind(chatController));
router.get('/:eventId/moderation', authMiddleware, requireRole('creator', 'moderator', 'administrator'), chatController.getModerationData.bind(chatController));

// Chat settings - creators only
router.put('/:eventId/slow-mode', authMiddleware, requireRole('creator', 'administrator'), validateUpdateSlowMode, chatController.updateSlowMode.bind(chatController));
router.put('/:eventId/chat-enabled', authMiddleware, requireRole('creator', 'administrator'), validateToggleChatEnabled, chatController.toggleChatEnabled.bind(chatController));
router.put('/:eventId/subscriber-only', authMiddleware, requireRole('creator', 'administrator'), validateSetSubscriberOnly, chatController.setSubscriberOnly.bind(chatController));
router.put('/:eventId/followers-only', authMiddleware, requireRole('creator', 'administrator'), validateSetFollowersOnly, chatController.setFollowersOnly.bind(chatController));
router.post('/:eventId/moderators', authMiddleware, requireRole('creator', 'administrator'), validateAddModerator, chatController.addModerator.bind(chatController));
router.delete('/:eventId/moderators', authMiddleware, requireRole('creator', 'administrator'), validateRemoveModerator, chatController.removeModerator.bind(chatController));

export default router;
