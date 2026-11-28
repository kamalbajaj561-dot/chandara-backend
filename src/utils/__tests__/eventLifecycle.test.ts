import { canTransition, normalizeEventStatus, isPublicEventStatus, isCreatorEditable, storedValuesFor } from '../eventLifecycle';

describe('event lifecycle', () => {
  it('normalises legacy and unknown values without dropping events', () => {
    expect(normalizeEventStatus('approved')).toBe('scheduled');
    expect(normalizeEventStatus('pending')).toBe('pending');
    expect(normalizeEventStatus(undefined)).toBe('draft');
    expect(normalizeEventStatus('weird')).toBe('draft');
  });

  it('allows only the documented transitions', () => {
    expect(canTransition('draft', 'pending')).toBe(true);
    expect(canTransition('pending', 'scheduled')).toBe(true);
    expect(canTransition('pending', 'rejected')).toBe(true);
    expect(canTransition('rejected', 'pending')).toBe(true);
    expect(canTransition('approved', 'live')).toBe(true);
    expect(canTransition('scheduled', 'live')).toBe(true);
    expect(canTransition('live', 'ended')).toBe(true);
    // forbidden shortcuts
    expect(canTransition('draft', 'scheduled')).toBe(false);
    expect(canTransition('draft', 'live')).toBe(false);
    expect(canTransition('pending', 'live')).toBe(false);
    expect(canTransition('live', 'cancelled')).toBe(false);
    expect(canTransition('ended', 'live')).toBe(false);
    expect(canTransition('cancelled', 'pending')).toBe(false);
  });

  it('publishes only approved/live/ended events', () => {
    for (const s of ['scheduled', 'approved', 'live', 'ended']) expect(isPublicEventStatus(s)).toBe(true);
    for (const s of ['draft', 'pending', 'rejected', 'cancelled']) expect(isPublicEventStatus(s)).toBe(false);
  });

  it('locks live/ended/cancelled events against creator edits', () => {
    expect(isCreatorEditable('draft')).toBe(true);
    expect(isCreatorEditable('rejected')).toBe(true);
    expect(isCreatorEditable('live')).toBe(false);
    expect(isCreatorEditable('ended')).toBe(false);
    expect(isCreatorEditable('cancelled')).toBe(false);
  });

  it('queries both stored spellings of scheduled', () => {
    expect(storedValuesFor('scheduled')).toEqual(['scheduled', 'approved']);
    expect(storedValuesFor('live')).toEqual(['live']);
  });
});
