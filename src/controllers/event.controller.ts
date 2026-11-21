import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { ApiResponse, PaginatedResponse } from '../types';
import { validateCreateEvent, validateUpdateEvent, validateSearchEvents, validateListEvents, validateEventsByTags, validateSetFeatured } from '../validators/event.validators';

export class EventController {
  private eventService: EventService;

  constructor(eventService: EventService = new EventService()) {
    this.eventService = eventService;
  }

  async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const event = await this.eventService.getEvent(id);

      const response: ApiResponse = {
        success: true,
        data: event,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getEventBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const event = await this.eventService.getEventBySlug(slug);

      const response: ApiResponse = {
        success: true,
        data: event,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      const creatorUid = (req.user as any)?.id;
      const creatorName = (req.user as any)?.displayName || 'Unknown';

      if (!userId || !creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validatedData = validateCreateEvent(req.body);
      const event = await this.eventService.createEvent(creatorUid, creatorName, validatedData);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Event created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const validatedData = validateUpdateEvent(req.body);
      const event = await this.eventService.updateEvent(id, creatorUid, validatedData);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Event updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await this.eventService.deleteEvent(id, creatorUid);

      const response: ApiResponse = {
        success: true,
        message: 'Event deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async scheduleEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const event = await this.eventService.scheduleEvent(id, creatorUid);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Event scheduled successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async startEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const event = await this.eventService.startEvent(id, creatorUid);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Event started successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async endEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const event = await this.eventService.endEvent(id, creatorUid);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Event ended successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async cancelEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const creatorUid = (req.user as any)?.id;

      if (!creatorUid) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const event = await this.eventService.cancelEvent(id, creatorUid);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Event cancelled successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async searchEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = validateSearchEvents(req.query);
      const events = await this.eventService.searchEvents(validatedData.query, validatedData.limit);

      const response: ApiResponse = {
        success: true,
        data: events,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = validateListEvents(req.query);
      const { events, total } = await this.eventService.listEvents(validatedData);

      const page = Math.floor((validatedData.offset || 0) / (validatedData.limit || 20)) + 1;
      const limit = validatedData.limit || 20;

      const response: PaginatedResponse<any> = {
        data: events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getEventsByTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = validateEventsByTags(req.body);
      const events = await this.eventService.getEventsByTags(validatedData.tags, validatedData.limit);

      const response: ApiResponse = {
        success: true,
        data: events,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getFeaturedEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await this.eventService.getFeaturedEvents(limit);

      const response: ApiResponse = {
        success: true,
        data: events,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getLiveEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await this.eventService.getLiveEvents(limit);

      const response: ApiResponse = {
        success: true,
        data: events,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUpcomingEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await this.eventService.getUpcomingEvents(limit);

      const response: ApiResponse = {
        success: true,
        data: events,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getEventsByCreator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { creatorUid } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const { events, total } = await this.eventService.getEventsByCreator(creatorUid, { limit, offset });

      const page = Math.floor((offset || 0) / (limit || 20)) + 1;
      const limitValue = limit || 20;

      const response: PaginatedResponse<any> = {
        data: events,
        pagination: {
          page,
          limit: limitValue,
          total,
          totalPages: Math.ceil(total / limitValue),
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async setFeatured(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validatedData = validateSetFeatured(req.body);
      const event = await this.eventService.setFeatured(id, validatedData.featured);

      const response: ApiResponse = {
        success: true,
        data: event,
        message: 'Featured status updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const eventController = new EventController();
