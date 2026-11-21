import { AdminService } from '../admin.service';
import { eventRepository } from '../../repositories/event.repository';
import { streamRepository } from '../../repositories/stream.repository';
import { chatMessageRepository } from '../../repositories/chatMessage.repository';
import { chatBanRepository } from '../../repositories/chatBan.repository';
import { chatRoomRepository } from '../../repositories/chatRoom.repository';
import { paymentRepository } from '../../repositories/payment.repository';
import { refundRepository } from '../../repositories/refund.repository';
import { ticketRepository } from '../../repositories/ticket.repository';
import { couponRepository } from '../../repositories/coupon.repository';
import { scheduledNotificationRepository } from '../../repositories/scheduledNotification.repository';
import { auditRepository } from '../../repositories/audit.repository';
import { ticketService } from '../ticket.service';

// Mock repositories and services
jest.mock('../../repositories/event.repository');
jest.mock('../../repositories/stream.repository');
jest.mock('../../repositories/chatMessage.repository');
jest.mock('../../repositories/chatBan.repository');
jest.mock('../../repositories/chatRoom.repository');
jest.mock('../../repositories/payment.repository');
jest.mock('../../repositories/refund.repository');
jest.mock('../../repositories/ticket.repository');
jest.mock('../../repositories/coupon.repository');
jest.mock('../../repositories/scheduledNotification.repository');
jest.mock('../../repositories/audit.repository');
jest.mock('../ticket.service');

describe('AdminService - Event Moderation', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('approveEvent', () => {
    it('should approve an event successfully', async () => {
      const mockEvent = { id: 'event1', status: 'draft' };
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (eventRepository.update as jest.Mock).mockResolvedValue(mockEvent);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.approveEvent('event1', 'admin1', 'Admin');

      expect(eventRepository.findById).toHaveBeenCalledWith('event1');
      expect(eventRepository.update).toHaveBeenCalledWith('event1', { status: 'scheduled' });
      expect(auditRepository.create).toHaveBeenCalled();
    });

    it('should throw error if event not found', async () => {
      (eventRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(adminService.approveEvent('event1', 'admin1', 'Admin'))
        .rejects.toThrow('Event not found');
    });
  });

  describe('rejectEvent', () => {
    it('should reject an event successfully', async () => {
      const mockEvent = { id: 'event1', status: 'draft' };
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (eventRepository.update as jest.Mock).mockResolvedValue(mockEvent);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.rejectEvent('event1', 'admin1', 'Admin', 'Inappropriate content');

      expect(eventRepository.update).toHaveBeenCalledWith('event1', { status: 'cancelled' });
    });
  });

  describe('featureEvent', () => {
    it('should feature an event successfully', async () => {
      const mockEvent = { id: 'event1', featured: false };
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (eventRepository.update as jest.Mock).mockResolvedValue(mockEvent);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.featureEvent('event1', 'admin1', 'Admin');

      expect(eventRepository.update).toHaveBeenCalledWith('event1', { featured: true });
    });
  });

  describe('unfeatureEvent', () => {
    it('should unfeature an event successfully', async () => {
      const mockEvent = { id: 'event1', featured: true };
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (eventRepository.update as jest.Mock).mockResolvedValue(mockEvent);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.unfeatureEvent('event1', 'admin1', 'Admin');

      expect(eventRepository.update).toHaveBeenCalledWith('event1', { featured: false });
    });
  });

  describe('cancelEvent', () => {
    it('should cancel an event successfully', async () => {
      const mockEvent = { id: 'event1', status: 'scheduled' };
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (eventRepository.update as jest.Mock).mockResolvedValue(mockEvent);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.cancelEvent('event1', 'admin1', 'Admin', 'Low attendance');

      expect(eventRepository.update).toHaveBeenCalledWith('event1', { status: 'cancelled' });
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      const mockEvent = { id: 'event1', title: 'Test Event' };
      (eventRepository.findById as jest.Mock).mockResolvedValue(mockEvent);
      (eventRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.deleteEvent('event1', 'admin1', 'Admin', 'Duplicate');

      expect(eventRepository.delete).toHaveBeenCalledWith('event1');
    });
  });
});

describe('AdminService - Stream Moderation', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('forceStopStream', () => {
    it('should force stop a stream successfully', async () => {
      const mockStream = { id: 'stream1', status: 'live' };
      (streamRepository.findById as jest.Mock).mockResolvedValue(mockStream);
      (streamRepository.update as jest.Mock).mockResolvedValue(mockStream);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.forceStopStream('stream1', 'admin1', 'Admin', 'Policy violation');

      expect(streamRepository.update).toHaveBeenCalledWith('stream1', { status: 'ended' });
    });
  });

  describe('muteStreamChat', () => {
    it('should mute stream chat successfully', async () => {
      const mockRoom = { id: 'room1', chatEnabled: true };
      (chatRoomRepository.findByEventId as jest.Mock).mockResolvedValue(mockRoom);
      (chatRoomRepository.update as jest.Mock).mockResolvedValue(mockRoom);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.muteStreamChat('event1', 'admin1', 'Admin');

      expect(chatRoomRepository.update).toHaveBeenCalledWith('room1', { chatEnabled: false });
    });
  });

  describe('enableStreamChat', () => {
    it('should enable stream chat successfully', async () => {
      const mockRoom = { id: 'room1', chatEnabled: false };
      (chatRoomRepository.findByEventId as jest.Mock).mockResolvedValue(mockRoom);
      (chatRoomRepository.update as jest.Mock).mockResolvedValue(mockRoom);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.enableStreamChat('event1', 'admin1', 'Admin');

      expect(chatRoomRepository.update).toHaveBeenCalledWith('room1', { chatEnabled: true });
    });
  });

  describe('removeStream', () => {
    it('should remove a stream successfully', async () => {
      const mockStream = { id: 'stream1', title: 'Test Stream' };
      (streamRepository.findById as jest.Mock).mockResolvedValue(mockStream);
      (streamRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.removeStream('stream1', 'admin1', 'Admin', 'Inappropriate');

      expect(streamRepository.delete).toHaveBeenCalledWith('stream1');
    });
  });

  describe('disconnectPublisher', () => {
    it('should disconnect publisher successfully', async () => {
      const mockStream = { id: 'stream1', publisherConnected: true };
      (streamRepository.findById as jest.Mock).mockResolvedValue(mockStream);
      (streamRepository.update as jest.Mock).mockResolvedValue(mockStream);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.disconnectPublisher('stream1', 'admin1', 'Admin', 'Technical issue');

      expect(streamRepository.update).toHaveBeenCalledWith('stream1', { publisherConnected: false });
    });
  });
});

describe('AdminService - Chat Moderation', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('deleteChatMessage', () => {
    it('should delete a chat message successfully', async () => {
      const mockMessage = { id: 'msg1', content: 'Test message' };
      (chatMessageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (chatMessageRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.deleteChatMessage('msg1', 'admin1', 'Admin', 'Spam');

      expect(chatMessageRepository.delete).toHaveBeenCalledWith('msg1');
    });
  });

  describe('muteChatUser', () => {
    it('should mute a chat user successfully', async () => {
      const mockRoom = { id: 'room1', mutedUsers: [] };
      (chatRoomRepository.findByEventId as jest.Mock).mockResolvedValue(mockRoom);
      (chatRoomRepository.update as jest.Mock).mockResolvedValue(mockRoom);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.muteChatUser('event1', 'user1', 3600, 'admin1', 'Admin', 'Spamming');

      expect(chatRoomRepository.update).toHaveBeenCalledWith('room1', { mutedUsers: ['user1'] });
    });
  });

  describe('banChatUser', () => {
    it('should ban a chat user successfully', async () => {
      const mockRoom = { id: 'room1', bannedUsers: [] };
      (chatRoomRepository.findByEventId as jest.Mock).mockResolvedValue(mockRoom);
      (chatRoomRepository.update as jest.Mock).mockResolvedValue(mockRoom);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.banChatUser('event1', 'user1', 'admin1', 'Admin', 'Harassment');

      expect(chatRoomRepository.update).toHaveBeenCalledWith('room1', { bannedUsers: ['user1'] });
    });
  });

  describe('shadowBanUser', () => {
    it('should shadow ban a user successfully', async () => {
      (chatBanRepository.create as jest.Mock).mockResolvedValue({});
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.shadowBanUser('event1', 'user1', 'admin1', 'Admin', 'Toxic behavior');

      expect(chatBanRepository.create).toHaveBeenCalledWith({
        banId: expect.stringContaining('ban_'),
        eventId: 'event1',
        userId: 'user1',
        userName: 'Unknown',
        bannedBy: 'admin1',
        bannedByName: 'Admin',
        reason: 'Toxic behavior',
        banType: 'permanent',
        isActive: true,
      });
    });
  });

  describe('addModeratorNote', () => {
    it('should add a moderator note successfully', async () => {
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.addModeratorNote('user1', 'user', 'Review needed', 'admin1', 'Admin');

      expect(auditRepository.create).toHaveBeenCalledWith({
        adminId: 'admin1',
        adminName: 'Admin',
        adminEmail: 'Admin',
        action: 'moderator_note',
        target: 'user',
        targetId: 'user1',
        before: null,
        after: { note: 'Review needed' },
        ip: 'unknown',
        userAgent: undefined,
        success: true,
      });
    });
  });
});

describe('AdminService - Payment Administration', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('approveRefund', () => {
    it('should approve a refund successfully', async () => {
      const mockRefund = { refundId: 'refund1', status: 'pending' };
      (refundRepository.findById as jest.Mock).mockResolvedValue(mockRefund);
      (refundRepository.update as jest.Mock).mockResolvedValue(mockRefund);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.approveRefund('refund1', 'admin1', 'Admin');

      expect(refundRepository.update).toHaveBeenCalledWith('refund1', { status: 'approved' });
    });
  });

  describe('rejectRefund', () => {
    it('should reject a refund successfully', async () => {
      const mockRefund = { refundId: 'refund1', status: 'pending' };
      (refundRepository.findById as jest.Mock).mockResolvedValue(mockRefund);
      (refundRepository.update as jest.Mock).mockResolvedValue(mockRefund);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.rejectRefund('refund1', 'admin1', 'Admin', 'Invalid reason');

      expect(refundRepository.update).toHaveBeenCalledWith('refund1', { status: 'rejected' });
    });
  });

  describe('retryPayment', () => {
    it('should retry a payment successfully', async () => {
      const mockPayment = { paymentId: 'pay1', status: 'failed' };
      (paymentRepository.findById as jest.Mock).mockResolvedValue(mockPayment);
      (paymentRepository.update as jest.Mock).mockResolvedValue(mockPayment);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.retryPayment('pay1', 'admin1', 'Admin');

      expect(paymentRepository.update).toHaveBeenCalledWith('pay1', { status: 'pending' });
    });
  });

  describe('markPaymentFailed', () => {
    it('should mark payment as failed successfully', async () => {
      const mockPayment = { paymentId: 'pay1', status: 'pending' };
      (paymentRepository.findById as jest.Mock).mockResolvedValue(mockPayment);
      (paymentRepository.update as jest.Mock).mockResolvedValue(mockPayment);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.markPaymentFailed('pay1', 'admin1', 'Admin', 'Card declined');

      expect(paymentRepository.update).toHaveBeenCalledWith('pay1', { status: 'failed' });
    });
  });

  describe('manualPaymentAdjustment', () => {
    it('should adjust payment amount successfully', async () => {
      const mockPayment = { paymentId: 'pay1', amount: 100 };
      (paymentRepository.findById as jest.Mock).mockResolvedValue(mockPayment);
      (paymentRepository.update as jest.Mock).mockResolvedValue(mockPayment);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.manualPaymentAdjustment('pay1', 10, 'Discount applied', 'admin1', 'Admin');

      expect(paymentRepository.update).toHaveBeenCalledWith('pay1', { amount: 110 });
    });
  });
});

describe('AdminService - Ticket Administration', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('verifyTicket', () => {
    it('should verify a ticket successfully', async () => {
      const mockTicket = { ticketId: 'ticket1', status: 'active' };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (ticketRepository.update as jest.Mock).mockResolvedValue(mockTicket);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.verifyTicket('ticket1', 'admin1', 'Admin');

      expect(ticketRepository.update).toHaveBeenCalledWith('ticket1', { status: 'active' });
    });
  });

  describe('voidTicket', () => {
    it('should void a ticket successfully', async () => {
      const mockTicket = { ticketId: 'ticket1', status: 'active' };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (ticketRepository.update as jest.Mock).mockResolvedValue(mockTicket);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.voidTicket('ticket1', 'admin1', 'Admin', 'Refund requested');

      expect(ticketRepository.update).toHaveBeenCalledWith('ticket1', { status: 'cancelled' });
    });
  });

  describe('reissueTicket', () => {
    it('should reissue a ticket successfully', async () => {
      const mockTicket = { 
        ticketId: 'ticket1', 
        eventId: 'event1', 
        userId: 'user1', 
        creatorId: 'creator1',
        orderId: 'order1',
        ticketType: 'regular',
        price: 100,
        currency: 'USD'
      };
      const newTicket = { ticketId: 'ticket2' };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (ticketService.createTicket as jest.Mock).mockResolvedValue(newTicket);
      (ticketRepository.update as jest.Mock).mockResolvedValue(mockTicket);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.reissueTicket('ticket1', 'admin1', 'Admin', 'Lost ticket');

      expect(ticketService.createTicket).toHaveBeenCalled();
      expect(ticketRepository.update).toHaveBeenCalledWith('ticket1', { status: 'cancelled' });
    });
  });

  describe('cancelTicket', () => {
    it('should cancel a ticket successfully', async () => {
      const mockTicket = { ticketId: 'ticket1', status: 'active' };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);
      (ticketRepository.update as jest.Mock).mockResolvedValue(mockTicket);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.cancelTicket('ticket1', 'admin1', 'Admin', 'Event cancelled');

      expect(ticketRepository.update).toHaveBeenCalledWith('ticket1', { status: 'cancelled' });
    });
  });
});

describe('AdminService - Coupon Administration', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('should create a coupon successfully', async () => {
      (couponRepository.create as jest.Mock).mockResolvedValue({});
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.createCoupon(
        'SAVE20',
        'percentage',
        20,
        100,
        10,
        new Date('2025-12-31'),
        'admin1',
        'Admin'
      );

      expect(couponRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateCoupon', () => {
    it('should update a coupon successfully', async () => {
      const mockCoupon = { couponId: 'coupon1', code: 'SAVE20' };
      (couponRepository.findById as jest.Mock).mockResolvedValue(mockCoupon);
      (couponRepository.update as jest.Mock).mockResolvedValue(mockCoupon);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.updateCoupon('coupon1', { value: 25 }, 'admin1', 'Admin');

      expect(couponRepository.update).toHaveBeenCalledWith('coupon1', { value: 25 });
    });
  });

  describe('disableCoupon', () => {
    it('should disable a coupon successfully', async () => {
      const mockCoupon = { couponId: 'coupon1', isPlatformCoupon: true };
      (couponRepository.findById as jest.Mock).mockResolvedValue(mockCoupon);
      (couponRepository.update as jest.Mock).mockResolvedValue(mockCoupon);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.disableCoupon('coupon1', 'admin1', 'Admin');

      expect(couponRepository.update).toHaveBeenCalledWith('coupon1', { isPlatformCoupon: false });
    });
  });

  describe('deleteCoupon', () => {
    it('should delete a coupon successfully', async () => {
      const mockCoupon = { couponId: 'coupon1', code: 'SAVE20' };
      (couponRepository.findById as jest.Mock).mockResolvedValue(mockCoupon);
      (couponRepository.delete as jest.Mock).mockResolvedValue(undefined);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.deleteCoupon('coupon1', 'admin1', 'Admin', 'No longer needed');

      expect(couponRepository.delete).toHaveBeenCalledWith('coupon1');
    });
  });

  describe('getCouponStatistics', () => {
    it('should get coupon statistics successfully', async () => {
      const mockCoupon = {
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        maxUses: 100,
        usedCount: 30,
        expiryDate: new Date('2025-12-31'),
        isPlatformCoupon: true,
      };
      (couponRepository.findById as jest.Mock).mockResolvedValue(mockCoupon);

      const stats = await adminService.getCouponStatistics('coupon1');

      expect(stats).toEqual({
        couponId: 'coupon1',
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        maxUses: 100,
        usedCount: 30,
        remainingUses: 70,
        expiryDate: mockCoupon.expiryDate,
        isPlatformCoupon: true,
      });
    });
  });
});

describe('AdminService - Notification Administration', () => {
  let adminService: AdminService;

  beforeEach(() => {
    adminService = new AdminService();
    jest.clearAllMocks();
  });

  describe('broadcastNotification', () => {
    it('should broadcast notification successfully', async () => {
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.broadcastNotification('Maintenance', 'Server maintenance in 1 hour', 'admin1', 'Admin');

      expect(auditRepository.create).toHaveBeenCalled();
    });
  });

  describe('broadcastEmail', () => {
    it('should broadcast email successfully', async () => {
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.broadcastEmail('Important Update', 'New features available', 'admin1', 'Admin');

      expect(auditRepository.create).toHaveBeenCalled();
    });
  });

  describe('broadcastPush', () => {
    it('should broadcast push notification successfully', async () => {
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.broadcastPush('New Event', 'Check out our latest event', 'admin1', 'Admin');

      expect(auditRepository.create).toHaveBeenCalled();
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule a campaign successfully', async () => {
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.scheduleCampaign(
        'Summer Sale',
        '50% off all events',
        new Date('2025-07-01'),
        'admin1',
        'Admin'
      );

      expect(auditRepository.create).toHaveBeenCalled();
    });
  });

  describe('cancelCampaign', () => {
    it('should cancel a campaign successfully', async () => {
      const mockCampaign = { id: 'campaign1', status: 'scheduled' };
      (scheduledNotificationRepository.findById as jest.Mock).mockResolvedValue(mockCampaign);
      (scheduledNotificationRepository.update as jest.Mock).mockResolvedValue(mockCampaign);
      (auditRepository.create as jest.Mock).mockResolvedValue({});

      await adminService.cancelCampaign('campaign1', 'admin1', 'Admin', 'Rescheduled');

      expect(scheduledNotificationRepository.update).toHaveBeenCalledWith('campaign1', { status: 'cancelled' });
    });
  });

  describe('getDeliveryStatistics', () => {
    it('should get delivery statistics successfully', async () => {
      const mockCampaign = {
        id: 'campaign1',
        status: 'sent',
        scheduledFor: new Date('2025-07-01'),
        sentAt: new Date('2025-07-01'),
      };
      (scheduledNotificationRepository.findById as jest.Mock).mockResolvedValue(mockCampaign);

      const stats = await adminService.getDeliveryStatistics('campaign1');

      expect(stats).toEqual({
        campaignId: 'campaign1',
        status: 'sent',
        scheduledFor: mockCampaign.scheduledFor,
        sentAt: mockCampaign.sentAt,
      });
    });
  });
});
