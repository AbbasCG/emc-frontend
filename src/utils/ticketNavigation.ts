/**
 * TICKET BACK-NAVIGATION — safe origin resolution.
 *
 * The list pages (Admin table today; any future ticket list) pass their own
 * exact path + query string via `navigate(..., { state: { from } })` when
 * opening a ticket, so Detail's "back" can restore filters/search/page
 * exactly rather than resetting the list. This module resolves that origin
 * safely when it exists, and picks a safe fallback when it doesn't.
 */

/** Same-feature paths only — never trust an arbitrary state value blindly. */
export function isSafeTicketOrigin(path: unknown): path is string {
  return typeof path === 'string' && path.startsWith('/dashboard/tickets');
}

export type TicketOriginCheck = {
  /** locationState is whatever `location.state` currently holds — untyped by React Router. */
  locationState: unknown;
  /** Does the CURRENT session have page access to the admin work queue? null = unknown/still loading. */
  canAccessAdmin: boolean | null;
  /** Does the CURRENT session have page access to the assignee workspace? null = unknown/still loading. */
  canAccessWorkspace: boolean | null;
};

/**
 * Resolve where "رجوع" should go.
 *
 * Order: a validated `state.from` first (exact list context, filters
 * preserved) — then, absent that, the admin work queue if this session can
 * actually open it, then the assignee workspace, then the ticket submission
 * page. The submission page is the correct final fallback for an ordinary
 * user: this product has no separate "my tickets" list, so it is genuinely
 * that user's own entry point into the feature — but the caller must label
 * the control "back to tickets", never "submit a new ticket", since those
 * remain two distinct actions.
 *
 * Page access (canAccessAdmin/canAccessWorkspace) — never a role-name guess —
 * decides which fallback is reachable, keeping this fully separate from
 * ticket BUSINESS authorization (capabilities).
 */
export function resolveTicketBackDestination({
  locationState,
  canAccessAdmin,
  canAccessWorkspace,
}: TicketOriginCheck): string {
  const from = (locationState as { from?: unknown } | null | undefined)?.from;
  if (isSafeTicketOrigin(from)) {
    return from;
  }

  if (canAccessAdmin) return '/dashboard/tickets/admin';
  if (canAccessWorkspace) return '/dashboard/tickets/workspace';
  return '/dashboard/tickets/new';
}
