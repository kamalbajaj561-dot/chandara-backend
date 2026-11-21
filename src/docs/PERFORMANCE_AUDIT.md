# Chandara Backend - Performance Audit

**Date**: August 10, 2026  
**Phase**: 10B - Performance, Scalability & Reliability Hardening  
**Scope**: Complete backend performance analysis

---

## Executive Summary

This audit identifies performance bottlenecks, scalability issues, and reliability concerns across the Chandara backend. The audit covers Firestore queries, Redis usage, API endpoints, queues, schedulers, and external integrations.

**Overall Assessment**: The application has a solid foundation but requires improvements in:
- Firestore query optimization (pagination, N+1 queries)
- Redis connection reliability and fallback handling
- Ticket inventory concurrency protection
- Payment idempotency
- Queue retry logic with exponential backoff
- Scheduler duplicate execution protection
- Analytics aggregation overlap prevention

---

## 1. Firestore Performance Issues

### 1.1 Event Repository - N+1 Query Pattern

**Issue**: `getEventsByTags` performs multiple queries in a loop (N+1 problem)

**Location**: `src/repositories/event.repository.ts:150-171`

**Severity**: HIGH

**Current Behavior**:
```typescript
for (const tag of tags) {
  const snapshot = await this.db
    .collection(this.collection)
    .where('tags', 'array-contains', tag)
    .limit(limit)
    .get();
  // Processes each tag sequentially
}
```

**Impact**: With 5 tags, this makes 5 sequential Firestore queries. Each query adds latency.

**Recommended Fix**: 
- Use a single query with `array-contains-any` if supported, or
- Implement parallel queries with `Promise.all()`, or
- Use a composite index with multiple tag filters

**Expected Impact**: Reduce latency from O(n * query_time) to O(query_time)

---

### 1.2 Event Repository - Double Query for Pagination

**Issue**: `listEvents` performs two queries (count + data) for pagination

**Location**: `src/repositories/event.repository.ts:109-112`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
const countSnapshot = await query.get();
const total = countSnapshot.size;

const snapshot = await query.limit(limit).offset(offset).get();
```

**Impact**: Every paginated request makes 2 Firestore reads instead of 1.

**Recommended Fix**: 
- Use Firestore's `count()` aggregation query (if available), or
- Accept approximate counts, or
- Cache total counts for common filter combinations

**Expected Impact**: 50% reduction in Firestore reads for paginated endpoints

---

### 1.3 Event Repository - Search Performs Multiple Queries

**Issue**: `searchEvents` performs two separate range queries for title and description

**Location**: `src/repositories/event.repository.ts:118-148`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
const titleSnapshot = await this.db
  .collection(this.collection)
  .where('title', '>=', query)
  .where('title', '<=', query + '\uf8ff')
  .limit(limit)
  .get();

const descriptionSnapshot = await this.db
  .collection(this.collection)
  .where('description', '>=', query)
  .where('description', '<=', query + '\uf8ff')
  .limit(limit)
  .get();
```

**Impact**: 2 sequential Firestore reads for every search.

**Recommended Fix**: 
- Use parallel queries with `Promise.all()`, or
- Implement a dedicated search index (e.g., Algolia, Typesense), or
- Use Firestore full-text search patterns with single query

**Expected Impact**: 50% reduction in search latency

---

### 1.4 Event Repository - In-Memory Filtering for Overlap Check

**Issue**: `checkOverlappingEvents` fetches all creator events then filters in memory

**Location**: `src/repositories/event.repository.ts:238-274`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
const snapshot = await query.get(); // Fetches ALL events
if (snapshot.empty) return false;

// Filters in memory
for (const doc of snapshot.docs) {
  // Overlap calculation
}
```

**Impact**: For creators with many events, this loads unnecessary data into memory.

**Recommended Fix**: 
- Add date range filters to the query before fetching, or
- Use Firestore composite index for efficient date range queries

**Expected Impact**: Reduced memory usage and faster overlap checks

---

### 1.5 Missing Pagination in Multiple Repositories

**Issue**: Several repository methods lack pagination or use high default limits

**Severity**: MEDIUM

**Affected Methods**:
- `order.repository.ts`: `findByUserId` default limit 50
- `payment.repository.ts`: `findByUserId` default limit 50
- `ticket.repository.ts`: `findByUserId` default limit 50
- `chatMessage.repository.ts`: May have unbounded queries

**Recommended Fix**: 
- Add cursor-based pagination to all list methods
- Reduce default limits (e.g., 20 instead of 50)
- Add maximum limit enforcement (e.g., max 100)

**Expected Impact**: Prevent unbounded Firestore reads and large response payloads

---

## 2. Redis Performance Issues

### 2.1 No Connection Reuse Strategy

**Issue**: Redis client is initialized once but lacks reconnect configuration

**Location**: `src/services/redis.ts:7-32`

**Severity**: HIGH

**Current Behavior**:
```typescript
client = createClient({
  socket: {
    host: config.redis.host,
    port: config.redis.port,
  },
  password: config.redis.password || undefined,
  database: config.redis.db,
});
```

**Impact**: If Redis connection drops, reconnection behavior is not controlled.

**Recommended Fix**: 
- Add `reconnectStrategy` configuration
- Add `connectTimeout` and `socket.keepAlive` options
- Implement exponential backoff for reconnection

**Expected Impact**: More reliable Redis connectivity under network issues

---

### 2.2 No Command Timeouts

**Issue**: Redis commands have no timeout configuration

**Location**: `src/services/redis.ts`

**Severity**: MEDIUM

**Impact**: Slow Redis operations can block indefinitely.

**Recommended Fix**: 
- Add command timeout configuration
- Use `commandTimeout` in client options

**Expected Impact**: Prevent indefinite blocking on slow Redis operations

---

### 2.3 No Graceful Fallback

**Issue**: Redis operations throw errors instead of falling back gracefully

**Location**: `src/services/redis.ts:41-64`

**Severity**: HIGH

**Current Behavior**:
```typescript
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Failed to get cache:', error);
    return null; // Returns null but doesn't indicate cache miss vs error
  }
}
```

**Impact**: Cannot distinguish between cache miss and Redis failure.

**Recommended Fix**: 
- Add Redis health check
- Implement fallback behavior for critical vs non-critical operations
- Return a flag indicating cache availability

**Expected Impact**: Better handling of Redis outages without breaking API endpoints

---

### 2.4 Inefficient Pattern Deletion

**Issue**: `deleteCachePattern` uses `keys()` which is O(N)

**Location**: `src/services/redis.ts:75-85`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
const keys = await client.keys(pattern);
if (keys.length > 0) {
  await client.del(keys);
}
```

**Impact**: `keys()` command blocks Redis and is slow with many keys.

**Recommended Fix**: 
- Use `SCAN` instead of `keys()` for production, or
- Maintain a set of cache keys per pattern, or
- Use hash-based caching with single key deletion

**Expected Impact**: Prevent Redis blocking during cache invalidation

---

## 3. Queue & Scheduler Issues

### 3.1 Scheduler Uses O(N) keys() Operation

**Issue**: `getJobsByType` scans all job data keys

**Location**: `src/providers/redisSchedulerProvider.ts:199-220`

**Severity**: HIGH

**Current Behavior**:
```typescript
const keys = await this.client.keys(`${this.JOB_DATA_PREFIX}:*`);
for (const key of keys) {
  const data = await this.client.get(key);
  // ...
}
```

**Impact**: Scans all keys in Redis, blocking and slow with many jobs.

**Recommended Fix**: 
- Maintain a set of job IDs per type in Redis
- Use `SCAN` for iteration
- Add job type indexing

**Expected Impact**: Significant performance improvement for job queries

---

### 3.2 No Duplicate Execution Protection

**Issue**: Scheduler jobs can execute multiple times if worker restarts

**Location**: `src/providers/redisSchedulerProvider.ts:441-451`

**Severity**: HIGH

**Current Behavior**:
```typescript
private async processQueue(): Promise<void> {
  const jobId = await this.client.rPop(this.QUEUE_PREFIX);
  if (!jobId) return;
  await this.execute(jobId);
}
```

**Impact**: If worker crashes after popping but before completion, job is lost. If multiple workers run, duplicate execution possible.

**Recommended Fix**: 
- Use Redis distributed lock for job execution
- Move job to processing queue before execution
- Add job execution timeout with automatic requeue

**Expected Impact**: Prevent duplicate job execution and job loss

---

### 3.3 No Job Execution Timeout

**Issue**: Jobs have no execution timeout protection

**Location**: `src/providers/redisSchedulerProvider.ts:285-330`

**Severity**: HIGH

**Impact**: Long-running jobs can block the worker indefinitely.

**Recommended Fix**: 
- Add execution timeout with automatic failure
- Implement job timeout configuration per job type
- Move timed-out jobs to failed queue

**Expected Impact**: Prevent worker blocking by runaway jobs

---

### 3.4 Sequential Job Processing

**Issue**: Worker processes one job at a time

**Location**: `src/providers/redisSchedulerProvider.ts:441-451`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
for (let i = 0; i < batchSize; i++) {
  const itemStr = await client.rPop(queueKey);
  // Processes sequentially
}
```

**Impact**: Low throughput for parallelizable jobs.

**Recommended Fix**: 
- Implement concurrent job processing with worker pool
- Add concurrency limit configuration

**Expected Impact**: Higher queue throughput

---

## 4. Payment Reliability Issues

### 4.1 No Payment Idempotency

**Issue**: Duplicate payment creation is not prevented

**Location**: `src/services/payment.service.ts:28-64`

**Severity**: CRITICAL

**Current Behavior**:
```typescript
async createPayment(
  orderId: string,
  userId: string,
  amount: number,
  // ...
): Promise<PaymentResponse> {
  const response = await paymentProvider.createPayment(request);
  if (response.success && response.providerPaymentId) {
    await paymentRepository.create({...});
  }
}
```

**Impact**: Client retries can create duplicate payments.

**Recommended Fix**: 
- Add idempotency key to payment creation
- Check for existing payment with same idempotency key
- Use Firestore transaction for atomic check-and-create

**Expected Impact**: Prevent duplicate charges and payment records

---

### 4.2 No Transaction Safety

**Issue**: Payment and order updates are not transactional

**Location**: `src/services/payment.service.ts:66-87`

**Severity**: HIGH

**Current Behavior**:
```typescript
if (verification.success) {
  const payment = await paymentRepository.findByProviderPaymentId(providerPaymentId);
  if (payment && payment.status !== verification.status) {
    await paymentRepository.updateStatus(payment.paymentId, verification.status);
    const order = await orderRepository.findByPaymentId(payment.paymentId);
    if (order) {
      await orderRepository.updateStatus(order.orderId, verification.status);
    }
  }
}
```

**Impact**: Partial updates can leave system in inconsistent state.

**Recommended Fix**: 
- Use Firestore transaction for payment + order status updates
- Ensure atomic state transitions

**Expected Impact**: Prevent inconsistent payment/order states

---

## 5. Ticket Inventory Concurrency Issues

### 5.1 No Concurrency Protection

**Issue**: Ticket purchasing has no protection against race conditions

**Location**: `src/services/ticket.service.ts:33-62`

**Severity**: CRITICAL

**Current Behavior**:
```typescript
async createTicketsForOrder(
  // ...
): Promise<TicketingTicket[]> {
  const tickets: TicketingTicket[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticket = await this.createTicket(...);
      tickets.push(ticket);
    }
  }
  // No capacity check, no transaction
}
```

**Impact**: Two simultaneous buyers can both purchase the last ticket.

**Recommended Fix**: 
- Use Firestore transaction for capacity check + ticket creation
- Implement atomic decrement of available tickets
- Add optimistic locking with version field

**Expected Impact**: Prevent overselling and inventory inconsistencies

---

### 5.2 Sequential Ticket Creation

**Issue**: Tickets are created sequentially in a loop

**Location**: `src/services/ticket.service.ts:43-56`

**Severity**: MEDIUM

**Impact**: Slow for orders with many tickets.

**Recommended Fix**: 
- Use Firestore batch write for multiple tickets
- Create all tickets in single transaction

**Expected Impact**: Faster ticket creation for bulk orders

---

## 6. Order Reliability Issues

### 6.1 No State Transition Validation

**Issue**: Order status changes are not validated

**Location**: `src/services/order.service.ts:90-92`

**Severity**: HIGH

**Current Behavior**:
```typescript
async updateOrderStatus(orderId: string, status: OrderStatus) {
  return await orderRepository.updateStatus(orderId, status);
}
```

**Impact**: Invalid state transitions possible (e.g., failed → paid).

**Recommended Fix**: 
- Implement state machine with valid transitions
- Validate status changes before update
- Add transition logging

**Expected Impact**: Prevent invalid order state transitions

---

### 6.2 No Order Idempotency

**Issue**: Duplicate order creation is not prevented

**Location**: `src/services/order.service.ts:13-72`

**Severity**: HIGH

**Impact**: Client retries can create duplicate orders.

**Recommended Fix**: 
- Add idempotency key to order creation
- Check for existing order with same idempotency key
- Use Firestore transaction for atomic check-and-create

**Expected Impact**: Prevent duplicate orders

---

## 7. Email Queue Issues

### 7.1 No Exponential Backoff

**Issue**: Email retry uses linear delay

**Location**: `src/services/email.service.ts:221-252`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
async retryFailedEmails(maxRetryCount?: number): Promise<number> {
  // No exponential backoff
  await this.processEmail(...);
}
```

**Impact**: Retries can overwhelm failing email provider.

**Recommended Fix**: 
- Implement exponential backoff: delay = base_delay * 2^retry_count
- Add jitter to avoid thundering herd

**Expected Impact**: Better retry behavior under provider issues

---

### 7.2 No Dead-Letter Queue

**Issue**: Permanently failed emails have no dead-letter handling

**Location**: `src/services/email.service.ts`

**Severity**: MEDIUM

**Impact**: Failed emails accumulate in failed state without clear handling.

**Recommended Fix**: 
- Move emails exceeding max retries to dead-letter queue
- Add dead-letter queue processing endpoint
- Implement manual retry from dead-letter

**Expected Impact**: Better handling of permanently failed emails

---

### 7.3 Queue Processing Lacks Error Isolation

**Issue**: One bad email can stop queue processing

**Location**: `src/services/email.service.ts:190-216`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
for (let i = 0; i < batchSize; i++) {
  try {
    const item: EmailQueueItem = JSON.parse(itemStr);
    await this.processEmail(...);
  } catch (error) {
    logger.error('Error processing queued email:', error);
    // Continues but malformed jobs not handled
  }
}
```

**Impact**: Malformed jobs cause errors but aren't properly isolated.

**Recommended Fix**: 
- Add JSON validation before processing
- Move malformed jobs to dead-letter queue
- Add job schema validation

**Expected Impact**: Better queue resilience to malformed jobs

---

## 8. Push Notification Queue Issues

### 8.1 Batch Failure on Single Invalid Token

**Issue**: Invalid device token can fail entire batch

**Location**: `src/services/pushNotification.service.ts:105-137`

**Severity**: MEDIUM

**Current Behavior**:
```typescript
results.forEach((result, index) => {
  if (result.success) {
    sent++;
  } else {
    failed++;
    // Continues but could improve isolation
  }
});
```

**Impact**: Currently handles failures gracefully but could be improved.

**Recommended Fix**: 
- Already handles individual failures well
- Consider implementing per-device retry logic
- Add batch size configuration

**Expected Impact**: Minor improvement in batch reliability

---

### 8.2 No Dead-Letter for Failed Pushes

**Issue**: Permanently failed pushes have no dead-letter handling

**Location**: `src/services/pushNotification.service.ts`

**Severity**: LOW

**Impact**: Failed pushes accumulate without clear handling.

**Recommended Fix**: 
- Similar to email dead-letter queue
- Add push dead-letter queue processing

**Expected Impact**: Better handling of permanently failed pushes

---

## 9. Analytics Performance Issues

### 9.1 Aggregation Jobs Can Overlap

**Issue**: Multiple scheduler instances can run same aggregation job

**Location**: `src/services/scheduler.service.ts:441-473`

**Severity**: HIGH

**Current Behavior**:
```typescript
async scheduleAnalyticsAggregations(): Promise<void> {
  await this.scheduleCron('analytics_hourly_aggregation', {}, {
    cronExpression: '0 * * * *',
    maxRetries: 3,
  });
}
```

**Impact**: Multiple instances can cause duplicate aggregation.

**Recommended Fix**: 
- Add distributed lock for aggregation jobs
- Check if aggregation already in progress
- Use job completion timestamp to prevent overlap

**Expected Impact**: Prevent duplicate aggregation calculations

---

### 9.2 Good Analytics Caching

**Positive**: Analytics service uses caching effectively

**Location**: `src/services/analytics.service.ts`

**Severity**: N/A

**Current Behavior**:
```typescript
const cached = await analyticsCacheService.getPlatformDashboard(dateStr);
if (cached) {
  return cached;
}
// ... compute and cache
```

**Impact**: Good cache hit ratio reduces Firestore load.

**Status**: No changes needed - this is well implemented

---

## 10. Admin Dashboard Issues

### 10.1 Sequential Health Checks

**Issue**: Health checks run sequentially instead of in parallel

**Location**: `src/services/adminDashboard.service.ts:110-130`

**Severity**: LOW

**Current Behavior**:
```typescript
const [
  firestore,
  redis,
  livekit,
  queue,
  scheduler,
  email,
  push,
  workers,
  system,
] = await Promise.all([
  // Already using Promise.all - this is good
]);
```

**Impact**: Already optimized with `Promise.all`.

**Status**: No changes needed - already well implemented

---

### 10.2 Good Dashboard Caching

**Positive**: Admin dashboard uses caching effectively

**Location**: `src/services/adminDashboard.service.ts`

**Severity**: N/A

**Status**: No changes needed - this is well implemented

---

## 11. Socket.IO Issues

### 11.1 Socket.IO Implementation Review Needed

**Issue**: Socket.IO implementation not yet reviewed

**Location**: `src/sockets/index.ts`

**Severity**: TBD

**Recommended Action**: 
- Review for memory leaks (event listeners)
- Review for connection cleanup
- Review for room management
- Review for rate limiting

---

## 12. LiveKit Integration Issues

### 12.1 LiveKit Idempotency Review Needed

**Issue**: LiveKit stream lifecycle idempotency not verified

**Location**: `src/services/stream.service.ts`

**Severity**: HIGH

**Recommended Action**: 
- Verify stream start is idempotent
- Verify stream stop is idempotent
- Add duplicate operation protection

---

## 13. Missing Request Timeouts

**Issue**: No global request timeout configuration

**Location**: `src/app.ts`

**Severity**: MEDIUM

**Impact**: Long-running requests can exhaust connections.

**Recommended Fix**: 
- Add `REQUEST_TIMEOUT_MS` configuration
- Implement request timeout middleware
- Add separate timeouts for external operations

**Expected Impact**: Prevent connection exhaustion from slow requests

---

## 14. Missing Circuit Breaker

**Issue**: No circuit breaker for external services

**Location**: External provider calls

**Severity**: MEDIUM

**Impact**: Cascading failures when external services are down.

**Recommended Fix**: 
- Implement circuit breaker for non-financial services
- Add for email provider, push provider, LiveKit API
- Do NOT use for payment charges (use idempotency instead)

**Expected Impact**: Prevent cascading failures

---

## 15. Missing Graceful Shutdown

**Issue**: No graceful shutdown handling

**Location**: `src/app.ts`

**Severity**: HIGH

**Impact**: In-flight requests/jobs can be lost on restart.

**Recommended Fix**: 
- Implement SIGTERM/SIGINT handlers
- Stop accepting new requests
- Finish in-flight operations
- Close connections cleanly

**Expected Impact**: Clean deployments without data loss

---

## 16. Missing Health/Readiness Endpoints

**Issue**: Basic health endpoint exists but no readiness check

**Location**: `src/routes/health.routes.ts` (if exists)

**Severity**: MEDIUM

**Impact**: Cannot distinguish between alive and ready for traffic.

**Recommended Fix**: 
- Add `/health/ready` endpoint
- Check critical dependencies (Firestore, Redis)
- Add `/health/live` lightweight endpoint

**Expected Impact**: Better orchestration for deployments

---

## 17. Memory Safety Concerns

**Issue**: Potential memory leaks not reviewed

**Severity**: TBD

**Areas to Review**:
- Socket.IO event listeners
- Timer/interval cleanup
- Scheduler job cleanup
- Redis subscriptions
- Cached objects
- PDF/QR generation
- Export generation

**Recommended Action**: 
- Review all timer/interval usage
- Review Socket.IO cleanup
- Review scheduler cleanup

---

## 18. Docker Performance

**Issue**: Docker configuration reviewed in Phase 10A

**Severity**: N/A

**Status**: Already optimized in Phase 10A - no changes needed

---

## Summary of Critical Issues

| Priority | Issue | Module | Impact |
|----------|-------|--------|--------|
| CRITICAL | No payment idempotency | Payment | Duplicate charges |
| CRITICAL | No ticket concurrency protection | Ticket | Overselling |
| HIGH | Redis O(N) keys() in scheduler | Scheduler | Performance |
| HIGH | No duplicate job execution protection | Scheduler | Duplicate execution |
| HIGH | No job execution timeout | Scheduler | Worker blocking |
| HIGH | No transaction safety | Payment | Inconsistent state |
| HIGH | No Redis reconnect strategy | Redis | Connectivity |
| HIGH | No graceful fallback for Redis | Redis | API failures |
| HIGH | Analytics aggregation overlap | Analytics | Duplicate calculations |
| HIGH | No graceful shutdown | App | Data loss on restart |

---

## Recommended Implementation Order

1. **Payment Idempotency** - CRITICAL for financial safety
2. **Ticket Concurrency Protection** - CRITICAL for inventory accuracy
3. **Redis Reliability** - HIGH for overall stability
4. **Scheduler Duplicate Protection** - HIGH for job reliability
5. **Graceful Shutdown** - HIGH for deployment safety
6. **Firestore Query Optimization** - MEDIUM for performance
7. **Queue Retry Improvements** - MEDIUM for reliability
8. **Health/Readiness Endpoints** - MEDIUM for operations
9. **Circuit Breaker** - MEDIUM for resilience
10. **Memory Safety Review** - MEDIUM for long-term stability

---

**Next Steps**: Begin implementing fixes starting with CRITICAL priority items.
