import { requireEventAccess } from '../eventAccess';
import { AppError } from '../errorHandler';

const free: any = { id: 'e1', creatorUid: 'owner', status: 'live', ticketPrice: 0 };
const paid: any = { ...free, ticketPrice: 25 };

const run = async (event: any, user: any, tickets: any[] = []) => {
  const mw = requireEventAccess({
    getEvent: async () => event,
    findUserTickets: async () => tickets,
  } as any);
  const next = jest.fn();
  await mw({ params: { eventId: 'e1' }, user } as any, {} as any, next);
  return next.mock.calls[0][0] as AppError | undefined;
};

describe('requireEventAccess (chat)', () => {
  it('allows anonymous readers on free live events', async () => {
    expect(await run(free, undefined)).toBeUndefined();
  });
  it('requires sign-in for paid events (401)', async () => {
    expect(await run(paid, undefined)).toMatchObject({ statusCode: 401 });
  });
  it('rejects signed-in users without a ticket on paid events (403)', async () => {
    expect(await run(paid, { userId: 'u1', role: 'viewer' })).toMatchObject({ statusCode: 403 });
    expect(await run(paid, { userId: 'u1', role: 'viewer' }, [{ eventId: 'e1', status: 'cancelled' }])).toMatchObject({ statusCode: 403 });
  });
  it('allows ticket holders, the owner and admins on paid events', async () => {
    expect(await run(paid, { userId: 'u1', role: 'viewer' }, [{ eventId: 'e1', status: 'active' }])).toBeUndefined();
    expect(await run(paid, { userId: 'owner', role: 'creator' })).toBeUndefined();
    expect(await run(paid, { userId: 'a', role: 'administrator' })).toBeUndefined();
  });
  it('hides draft/cancelled events from viewers', async () => {
    expect(await run({ ...free, status: 'draft' }, { userId: 'u1', role: 'viewer' })).toMatchObject({ statusCode: 403 });
  });
  it('forwards event lookup failures (e.g. 404) to the error handler', async () => {
    const mw = requireEventAccess({ getEvent: async () => { throw new AppError('Event not found', 404); }, findUserTickets: async () => [] } as any);
    const next = jest.fn();
    await mw({ params: { eventId: 'x' } } as any, {} as any, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 });
  });
});
