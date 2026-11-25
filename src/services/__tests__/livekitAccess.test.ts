import { authorizeLiveKitAccess, eventIdCandidates, LiveKitAccessDeps } from '../livekitAccess';
import { AppError } from '../../middleware/errorHandler';

const baseEvent: any = { id: 'ev1', creatorUid: 'creator1', status: 'live', ticketPrice: 0 };

const makeDeps = (event: any | null, tickets: any[] = []): LiveKitAccessDeps => ({
  getEvent: jest.fn(async (id: string) => {
    if (event && id === event.id) return event;
    throw new AppError('Event not found', 404);
  }),
  findUserTickets: jest.fn(async () => tickets),
});

const expectStatus = async (p: Promise<unknown>, status: number) => {
  await expect(p).rejects.toMatchObject({ statusCode: status });
};

describe('authorizeLiveKitAccess', () => {
  it('lets the event creator publish and moderate', async () => {
    const deps = makeDeps(baseEvent);
    await expect(authorizeLiveKitAccess({ userId: 'creator1', role: 'viewer' }, 'ev1', 'publisher', deps)).resolves.toBeUndefined();
    await expect(authorizeLiveKitAccess({ userId: 'creator1', role: 'viewer' }, 'ev1', 'moderator', deps)).resolves.toBeUndefined();
  });

  it('blocks a viewer from publishing or moderating', async () => {
    const deps = makeDeps(baseEvent);
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'publisher', deps), 403);
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'creator' }, 'ev1', 'moderator', deps), 403);
  });

  it('allows admins in any room', async () => {
    await expect(authorizeLiveKitAccess({ userId: 'a1', role: 'administrator' }, 'anything', 'publisher', makeDeps(null))).resolves.toBeUndefined();
  });

  it('rejects unknown events for non-admins', async () => {
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'nope', 'subscriber', makeDeps(null)), 404);
  });

  it('rejects malformed room names', async () => {
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, '../x y', 'subscriber', makeDeps(baseEvent)), 400);
  });

  it('lets anyone watch a free live event', async () => {
    await expect(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'subscriber', makeDeps(baseEvent))).resolves.toBeUndefined();
  });

  it('requires a ticket for paid events', async () => {
    const paid = { ...baseEvent, ticketPrice: 10 };
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'subscriber', makeDeps(paid)), 403);
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'subscriber', makeDeps(paid, [{ eventId: 'ev1', status: 'cancelled' }])), 403);
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'subscriber', makeDeps(paid, [{ eventId: 'other', status: 'active' }])), 403);
    await expect(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'subscriber', makeDeps(paid, [{ eventId: 'ev1', status: 'active' }]))).resolves.toBeUndefined();
  });

  it('hides draft and cancelled events from viewers', async () => {
    await expectStatus(authorizeLiveKitAccess({ userId: 'u2', role: 'viewer' }, 'ev1', 'subscriber', makeDeps({ ...baseEvent, status: 'draft' })), 403);
  });

  it('resolves the event id from stream room names', () => {
    expect(eventIdCandidates('chandara-event-ev1-str9')).toEqual(['ev1', 'chandara-event-ev1-str9']);
    expect(eventIdCandidates('ev1')).toEqual(['ev1']);
  });
});

import { normalizeRole } from '../../middleware/auth';
describe('client-written events (ownerId, pending status)', () => {
  const clientEvent: any = { id: 'ev9', ownerId: 'owner9', status: 'live', ticketPrice: 0 };
  it('recognises ownerId as the creator', async () => {
    await expect(authorizeLiveKitAccess({ userId: 'owner9', role: 'viewer' }, 'ev9', 'publisher', makeDeps(clientEvent))).resolves.toBeUndefined();
    await expectStatus(authorizeLiveKitAccess({ userId: 'other', role: 'viewer' }, 'ev9', 'publisher', makeDeps(clientEvent)), 403);
  });
  it('hides pending and rejected events from viewers', async () => {
    await expectStatus(authorizeLiveKitAccess({ userId: 'u', role: 'viewer' }, 'ev9', 'subscriber', makeDeps({ ...clientEvent, status: 'pending' })), 403);
    await expectStatus(authorizeLiveKitAccess({ userId: 'u', role: 'viewer' }, 'ev9', 'subscriber', makeDeps({ ...clientEvent, status: 'rejected' })), 403);
  });
});

describe('normalizeRole', () => {
  it('maps frontend roles to backend roles', () => {
    expect(normalizeRole('admin')).toBe('administrator');
    expect(normalizeRole('streamer')).toBe('creator');
    expect(normalizeRole('user')).toBe('viewer');
    expect(normalizeRole(undefined)).toBe('viewer');
    expect(normalizeRole('moderator')).toBe('moderator');
  });
});
