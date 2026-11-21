import { Router } from 'express';
import { generateLiveKitToken } from '../services/livekit';
import { LiveKitTokenRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

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

    const response = await generateLiveKitToken(request);

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
