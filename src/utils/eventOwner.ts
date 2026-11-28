/**
 * Events are written both by the backend (creatorUid) and by the web client directly into Firestore
 * (ownerId). Treat any of these as the owning user so ownership checks work for both.
 */
export function getEventOwnerId(event: any): string | undefined {
  return event?.creatorUid || event?.ownerId || event?.creatorId || undefined;
}

/** Statuses (backend + client vocabularies) in which an event is not visible/bookable by the public. */
export const NON_PUBLIC_EVENT_STATUSES = ['draft', 'pending', 'rejected', 'cancelled'];
// NOTE: legacy `approved` is an alias of `scheduled` (see utils/eventLifecycle.ts) and is public.
/** Statuses in which tickets can no longer be bought. */
export const NON_BOOKABLE_EVENT_STATUSES = [...NON_PUBLIC_EVENT_STATUSES, 'ended'];
