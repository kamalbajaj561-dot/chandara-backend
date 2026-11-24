import { Router } from 'express';
import { generateLiveKitToken } from '../services/livekit';
import { LiveKitTokenRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { authorizeLiveKitAccess } from '../services/livekitAccess';

const router = Router();

// Token generation requires authentication
router.post('/token', authMiddleware, async (req: any, res: any, next: any) => {
  try {
    const request: LiveKitTokenRequest = req.body;

    if (!request.roomName || !request.participantName || !request.role) {
      throw new AppError('Missing required fields: roomName, participantName, role', 400);
    }

    if (!['publisher', 'subscriber', 'moderator'].includes(request.role)) {
      throw new AppError('Invalid role. Must be publisher, subscriber, or moderator', 400);
    }

    // Authorize on the server: never trust the client-supplied role.
    await authorizeLiveKitAccess(req.user, request.roomName, request.role);

    // Identity is always the verified user id; the client-supplied name is display-only.
    const displayName = String(request.participantName).replace(/[^\w .@-]/g, '').slice(0, 64) || 'guest';
    const response = await generateLiveKitToken({
      roomName: request.roomName,
      participantName: req.user.userId,
      displayName,
      role: request.role,
    } as LiveKitTokenRequest);

    const apiResponse: ApiResponse<any> = {
      success: true,
      data: response,
    };

    res.json(apiResponse);
  } catch (error) {
    next(error);
  }
});

export default router;
