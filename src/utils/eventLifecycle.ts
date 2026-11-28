/**
 * Single source of truth for the event lifecycle.
 *
 *   draft ──submit──▶ pending ──approve──▶ scheduled ──start──▶ live ──end──▶ ended
 *                        │                     │
 *                        └──reject──▶ rejected │ (creator may edit + resubmit: rejected ─submit─▶ pending)
 *   draft | pending | rejected | scheduled ──cancel──▶ cancelled
 *
 * Legacy compatibility: early web-client builds wrote `approved` for admin-approved events. It is
 * treated as an alias of `scheduled` everywhere (never silently dropped) and is never written again.
 */
export const EVENT_STATUSES = ['draft', 'pending', 'scheduled', 'live', 'ended', 'rejected', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Every value that may exist in stored documents (current vocabulary + legacy aliases). */
export const STORED_EVENT_STATUSES = [...EVENT_STATUSES, 'approved'] as const;

const LEGACY_ALIASES: Record<string, EventStatus> = { approved: 'scheduled' };

export function normalizeEventStatus(status: unknown): EventStatus {
  if (typeof status !== 'string') return 'draft';
  if (LEGACY_ALIASES[status]) return LEGACY_ALIASES[status];
  return (EVENT_STATUSES as readonly string[]).includes(status) ? (status as EventStatus) : 'draft';
}

/** Stored values that mean the given (normalised) status; use with Firestore `in` queries. */
export function storedValuesFor(status: EventStatus): string[] {
  return status === 'scheduled' ? ['scheduled', 'approved'] : [status];
}

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['scheduled', 'rejected', 'cancelled'],
  rejected: ['pending', 'cancelled'],
  scheduled: ['live', 'cancelled'],
  live: ['ended'],
  ended: [],
  cancelled: [],
};

export function canTransition(from: unknown, to: EventStatus): boolean {
  return TRANSITIONS[normalizeEventStatus(from)].includes(to);
}

/** Visible to the public (discovery, details). */
export const PUBLIC_EVENT_STATUSES: EventStatus[] = ['scheduled', 'live', 'ended'];
export function isPublicEventStatus(status: unknown): boolean {
  return PUBLIC_EVENT_STATUSES.includes(normalizeEventStatus(status));
}

/** Fields of an event that may still be edited by the creator in the given status. */
export function isCreatorEditable(status: unknown): boolean {
  return ['draft', 'pending', 'rejected', 'scheduled'].includes(normalizeEventStatus(status));
}
