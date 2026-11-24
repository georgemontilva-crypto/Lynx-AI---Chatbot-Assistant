/**
 * Account notifications — one entry point for "tell the account owner
 * something happened".
 *
 * WHY THIS EXISTS: the dashboard has a Notifications inbox and a panel of alert
 * switches, but nothing connected them to real events. Leads and low ratings
 * coming in from the widget never reached the inbox (only a finished scan did),
 * and the switches were plain React state that reset on reload and governed
 * nothing. Each event had also grown its own ad-hoc mix of email and push.
 *
 * Now every event goes through `notifyAccount`, which:
 *   1. always records it in the inbox (the inbox is a log, not an alert);
 *   2. sends the push and the email only if the owner left that alert on.
 */

import { eq } from "drizzle-orm";
import { getDb, saveNotification } from "./db";
import { users } from "../drizzle/schema";
import { sendPushToUser } from "./pushNotifications";

/** Every alert the owner can switch on or off. */
export const ALERT_KEYS = [
  "newLead",
  "lowRating",
  "usageLimit",
  "seoIssue",
  "scanComplete",
  "weeklyReport",
] as const;
export type AlertKey = (typeof ALERT_KEYS)[number];

export type AlertPrefs = Record<AlertKey, boolean>;

/** Everything is on by default except the weekly email, which is opt-in. */
export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  newLead: true,
  lowRating: true,
  usageLimit: true,
  seoIssue: true,
  scanComplete: true,
  weeklyReport: false,
};

/**
 * The raw stored object. The JSON column arrives parsed from MySQL but as a
 * string from MariaDB and some proxies — treat both the same.
 */
export function readStoredPrefs(stored: unknown): Record<string, unknown> {
  let value = stored;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Normalises whatever is stored (possibly null or an older, shorter shape). */
export function resolveAlertPrefs(stored: unknown): AlertPrefs {
  const src = readStoredPrefs(stored);
  const out = { ...DEFAULT_ALERT_PREFS };
  for (const key of ALERT_KEYS) {
    if (typeof src[key] === "boolean") out[key] = src[key] as boolean;
  }
  return out;
}

export async function getAlertPrefs(userId: number): Promise<AlertPrefs> {
  const db = await getDb();
  if (!db) return { ...DEFAULT_ALERT_PREFS };
  const rows = await db.select({ pushPrefs: users.pushPrefs }).from(users).where(eq(users.id, userId)).limit(1);
  return resolveAlertPrefs(rows[0]?.pushPrefs);
}

type InboxType = "new_lead" | "low_rating" | "seo_issue" | "scan_complete" | "system";

export async function notifyAccount(opts: {
  userId: number;
  /** Which switch governs the push/email for this event. */
  alert: Exclude<AlertKey, "weeklyReport">;
  /** Inbox category (drives the icon). */
  type: InboxType;
  title: string;
  message: string;
  /** Where the push notification should land when tapped. */
  url?: string;
  metadata?: Record<string, unknown>;
  /** Optional email; only called when the alert is switched on. */
  email?: () => Promise<unknown>;
  /** Set false for events that should be logged but never pushed. */
  push?: boolean;
}): Promise<void> {
  // 1. Inbox — always. Failing to log must never break the caller (these are
  //    fired from public widget endpoints).
  try {
    await saveNotification({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      metadata: opts.metadata,
    });
  } catch (err) {
    console.warn("[Notify] Could not save inbox notification:", err);
  }

  // 2. Alerts — only if the owner wants them.
  let prefs: AlertPrefs;
  try {
    prefs = await getAlertPrefs(opts.userId);
  } catch {
    prefs = { ...DEFAULT_ALERT_PREFS };
  }
  if (!prefs[opts.alert]) return;

  if (opts.push !== false) {
    // No eventType here on purpose: the preference was already checked above,
    // and sendPushToUser only knows about the three original keys.
    sendPushToUser(opts.userId, {
      title: opts.title,
      body: opts.message,
      url: opts.url ?? "/dashboard/notifications",
      tag: opts.type,
    }).catch(() => {});
  }
  if (opts.email) {
    opts.email().catch((err) => console.warn("[Notify] Alert email failed:", err));
  }
}
