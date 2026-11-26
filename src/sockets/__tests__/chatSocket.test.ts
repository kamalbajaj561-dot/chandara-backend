import { authenticateSocket, joinChatRoom, leaveChatRoom, relayTyping, ChatSocketDeps, MAX_USERS_PER_ROOM } from '../chatSocket';
import { AppError } from '../../middleware/errorHandler';

const freeEvent: any = { id: 'e1', creatorUid: 'owner', status: 'live', ticketPrice: 0 };
const paidEvent: any = { ...freeEvent, id: 'e2', ticketPrice: 20 };

const makeDeps = (over: Partial<ChatSocketDeps> = {}): ChatSocketDeps => ({
  verifyToken: jest.fn(async (t: string) => {
    if (t !== 'good') throw new AppError('Invalid token', 401);
    return { userId: 'u1', role: 'viewer', displayName: 'Una' };
  }),
  getEvent: jest.fn(async (id: string) => {
    if (id === 'e1') return freeEvent;
    if (id === 'e2') return paidEvent;
    throw new AppError('Event not found', 404);
  }),
  findUserTickets: jest.fn(async () => []),
  ...over,
});

const makeSocket = (user: any = { userId: 'u1', role: 'viewer', displayName: 'Una' }, token?: any) => {
  const rooms = new Set<string>(['sock-id']);
  const emitted: any[] = [];
  return {
    handshake: { auth: { token } },
    data: user ? { user } : {},
    rooms,
    join: jest.fn((r: string) => rooms.add(r)),
    leave: jest.fn((r: string) => rooms.delete(r)),
    to: jest.fn((room: string) => ({ emit: (evt: string, payload: any) => emitted.push({ room, evt, payload }) })),
    emitted,
  } as any;
};

describe('authenticateSocket', () => {
  it('rejects connections without a token', async () => {
    const next = jest.fn();
    await authenticateSocket(makeDeps())(makeSocket(null, undefined), next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });
  it('rejects invalid tokens', async () => {
    const next = jest.fn();
    await authenticateSocket(makeDeps())(makeSocket(null, 'bad'), next);
    expect(next.mock.calls[0][0].message).toBe('Invalid token');
  });
  it('accepts a valid token and stores the verified identity', async () => {
    const socket = makeSocket(null, 'good');
    const next = jest.fn();
    await authenticateSocket(makeDeps())(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({ userId: 'u1', role: 'viewer', displayName: 'Una' });
  });
});

describe('joinChatRoom', () => {
  const size = () => 0;
  it('lets a viewer join a free event', async () => {
    const s = makeSocket();
    expect(await joinChatRoom(s, { eventId: 'e1' }, size, makeDeps())).toEqual({ ok: true });
    expect(s.join).toHaveBeenCalledWith('chat:e1');
  });
  it('refuses a paid event without a ticket and does not join', async () => {
    const s = makeSocket();
    const r = await joinChatRoom(s, { eventId: 'e2' }, size, makeDeps());
    expect(r.ok).toBe(false);
    expect(s.join).not.toHaveBeenCalled();
  });
  it('allows a paid event with an active ticket', async () => {
    const deps = makeDeps({ findUserTickets: async () => [{ eventId: 'e2', status: 'active' } as any] });
    expect((await joinChatRoom(makeSocket(), { eventId: 'e2' }, size, deps)).ok).toBe(true);
  });
  it('rejects malformed or unknown events', async () => {
    expect((await joinChatRoom(makeSocket(), { eventId: '../x' }, size, makeDeps())).ok).toBe(false);
    expect((await joinChatRoom(makeSocket(), { eventId: 'nope' }, size, makeDeps())).ok).toBe(false);
    expect((await joinChatRoom(makeSocket(), null, size, makeDeps())).ok).toBe(false);
  });
  it('refuses unauthenticated sockets', async () => {
    expect((await joinChatRoom(makeSocket(null), { eventId: 'e1' }, size, makeDeps())).ok).toBe(false);
  });
  it('enforces the room size limit', async () => {
    const r = await joinChatRoom(makeSocket(), { eventId: 'e1' }, () => MAX_USERS_PER_ROOM, makeDeps());
    expect(r).toEqual({ ok: false, error: 'Room is full' });
  });
  it('keeps a socket in a single chat room', async () => {
    const s = makeSocket();
    await joinChatRoom(s, { eventId: 'e1' }, size, makeDeps());
    s.rooms.add('chat:old');
    await joinChatRoom(s, { eventId: 'e1' }, size, makeDeps());
    expect(s.leave).toHaveBeenCalledWith('chat:old');
  });
});

describe('typing relay & leave', () => {
  it('uses the verified identity, ignoring any client-supplied name', () => {
    const s = makeSocket();
    s.rooms.add('chat:e1');
    expect(relayTyping(s, { eventId: 'e1', userId: 'spoofed', userName: 'Admin' }, true, 5000)).toBe(true);
    expect(s.emitted[0]).toEqual({ room: 'chat:e1', evt: 'user-typing', payload: { userId: 'u1', userName: 'Una' } });
  });
  it('ignores typing for rooms the socket has not joined', () => {
    expect(relayTyping(makeSocket(), { eventId: 'e1' }, true)).toBe(false);
  });
  it('throttles typing spam', () => {
    const s = makeSocket();
    s.rooms.add('chat:e1');
    expect(relayTyping(s, { eventId: 'e1' }, true, 10000)).toBe(true);
    expect(relayTyping(s, { eventId: 'e1' }, true, 10200)).toBe(false);
    expect(relayTyping(s, { eventId: 'e1' }, true, 11100)).toBe(true);
  });
  it('leaves the room', () => {
    const s = makeSocket();
    s.rooms.add('chat:e1');
    leaveChatRoom(s, { eventId: 'e1' });
    expect(s.leave).toHaveBeenCalledWith('chat:e1');
  });
});
