import { requireCreatorOrAdmin, requireEventOwnerOrAdmin } from '../analyticsAccess';

const run = async (mw: any, user: any, params: any) => {
  const next = jest.fn();
  await mw({ user, params } as any, {} as any, next);
  return next.mock.calls[0]?.[0];
};

describe('requireCreatorOrAdmin', () => {
  const mw = requireCreatorOrAdmin('id');
  it('allows the creator to read their own analytics', async () => {
    expect(await run(mw, { id: 'c1', role: 'creator' }, { id: 'c1' })).toBeUndefined();
  });
  it('allows administrators', async () => {
    expect(await run(mw, { id: 'a1', role: 'administrator' }, { id: 'c1' })).toBeUndefined();
  });
  it('forbids another creator or a viewer (IDOR)', async () => {
    expect(await run(mw, { id: 'c2', role: 'creator' }, { id: 'c1' })).toMatchObject({ statusCode: 403 });
    expect(await run(mw, { id: 'v1', role: 'viewer' }, { id: 'c1' })).toMatchObject({ statusCode: 403 });
  });
  it('requires authentication', async () => {
    expect(await run(mw, undefined, { id: 'c1' })).toMatchObject({ statusCode: 401 });
  });
});

describe('requireEventOwnerOrAdmin', () => {
  const getEvent = jest.fn(async (id: string) => {
    if (id === 'e1') return { id: 'e1', creatorUid: 'c1' };
    if (id === 'legacy') return { id: 'legacy', ownerId: 'c1' };
    throw new Error('not found');
  });
  const mw = requireEventOwnerOrAdmin('id', getEvent);
  it('allows the event owner (including legacy ownerId events) and administrators', async () => {
    expect(await run(mw, { id: 'c1', role: 'creator' }, { id: 'e1' })).toBeUndefined();
    expect(await run(mw, { id: 'c1', role: 'creator' }, { id: 'legacy' })).toBeUndefined();
    expect(await run(mw, { id: 'a1', role: 'administrator' }, { id: 'e1' })).toBeUndefined();
  });
  it("forbids other users and does not reveal whether the event exists", async () => {
    expect(await run(mw, { id: 'c2', role: 'creator' }, { id: 'e1' })).toMatchObject({ statusCode: 403 });
    expect(await run(mw, { id: 'c2', role: 'creator' }, { id: 'missing' })).toMatchObject({ statusCode: 403 });
  });
  it('requires authentication', async () => {
    expect(await run(mw, undefined, { id: 'e1' })).toMatchObject({ statusCode: 401 });
  });
});
