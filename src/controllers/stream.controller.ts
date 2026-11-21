import { Request, Response, NextFunction } from 'express';
import { StreamService } from '../services/stream.service';
import { ApiResponse } from '../types';
import { validateStartStream, validateStopStream, validateTokenRequest, validateUpdateViewers, validateUpdateHealth, validateJoinStream } from '../validators/stream.validators';

export class StreamController {
  private streamService: StreamService;

  constructor(streamService: StreamService = new StreamService()) {
    this.streamService = streamService;
  }

  async startStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validatedData = validateStartStream(req.body);
      const { stream, token } = await this.streamService.startStream(eventId, creatorUid, validatedData.recordingEnabled);

      const response: ApiResponse = {
        success: true,
        data: { stream, token },
        message: 'Stream started successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async stopStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      validateStopStream(req.body);
      const stream = await this.streamService.stopStream(eventId, creatorUid);

      const response: ApiResponse = {
        success: true,
        data: stream,
        message: 'Stream stopped successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validatedData = validateTokenRequest(req.body);
      const token = await this.streamService.generateToken(eventId, userId, validatedData.role);

      const response: ApiResponse = {
        success: true,
        data: token,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const stream = await this.streamService.getStream(eventId);

      const response: ApiResponse = {
        success: true,
        data: stream,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getStreamHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const health = await this.streamService.getStreamHealth(eventId);

      const response: ApiResponse = {
        success: true,
        data: health,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateViewers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const validatedData = validateUpdateViewers(req.body);
      const stream = await this.streamService.updateViewerCount(eventId, validatedData.delta);

      const response: ApiResponse = {
        success: true,
        data: stream,
        message: 'Viewer count updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getLiveStreams(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const streams = await this.streamService.getLiveStreams();

      const response: ApiResponse = {
        success: true,
        data: streams,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async joinStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validatedData = validateJoinStream(req.body);
      const session = await this.streamService.joinStream(streamId, userId, validatedData.role);

      const response: ApiResponse = {
        success: true,
        data: session,
        message: 'Joined stream successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async leaveStream(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamId } = req.params;
      const userId = (req.user as any)?.id;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const session = await this.streamService.leaveStream(streamId, userId);

      const response: ApiResponse = {
        success: true,
        data: session,
        message: 'Left stream successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamId } = req.params;
      const validatedData = validateUpdateHealth(req.body);
      const health = await this.streamService.updateHealth(streamId, validatedData);

      const response: ApiResponse = {
        success: true,
        data: health,
        message: 'Stream health updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async recordHeartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { streamId } = req.params;
      await this.streamService.recordHeartbeat(streamId);

      const response: ApiResponse = {
        success: true,
        message: 'Heartbeat recorded successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const streamController = new StreamController();
