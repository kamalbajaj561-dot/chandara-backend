import { pushNotificationService } from './pushNotification.service';
import { schedulerService } from './scheduler.service';
import logger from '../utils/logger';

/**
 * Push Triggers Service
 * Handles automatic push notification triggers for various events
 */
export class PushTriggersService {
  /**
   * Trigger: Event published
   */
  async onEventPublished(eventId: string, eventName: string, creatorId: string): Promise<void> {
    // Notify followers of the creator
    await pushNotificationService.sendToTopic(`creator_${creatorId}`, {
      title: 'New Event Published',
      body: `${eventName} is now available!`,
      data: { eventId, type: 'event_published' },
    });
    logger.info(`Push triggered: Event published - ${eventId}`);
  }

  /**
   * Trigger: Event updated
   */
  async onEventUpdated(eventId: string, eventName: string, creatorId: string): Promise<void> {
    await pushNotificationService.sendToTopic(`creator_${creatorId}`, {
      title: 'Event Updated',
      body: `${eventName} has been updated`,
      data: { eventId, type: 'event_updated' },
    });
    logger.info(`Push triggered: Event updated - ${eventId}`);
  }

  /**
   * Trigger: Event cancelled
   */
  async onEventCancelled(eventId: string, eventName: string, creatorId: string): Promise<void> {
    await pushNotificationService.sendToTopic(`creator_${creatorId}`, {
      title: 'Event Cancelled',
      body: `${eventName} has been cancelled`,
      data: { eventId, type: 'event_cancelled' },
    });
    logger.info(`Push triggered: Event cancelled - ${eventId}`);
  }

  /**
   * Trigger: Stream going live
   */
  async onStreamGoingLive(streamId: string, streamTitle: string, creatorId: string): Promise<void> {
    await pushNotificationService.sendToTopic(`creator_${creatorId}`, {
      title: 'Stream Live Now',
      body: `${streamTitle} is starting now!`,
      data: { streamId, type: 'stream_live' },
      priority: 'high',
    });
    logger.info(`Push triggered: Stream going live - ${streamId}`);
  }

  /**
   * Trigger: Stream ended
   */
  async onStreamEnded(streamId: string, streamTitle: string, creatorId: string): Promise<void> {
    await pushNotificationService.sendToTopic(`creator_${creatorId}`, {
      title: 'Stream Ended',
      body: `${streamTitle} has ended`,
      data: { streamId, type: 'stream_ended' },
    });
    logger.info(`Push triggered: Stream ended - ${streamId}`);
  }

  /**
   * Trigger: Creator goes live
   */
  async onCreatorGoesLive(creatorId: string, creatorName: string): Promise<void> {
    await pushNotificationService.sendToTopic(`creator_${creatorId}`, {
      title: `${creatorName} is Live`,
      body: 'Join the stream now!',
      data: { creatorId, type: 'creator_live' },
      priority: 'high',
    });
    logger.info(`Push triggered: Creator going live - ${creatorId}`);
  }

  /**
   * Trigger: Payment success
   */
  async onPaymentSuccess(userId: string, amount: number, description: string): Promise<void> {
    await pushNotificationService.sendToUser(userId, {
      title: 'Payment Successful',
      body: `Your payment of $${amount.toFixed(2)} for ${description} was successful`,
      data: { amount, type: 'payment_success' },
    });
    logger.info(`Push triggered: Payment success - ${userId}`);
  }

  /**
   * Trigger: Refund completed
   */
  async onRefundCompleted(userId: string, amount: number): Promise<void> {
    await pushNotificationService.sendToUser(userId, {
      title: 'Refund Processed',
      body: `Your refund of $${amount.toFixed(2)} has been processed`,
      data: { amount, type: 'refund_completed' },
    });
    logger.info(`Push triggered: Refund completed - ${userId}`);
  }

  /**
   * Trigger: Ticket purchased
   */
  async onTicketPurchased(userId: string, eventName: string, ticketCount: number): Promise<void> {
    await pushNotificationService.sendToUser(userId, {
      title: 'Ticket Purchased',
      body: `You have successfully purchased ${ticketCount} ticket(s) for ${eventName}`,
      data: { type: 'ticket_purchased' },
    });
    logger.info(`Push triggered: Ticket purchased - ${userId}`);
  }

  /**
   * Trigger: Chat mention
   */
  async onChatMention(userId: string, mentionedBy: string, message: string): Promise<void> {
    await pushNotificationService.sendToUser(userId, {
      title: `${mentionedBy} mentioned you`,
      body: message.substring(0, 100),
      data: { mentionedBy, type: 'chat_mention' },
      priority: 'high',
    });
    logger.info(`Push triggered: Chat mention - ${userId}`);
  }

  /**
   * Trigger: Chat reply
   */
  async onChatReply(userId: string, repliedBy: string, message: string): Promise<void> {
    await pushNotificationService.sendToUser(userId, {
      title: `${repliedBy} replied to you`,
      body: message.substring(0, 100),
      data: { repliedBy, type: 'chat_reply' },
    });
    logger.info(`Push triggered: Chat reply - ${userId}`);
  }

  /**
   * Trigger: Admin announcement
   */
  async onAdminAnnouncement(title: string, body: string): Promise<void> {
    await pushNotificationService.sendToTopic('all_users', {
      title: `📢 ${title}`,
      body,
      data: { type: 'admin_announcement' },
      priority: 'high',
    });
    logger.info(`Push triggered: Admin announcement - ${title}`);
  }

  /**
   * Schedule event reminders automatically
   */
  async scheduleEventReminders(eventId: string, eventDate: Date, attendees: string[]): Promise<void> {
    for (const userId of attendees) {
      await schedulerService.scheduleEventReminders(eventId, eventDate, userId);
    }
    logger.info(`Scheduled event reminders for ${attendees.length} attendees - ${eventId}`);
  }

  /**
   * Cancel all reminders for an event
   */
  async cancelEventReminders(eventId: string): Promise<void> {
    // Find all event reminder jobs and cancel them
    const jobs = await schedulerService.getJobsByType('event_reminder');
    
    for (const job of jobs) {
      if (job.payload?.eventId === eventId) {
        await schedulerService.cancel(job.jobId);
      }
    }
    
    logger.info(`Cancelled event reminders - ${eventId}`);
  }

  /**
   * Trigger: Ticket reminder (before event)
   */
  async onTicketReminder(userId: string, eventName: string, eventDate: Date): Promise<void> {
    const timeUntil = this.formatTimeUntil(eventDate);
    await pushNotificationService.sendToUser(userId, {
      title: `Event in ${timeUntil}`,
      body: `${eventName} starts ${timeUntil}`,
      data: { type: 'ticket_reminder', eventDate: eventDate.toISOString() },
    });
    logger.info(`Push triggered: Ticket reminder - ${userId}`);
  }

  /**
   * Format time until event
   */
  private formatTimeUntil(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return 'soon';
  }
}

export const pushTriggersService = new PushTriggersService();
