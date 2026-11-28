export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  role: 'viewer' | 'creator' | 'administrator';
  status: 'active' | 'suspended' | 'banned';
  language?: string;
  country?: string;
  socialLinks?: SocialLinks;
  createdAt: Date;
  updatedAt: Date;
  verified?: boolean;
  trustScore?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

export interface Creator {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  category?: string;
  language?: string;
  country?: string;
  socialLinks?: SocialLinks;
  verified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationRequest?: VerificationRequest;
  featured: boolean;
  followersCount: number;
  eventsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationRequest {
  documentType: string;
  documentNumber?: string;
  additionalInfo?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  sport?: string;
  tags?: string[];
  country: string;
  city: string;
  venue?: string;
  creatorUid: string;
  /** Mirror of creatorUid kept for Firestore rules and legacy clients. */
  ownerId?: string;
  creatorName: string;
  ticketPrice: number;
  currency: string;
  cameraType: string;
  streamType: 'live' | 'vr' | '360';
  eventDate: string;
  eventTime: string;
  timezone?: string;
  duration?: number;
  status: 'draft' | 'pending' | 'scheduled' | 'live' | 'ended' | 'rejected' | 'cancelled';
  rejectionReason?: string;
  thumbnail?: string;
  banner?: string;
  capacity: number;
  language?: string;
  ageRestriction?: number;
  featured: boolean;
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stream {
  id: string;
  streamId: string;
  eventId: string;
  creatorId: string;
  roomName: string;
  liveKitRoom: string;
  status: 'idle' | 'starting' | 'live' | 'reconnecting' | 'ending' | 'ended' | 'failed';
  publisherConnected: boolean;
  viewerCount: number;
  peakViewers: number;
  recordingEnabled: boolean;
  health: 'healthy' | 'warning' | 'offline';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamSession {
  id: string;
  streamId: string;
  userId: string;
  role: 'publisher' | 'subscriber' | 'moderator';
  joinedAt: Date;
  leftAt?: Date;
  duration?: number;
}

export interface StreamHealth {
  id: string;
  streamId: string;
  publisherConnected: boolean;
  roomExists: boolean;
  viewerCount: number;
  reconnectAttempts: number;
  heartbeatTimestamp: Date;
  liveKitAvailable: boolean;
  health: 'healthy' | 'warning' | 'offline';
  lastChecked: Date;
}

export type TicketType = 'regular' | 'vip' | 'earlyBird' | 'group';
export type TicketStatus = 'active' | 'used' | 'cancelled' | 'expired';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentProvider = 'razorpay' | 'stripe' | 'paypal' | 'mock';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR';
export type CouponType = 'percentage' | 'fixed';
export type RefundStatus = 'pending' | 'approved' | 'rejected';

export interface TicketingTicket {
  ticketId: string;
  eventId: string;
  userId: string;
  creatorId: string;
  orderId: string;
  ticketType: TicketType;
  price: number;
  currency: Currency;
  status: TicketStatus;
  qrCode: string;
  qrSignature: string;
  purchaseDate: Date;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketingOrder {
  orderId: string;
  userId: string;
  creatorId: string;
  eventId: string;
  ticketIds: string[];
  items?: Array<{ ticketType: TicketType; price: number; quantity: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  platformFee: number;
  total: number;
  currency: Currency;
  status: OrderStatus;
  paymentProvider: PaymentProvider;
  paymentId?: string;
  couponId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  providerPaymentId: string;
  status: OrderStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Coupon {
  couponId: string;
  code: string;
  type: CouponType;
  value: number;
  maxUses: number;
  usedCount: number;
  minPurchase: number;
  expiryDate: Date;
  creatorId?: string;
  isPlatformCoupon: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  refundId: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: RefundStatus;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receipt {
  receiptId: string;
  orderId: string;
  userId: string;
  items: ReceiptItem;
  subtotal: number;
  discount: number;
  tax: number;
  platformFee: number;
  total: number;
  currency: Currency;
  generatedAt: Date;
}

export interface ReceiptItem {
  ticketId: string;
  ticketType: TicketType;
  eventName: string;
  price: number;
  quantity: number;
}

export interface ChatRoom {
  id: string;
  eventId: string;
  slowMode: boolean;
  slowModeInterval: number; // 5, 10, 30, 60 seconds
  chatEnabled: boolean;
  subscriberOnly: boolean;
  followersOnly: boolean;
  moderators: string[]; // user IDs
  bannedUsers: string[]; // user IDs
  mutedUsers: string[]; // user IDs
  messageCount: number;
  activeUsers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  messageId: string;
  eventId: string;
  streamId: string;
  senderId: string;
  senderName: string;
  senderRole: 'viewer' | 'creator' | 'moderator' | 'administrator';
  message: string;
  messageType: 'text' | 'emoji' | 'image' | 'system';
  replyTo?: string; // message ID
  reactions: MessageReaction[];
  isPinned: boolean;
  isDeleted: boolean;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ChatReport {
  id: string;
  reportId: string;
  messageId: string;
  eventId: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  description?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  assignedTo?: string; // moderator ID
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatBan {
  id: string;
  banId: string;
  eventId: string;
  userId: string;
  userName: string;
  bannedBy: string; // moderator ID
  bannedByName: string;
  reason: string;
  banType: 'permanent' | 'temporary';
  duration?: number; // for temporary bans in seconds
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 'IN_APP' | 'SYSTEM' | 'SECURITY' | 'EVENT' | 'STREAM' | 'TICKET' | 'PAYMENT' | 'REFUND' | 'CHAT' | 'CREATOR' | 'ADMIN';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  status: NotificationStatus;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreference {
  userId: string;
  inAppEnabled: boolean;
  eventNotifications: boolean;
  streamNotifications: boolean;
  chatNotifications: boolean;
  ticketNotifications: boolean;
  paymentNotifications: boolean;
  creatorNotifications: boolean;
  adminNotifications: boolean;
  language: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  templateId: string;
  type: NotificationType;
  title: string;
  message: string;
  language: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Follower {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetType: 'user' | 'creator' | 'event';
  reason: string;
  description: string;
  evidence?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'rejected';
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  reason?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
}

export interface LiveKitTokenRequest {
  roomName: string;
  participantName: string;
  displayName?: string;
  role: 'publisher' | 'subscriber' | 'moderator';
}

export interface LiveKitTokenResponse {
  token: string;
  url: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'delivered' | 'bounced' | 'opened' | 'clicked';

export interface EmailLog {
  emailId: string;
  userId?: string;
  recipient: string;
  template: string;
  subject: string;
  provider: string;
  status: EmailStatus;
  retryCount: number;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  errorMessage?: string;
  variables?: Record<string, string | number>;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';

export interface TicketDelivery {
  deliveryId: string;
  ticketId: string;
  orderId: string;
  userId: string;
  recipient: string;
  status: TicketDeliveryStatus;
  retryCount: number;
  provider: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device Token for Push Notifications
 */
export interface DeviceToken {
  deviceId: string;
  userId: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
  timezone?: string;
  language?: string;
  lastSeen?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scheduled Notification
 */
export interface ScheduledNotification {
  id: string;
  userId?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  scheduledFor: Date;
  timezone?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled' | 'paused';
  priority?: 'normal' | 'high';
  retryCount: number;
  maxRetries: number;
  error?: string;
  cronExpression?: string;
  recurring: boolean;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

/**
 * Push Log
 */
export type PushLogStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';

export interface PushLog {
  id: string;
  userId?: string;
  deviceId?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  status: PushLogStatus;
  provider: string;
  messageId?: string;
  error?: string;
  priority?: 'normal' | 'high';
  ttl?: number;
  silent?: boolean;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  retryCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job Log
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export interface JobLog {
  id: string;
  jobType: string;
  jobId: string;
  status: JobStatus;
  payload?: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  priority?: number;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Analytics Types
 */

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  userId?: string;
  creatorId?: string;
  eventId?: string;
  data?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

export interface AnalyticsDaily {
  id: string;
  date: string; // YYYY-MM-DD
  metrics: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformAnalytics {
  id: string;
  date: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalCreators: number;
  activeCreators: number;
  totalEvents: number;
  activeEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalStreamMinutes: number;
  totalMessages: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatorAnalytics {
  id: string;
  creatorId: string;
  date: string;
  followers: number;
  newFollowers: number;
  revenue: number;
  ticketsSold: number;
  eventsHosted: number;
  liveStreams: number;
  averageAttendance: number;
  totalViews: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAnalytics {
  id: string;
  eventId: string;
  date: string;
  views: number;
  uniqueVisitors: number;
  registrations: number;
  attendance: number;
  peakConcurrentViewers: number;
  averageWatchTime: number;
  retention: number;
  chatMessages: number;
  revenue: number;
  conversionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueAnalytics {
  id: string;
  date: string;
  grossRevenue: number;
  netRevenue: number;
  platformFees: number;
  taxes: number;
  refunds: number;
  coupons: number;
  averageOrderValue: number;
  revenueByEvent: Record<string, number>;
  revenueByCreator: Record<string, number>;
  revenueByCountry: Record<string, number>;
  revenueByCurrency: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAnalytics {
  id: string;
  date: string;
  newUsers: number;
  activeUsers: number;
  returningUsers: number;
  countries: Record<string, number>;
  devices: Record<string, number>;
  languages: Record<string, number>;
  retention: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StreamAnalytics {
  id: string;
  streamId: string;
  eventId: string;
  creatorId: string;
  date: string;
  peakViewers: number;
  averageViewers: number;
  watchTime: number;
  joinRate: number;
  leaveRate: number;
  bitrateHistory: number[];
  streamDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatAnalytics {
  id: string;
  eventId: string;
  date: string;
  messages: number;
  uniqueChatters: number;
  deletedMessages: number;
  reports: number;
  bans: number;
  spamDetection: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrowthAnalytics {
  id: string;
  date: string;
  userGrowth: number;
  creatorGrowth: number;
  eventGrowth: number;
  revenueGrowth: number;
  engagementRate: number;
  retentionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketAnalytics {
  id: string;
  eventId: string;
  date: string;
  ticketsSold: number;
  ticketsRemaining: number;
  sellThroughRate: number;
  averageTicketPrice: number;
  freeTickets: number;
  paidTickets: number;
  refundRate: number;
  couponUsage: number;
  ticketTypeBreakdown: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export type AnalyticsPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  period?: AnalyticsPeriod;
  filters?: Record<string, any>;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  startDate: string;
  endDate: string;
}

// =====================================================
// Admin Dashboard Types (Phase 9B)
// =====================================================

export interface AdminDashboard {
  summary: DashboardSummary;
  platformHealth: PlatformHealth;
  recentActivity: RecentActivity[];
  alerts: AdminAlert[];
}

/** A metric is `null` when it could not be computed (never a fabricated 0). */
export interface DashboardSummary {
  totalUsers: number | null;
  activeUsers: number | null;
  totalCreators: number | null;
  activeCreators: number | null;
  totalEvents: number | null;
  liveEvents: number | null;
  pendingEvents: number | null;
  totalRevenue: number | null;
  monthlyRevenue: number | null;
  totalTickets: number | null;
  monthlyTickets: number | null;
  totalStreams: number | null;
  activeStreams: number | null;
  totalMessages: number | null;
  pendingReports: number | null;
  pendingVerifications: number | null;
  systemStatus: 'healthy' | 'degraded' | 'critical';
}

export interface PlatformHealth {
  firestore: ServiceHealth;
  redis: ServiceHealth;
  livekit: ServiceHealth;
  queue: ServiceHealth;
  scheduler: ServiceHealth;
  email: ServiceHealth;
  push: ServiceHealth;
  workers: WorkerHealth[];
  system: SystemHealth;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  lastCheck: Date;
  errorRate?: number;
  uptime?: number;
}

export interface WorkerHealth {
  id: string;
  type: string;
  status: 'active' | 'idle' | 'error';
  jobsProcessed: number;
  jobsFailed: number;
  lastActivity: Date;
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  loadAverage: number[];
}

export interface AdminUser {
  id: string;
  userId: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  lastLogin?: Date;
  lastLoginIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  targetId?: string;
  before?: any;
  after?: any;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  device?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  details: any;
  timestamp: Date;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  category: 'general' | 'platform' | 'streaming' | 'payment' | 'email' | 'push' | 'analytics';
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: Date;
  updatedBy: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutType: 'all' | 'percentage' | 'user_list' | 'environment';
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedEnvironments?: string[];
  conditions?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface MaintenanceMode {
  id: string;
  enabled: boolean;
  message?: string;
  startTime?: Date;
  estimatedEndTime?: Date;
  whitelistedAdmins: string[];
  whitelistedIps?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SupportTicketSummary {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'creator' | 'event' | 'payment' | 'report';
  action: string;
  description: string;
  targetId?: string;
  targetName?: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
}

export interface AdminAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AdminSearchResult {
  type: 'user' | 'creator' | 'event' | 'order' | 'ticket' | 'payment' | 'chat' | 'report';
  id: string;
  title: string;
  subtitle?: string;
  data: any;
  relevance: number;
}

export interface AdminExport {
  id: string;
  type: 'users' | 'creators' | 'events' | 'orders' | 'payments' | 'analytics' | 'audit_logs';
  format: 'csv' | 'json' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: any;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
  fileUrl?: string;
  errorMessage?: string;
}

export interface BroadcastMessage {
  id: string;
  type: 'notification' | 'email' | 'push';
  title: string;
  body: string;
  target: 'all' | 'users' | 'creators' | 'specific';
  targetUsers?: string[];
  targetCriteria?: any;
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  deliveryStats?: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened?: number;
    clicked?: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}
