import { EventRepository } from '../repositories/event.repository';
import { Event } from '../types';
import { AppError } from '../middleware/errorHandler';

interface CreateEventData {
  title: string;
  description: string;
  category: string;
  tags?: string[];
  country: string;
  city: string;
  venue?: string;
  creatorUid: string;
  creatorName: string;
  ticketPrice: number;
  currency: string;
  cameraType: string;
  streamType: 'live' | 'vr' | '360';
  eventDate: string;
  eventTime: string;
  timezone?: string;
  duration?: number;
  thumbnail?: string;
  banner?: string;
  capacity: number;
  language?: string;
  ageRestriction?: number;
  featured?: boolean;
}

interface UpdateEventData {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  country?: string;
  city?: string;
  venue?: string;
  ticketPrice?: number;
  currency?: string;
  cameraType?: string;
  streamType?: 'live' | 'vr' | '360';
  eventDate?: string;
  eventTime?: string;
  timezone?: string;
  duration?: number;
  thumbnail?: string;
  banner?: string;
  capacity?: number;
  language?: string;
  ageRestriction?: number;
}

export class EventService {
  private eventRepository: EventRepository;

  constructor(eventRepository: EventRepository = new EventRepository()) {
    this.eventRepository = eventRepository;
  }

  async getEvent(id: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  async getEventBySlug(slug: string): Promise<Event> {
    const event = await this.eventRepository.findBySlug(slug);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  async createEvent(creatorUid: string, creatorName: string, eventData: CreateEventData): Promise<Event> {
    // Validate event date is in the future
    await this.validateEventDate(eventData.eventDate, eventData.eventTime);

    // Check for overlapping events
    const hasOverlap = await this.eventRepository.checkOverlappingEvents(
      creatorUid,
      eventData.eventDate,
      eventData.eventTime,
      eventData.duration
    );

    if (hasOverlap) {
      throw new AppError('You have an overlapping event at this time', 400);
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(eventData.title);

    const newEvent: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      slug,
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      tags: eventData.tags || [],
      country: eventData.country,
      city: eventData.city,
      venue: eventData.venue,
      creatorUid,
      creatorName,
      ticketPrice: eventData.ticketPrice,
      currency: eventData.currency,
      cameraType: eventData.cameraType,
      streamType: eventData.streamType,
      eventDate: eventData.eventDate,
      eventTime: eventData.eventTime,
      timezone: eventData.timezone,
      duration: eventData.duration,
      status: 'draft',
      thumbnail: eventData.thumbnail,
      banner: eventData.banner,
      capacity: eventData.capacity,
      language: eventData.language,
      ageRestriction: eventData.ageRestriction,
      featured: eventData.featured || false,
    };

    return await this.eventRepository.create(newEvent);
  }

  async updateEvent(id: string, creatorUid: string, eventData: UpdateEventData): Promise<Event> {
    const existingEvent = await this.eventRepository.findById(id);
    if (!existingEvent) {
      throw new AppError('Event not found', 404);
    }

    // Check ownership
    if (existingEvent.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to update this event', 403);
    }

    // If updating date/time, validate and check for overlaps
    if (eventData.eventDate || eventData.eventTime) {
      const newDate = eventData.eventDate || existingEvent.eventDate;
      const newTime = eventData.eventTime || existingEvent.eventTime;
      const newDuration = eventData.duration !== undefined ? eventData.duration : existingEvent.duration;

      await this.validateEventDate(newDate, newTime);

      const hasOverlap = await this.eventRepository.checkOverlappingEvents(
        creatorUid,
        newDate,
        newTime,
        newDuration,
        id
      );

      if (hasOverlap) {
        throw new AppError('You have an overlapping event at this time', 400);
      }
    }

    // Only allow status updates through specific methods
    const { status, ...updateData } = eventData as any;

    const updatedEvent = await this.eventRepository.update(id, updateData);
    if (!updatedEvent) {
      throw new AppError('Failed to update event', 500);
    }
    return updatedEvent;
  }

  async deleteEvent(id: string, creatorUid: string): Promise<void> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check ownership
    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to delete this event', 403);
    }

    // Prevent deletion of live events
    if (event.status === 'live') {
      throw new AppError('Cannot delete a live event', 400);
    }

    const deleted = await this.eventRepository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete event', 500);
    }
  }

  async scheduleEvent(id: string, creatorUid: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check ownership
    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to schedule this event', 403);
    }

    // Validate status transition
    if (event.status !== 'draft') {
      throw new AppError('Only draft events can be scheduled', 400);
    }

    // Validate event date is in the future
    await this.validateEventDate(event.eventDate, event.eventTime);

    const updatedEvent = await this.eventRepository.updateStatus(id, 'scheduled');
    if (!updatedEvent) {
      throw new AppError('Failed to schedule event', 500);
    }
    return updatedEvent;
  }

  async startEvent(id: string, creatorUid: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check ownership
    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to start this event', 403);
    }

    // Validate status transition
    if (event.status !== 'scheduled') {
      throw new AppError('Only scheduled events can be started', 400);
    }

    const updatedEvent = await this.eventRepository.updateStatus(id, 'live');
    if (!updatedEvent) {
      throw new AppError('Failed to start event', 500);
    }
    return updatedEvent;
  }

  async endEvent(id: string, creatorUid: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check ownership
    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to end this event', 403);
    }

    // Validate status transition
    if (event.status !== 'live') {
      throw new AppError('Only live events can be ended', 400);
    }

    const updatedEvent = await this.eventRepository.updateStatus(id, 'ended');
    if (!updatedEvent) {
      throw new AppError('Failed to end event', 500);
    }
    return updatedEvent;
  }

  async cancelEvent(id: string, creatorUid: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    // Check ownership
    if (event.creatorUid !== creatorUid) {
      throw new AppError('You do not have permission to cancel this event', 403);
    }

    // Prevent cancellation of live events
    if (event.status === 'live') {
      throw new AppError('Cannot cancel a live event', 400);
    }

    const updatedEvent = await this.eventRepository.updateStatus(id, 'cancelled');
    if (!updatedEvent) {
      throw new AppError('Failed to cancel event', 500);
    }
    return updatedEvent;
  }

  async searchEvents(query: string, limit?: number): Promise<Event[]> {
    if (query.length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400);
    }

    return await this.eventRepository.searchEvents(query, { limit });
  }

  async listEvents(options: {
    limit?: number;
    offset?: number;
    status?: string;
    category?: string;
    featured?: boolean;
    creatorUid?: string;
    language?: string;
    country?: string;
  }): Promise<{ events: Event[]; total: number }> {
    return await this.eventRepository.listEvents(options);
  }

  async getEventsByTags(tags: string[], limit?: number): Promise<Event[]> {
    if (!tags || tags.length === 0) {
      throw new AppError('At least one tag is required', 400);
    }

    return await this.eventRepository.getEventsByTags(tags, { limit });
  }

  async getFeaturedEvents(limit?: number): Promise<Event[]> {
    return await this.eventRepository.getFeaturedEvents({ limit });
  }

  async getLiveEvents(limit?: number): Promise<Event[]> {
    return await this.eventRepository.getLiveEvents({ limit });
  }

  async getUpcomingEvents(limit?: number): Promise<Event[]> {
    return await this.eventRepository.getUpcomingEvents({ limit });
  }

  async getEventsByCreator(creatorUid: string, options: { limit?: number; offset?: number }): Promise<{ events: Event[]; total: number }> {
    return await this.eventRepository.getEventsByCreator(creatorUid, options);
  }

  async setFeatured(id: string, featured: boolean): Promise<Event> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const updatedEvent = await this.eventRepository.setFeatured(id, featured);
    if (!updatedEvent) {
      throw new AppError('Failed to update featured status', 500);
    }
    return updatedEvent;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.eventRepository.checkSlugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;

      // Prevent infinite loop
      if (counter > 100) {
        throw new AppError('Could not generate unique slug', 500);
      }
    }

    return slug;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async validateEventDate(eventDate: string, eventTime: string): Promise<void> {
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    const now = new Date();

    if (eventDateTime <= now) {
      throw new AppError('Event date and time must be in the future', 400);
    }
  }
}

export const eventService = new EventService();
