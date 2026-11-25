/**
 * Overdue-payment rules — the pure part.
 *
 * Deliberately free of imports: the hourly job, the widget endpoints and the
 * dashboard all read an account's overdue state from here, so they can never
 * disagree about whether someone is suspended. Anything that touches the DB or
 * PayPal lives in overdueBilling.ts instead.
 */

/** Days of service after a missed payment before the account is paused. */
export const GRACE_DAYS = 3;

/**
 * Hours to wait after the billing date before calling a payment overdue.
 * PayPal settles and retries asynchronously, so flagging an account the second
 * the clock ticks past the due date would punish people whose payment is
 * simply still in flight.
 */
export const BILLING_BUFFER_HOURS = 24;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OverdueUser = {
  plan?: string | null;
  role?: string | null;
  subscriptionId?: string | null;
  pastDueSince?: Date | string | null;
};

export type OverdueState = {
  /** A charge is overdue and the account has been flagged. */
  isPastDue: boolean;
  /** Whole days since the account became overdue. */
  daysPastDue: number;
  /** Grace period is over — the service is paused. */
  isSuspended: boolean;
  /** Days of service left before the pause (0 once suspended). */
  daysLeft: number;
};

const NOT_OVERDUE: OverdueState = {
  isPastDue: false,
  daysPastDue: 0,
  isSuspended: false,
  daysLeft: GRACE_DAYS,
};

/**
 * Pure read of an account's overdue state. No DB, no network — the widget, the
 * dashboard and the hourly job all derive their behaviour from this one
 * function so they can never disagree about whether someone is suspended.
 *
 * Exemptions, all deliberate:
 *  - admins never get paused (that would lock the operator out of their own
 *    product while they fix a billing problem);
 *  - the free plan is governed by the 14-day trial check, not by this;
 *  - an account with no PayPal subscription has a plan an admin granted by
 *    hand, so there is no charge to be overdue on.
 */
export function overdueState(user: OverdueUser, now: Date = new Date()): OverdueState {
  if (!user?.pastDueSince) return NOT_OVERDUE;
  if (user.role === "admin") return NOT_OVERDUE;
  if (!user.plan || user.plan === "free") return NOT_OVERDUE;
  if (!user.subscriptionId) return NOT_OVERDUE;

  const since = new Date(user.pastDueSince).getTime();
  if (!Number.isFinite(since)) return NOT_OVERDUE;

  // Clamp at zero: clock skew between the app and MySQL can put the timestamp
  // slightly in the future, and an unclamped value would read as "overdue for
  // -2 days" and promise a countdown longer than the grace period itself.
  const elapsedDays = Math.max(0, (now.getTime() - since) / DAY_MS);

  return {
    isPastDue: true,
    daysPastDue: Math.floor(elapsedDays),
    isSuspended: elapsedDays >= GRACE_DAYS,
    daysLeft: Math.max(0, Math.ceil(GRACE_DAYS - elapsedDays)),
  };
}

/**
 * The plan an account can actually USE right now.
 *
 * Once the grace period is over the account keeps its paid plan on record —
 * so everything comes back by itself the moment the payment lands — but it is
 * treated as Free everywhere features are gated. Before this, a paused account
 * had its widget switched off while its whole dashboard stayed open.
 */
export function accessPlan<P extends string | null | undefined>(
  user: OverdueUser & { plan?: P },
  now: Date = new Date()
): P | "free" {
  return overdueState(user, now).isSuspended ? "free" : (user.plan as P);
}
