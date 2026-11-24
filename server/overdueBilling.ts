/**
 * Overdue-payment handling: the parts that talk to the database and to PayPal.
 *
 * WHY THIS EXISTS: before this, nothing happened when a charge failed. The
 * billing date passed, PayPal declined the card, and the account kept running
 * at full service indefinitely — the owner only found out by noticing money
 * that never arrived.
 *
 * The rule now: once a charge is overdue the account is flagged and warned,
 * keeps working through a short grace period, and is paused after it until a
 * payment comes through. The rules themselves live in ./overdueState.
 */

import { eq, and, isNotNull, ne } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { fetchPayPalSubscription } from "./billingRouter";
import { sendPaymentOverdueEmail, sendServicePausedEmail } from "./email";
import { overdueState, GRACE_DAYS, BILLING_BUFFER_HOURS } from "./overdueState";

export { overdueState, GRACE_DAYS, BILLING_BUFFER_HOURS } from "./overdueState";
export type { OverdueUser, OverdueState } from "./overdueState";

// ─── PayPal lookup ────────────────────────────────────────────────────────────

export type PayPalBillingSnapshot = {
  status: string;
  nextBillingTime: Date | null;
  failedPaymentsCount: number;
  outstandingBalance: number;
};

/**
 * Current billing facts for one subscription, normalised from the shared
 * `fetchPayPalSubscription` reader. Returns null on any failure so the caller
 * can skip the account instead of acting on a guess.
 */
export async function getBillingSnapshot(
  subscriptionId: string
): Promise<PayPalBillingSnapshot | null> {
  try {
    const d = await fetchPayPalSubscription(subscriptionId);
    const next = d.nextBillingTime ? new Date(d.nextBillingTime) : null;
    return {
      status: d.status ?? "UNKNOWN",
      nextBillingTime: next && Number.isFinite(next.getTime()) ? next : null,
      failedPaymentsCount: d.failedPaymentsCount ?? 0,
      outstandingBalance: Number(d.outstandingBalance ?? "0") || 0,
    };
  } catch {
    return null;
  }
}

// ─── Hourly job ───────────────────────────────────────────────────────────────

export type OverdueCheckResult = {
  checked: number;
  flagged: number;
  cleared: number;
  warned: number;
  suspended: number;
};

type UserRow = Awaited<ReturnType<typeof loadCandidates>>[number];

async function loadCandidates() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(and(isNotNull(users.subscriptionId), ne(users.plan, "free")));
}

/**
 * Reconciles ONE account against PayPal and applies the consequences: clear the
 * flag if they paid, start the grace period if they didn't, and send the one
 * email that stage calls for.
 *
 * Returns the outcome so both callers can report it. PayPal is the only source
 * of truth here — if it can't be reached, the account is left exactly as it was,
 * because wrongly pausing a paying customer is far worse than checking again
 * in an hour.
 */
async function reconcileAccount(
  user: UserRow,
  now: Date
): Promise<"skipped" | "ok" | "cleared" | "flagged" | "warned" | "suspended"> {
  const db = await getDb();
  if (!db) return "skipped";
  if (user.role === "admin" || !user.subscriptionId) return "skipped";

  const snapshot = await getBillingSnapshot(user.subscriptionId);
  if (!snapshot) return "skipped";

  const paidUp =
    snapshot.outstandingBalance <= 0 &&
    snapshot.failedPaymentsCount === 0 &&
    snapshot.nextBillingTime !== null &&
    snapshot.nextBillingTime.getTime() > now.getTime();

  // ── Paid: clear the flag and record the real next billing date ────────────
  if (paidUp) {
    if (user.pastDueSince || user.pastDueStage !== 0) {
      await db
        .update(users)
        .set({
          pastDueSince: null,
          pastDueStage: 0,
          subscriptionStatus: "active",
          nextBillingDate: snapshot.nextBillingTime,
        })
        .where(eq(users.id, user.id));
      return "cleared";
    }
    if (
      snapshot.nextBillingTime &&
      (!user.nextBillingDate ||
        new Date(user.nextBillingDate).getTime() !== snapshot.nextBillingTime.getTime())
    ) {
      // Keep the stored billing date honest even when nothing is wrong — this
      // column was NULL for every customer before payment events were handled.
      await db
        .update(users)
        .set({ nextBillingDate: snapshot.nextBillingTime })
        .where(eq(users.id, user.id));
    }
    return "ok";
  }

  // ── Overdue: has the due date actually passed? ─────────────────────────────
  const dueDate =
    snapshot.nextBillingTime ?? (user.nextBillingDate ? new Date(user.nextBillingDate) : null);
  const overdueByBuffer =
    dueDate !== null && now.getTime() - dueDate.getTime() > BILLING_BUFFER_HOURS * 60 * 60 * 1000;
  const hasMoneyOwed = snapshot.outstandingBalance > 0 || snapshot.failedPaymentsCount > 0;

  if (!overdueByBuffer && !hasMoneyOwed) return "ok";

  let pastDueSince = user.pastDueSince ? new Date(user.pastDueSince) : null;
  let flagged = false;
  if (!pastDueSince) {
    // Date the flag from when the charge was actually due, not from when this
    // job happened to notice: the grace period belongs to the customer.
    pastDueSince = dueDate ?? now;
    if (pastDueSince.getTime() > now.getTime()) pastDueSince = now;
    await db.update(users).set({ pastDueSince, pastDueStage: 0 }).where(eq(users.id, user.id));
    flagged = true;
  }

  // ── Notify, once per stage ────────────────────────────────────────────────
  const state = overdueState({ ...user, pastDueSince }, now);
  if (!state.isPastDue) return flagged ? "flagged" : "ok";

  if (state.isSuspended && user.pastDueStage < 2) {
    await db
      .update(users)
      .set({ pastDueStage: 2, subscriptionStatus: "suspended" })
      .where(eq(users.id, user.id));
    if (user.email) {
      await sendServicePausedEmail(user.email, user.name ?? "", state.daysPastDue).catch((e) =>
        console.warn("[Overdue] paused email failed:", e)
      );
    }
    return "suspended";
  }

  if (!state.isSuspended && user.pastDueStage < 1) {
    await db.update(users).set({ pastDueStage: 1 }).where(eq(users.id, user.id));
    if (user.email) {
      await sendPaymentOverdueEmail(user.email, user.name ?? "", state.daysLeft).catch((e) =>
        console.warn("[Overdue] warning email failed:", e)
      );
    }
    return "warned";
  }

  return flagged ? "flagged" : "ok";
}

/**
 * Runs hourly over every paid account: clears the ones that have since paid,
 * flags the ones whose billing date passed, and sends the warning and pause
 * emails as each stage is reached.
 */
export async function runOverdueBillingCheck(): Promise<OverdueCheckResult> {
  const result: OverdueCheckResult = { checked: 0, flagged: 0, cleared: 0, warned: 0, suspended: 0 };
  const candidates = await loadCandidates();
  const now = new Date();

  for (const user of candidates) {
    if (user.role === "admin" || !user.subscriptionId) continue;
    result.checked++;
    const outcome = await reconcileAccount(user, now).catch((err) => {
      console.warn(`[Overdue] user ${user.id} failed:`, err);
      return "skipped" as const;
    });
    if (outcome === "cleared") result.cleared++;
    else if (outcome === "flagged") result.flagged++;
    else if (outcome === "warned") result.warned++;
    else if (outcome === "suspended") result.suspended++;
  }

  return result;
}

/**
 * Re-checks a single account on demand. This is what the "Already paid?
 * Re-check" button on the billing page calls — without it, a customer who had
 * just paid would sit looking at a suspension notice until the hourly job
 * happened to come round.
 */
export async function recheckUserBilling(userId: number): Promise<{ changed: boolean }> {
  const db = await getDb();
  if (!db) return { changed: false };
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user) return { changed: false };
  const outcome = await reconcileAccount(user, new Date());
  return { changed: outcome === "cleared" || outcome === "flagged" || outcome === "suspended" || outcome === "warned" };
}
