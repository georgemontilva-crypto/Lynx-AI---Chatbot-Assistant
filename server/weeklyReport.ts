/**
 * Weekly report email.
 *
 * The "Weekly report — summary of metrics every Monday" switch existed in the
 * dashboard for a long time with nothing behind it. This is the thing behind
 * it: every Monday, each account that opted in gets one email with the last
 * seven days of real numbers.
 *
 * It runs from the hourly scheduler, so it has to be idempotent: the time the
 * last report went out is stored with the account's alert preferences and the
 * job refuses to send twice in the same week.
 */

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, chatbots, conversations, analyticsEvents } from "../drizzle/schema";
import { sendWeeklyReportEmail } from "./email";
import { readStoredPrefs } from "./accountNotifications";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Reports go out on Mondays from this hour (UTC) — morning in the Americas. */
const SEND_FROM_HOUR_UTC = 13;

/** 00:00 UTC of the Monday that starts the week `now` falls in. */
export function startOfIsoWeek(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - daysSinceMonday * DAY_MS);
}

/**
 * Pure: is a report due for an account right now?
 * Due on Monday from the send hour, once per week. A missed Monday (server
 * down) is NOT caught up later in the week — a "Monday report" arriving on a
 * Thursday is noise.
 */
export function isWeeklyReportDue(now: Date, lastSentIso: string | null | undefined): boolean {
  if (now.getUTCDay() !== 1) return false;
  if (now.getUTCHours() < SEND_FROM_HOUR_UTC) return false;
  if (!lastSentIso) return true;
  const last = new Date(lastSentIso).getTime();
  if (!Number.isFinite(last)) return true;
  return last < startOfIsoWeek(now).getTime();
}

export type WeeklyStats = {
  conversations: number;
  leads: number;
  avgRating: number | null;
  ratingsCount: number;
  pageViews: number;
  chatOpens: number;
  messagesThisMonth: number;
};

export async function collectWeeklyStats(userId: number, now: Date): Promise<WeeklyStats | null> {
  const db = await getDb();
  if (!db) return null;
  const bots = await db
    .select({ id: chatbots.id, messagesThisMonth: chatbots.messagesThisMonth })
    .from(chatbots)
    .where(eq(chatbots.userId, userId));
  if (bots.length === 0) return null;
  const ids = bots.map((b) => b.id);
  const since = new Date(now.getTime() - 7 * DAY_MS);

  const conv = (await db
    .select({
      total: sql<number>`COUNT(*)`,
      leads: sql<number>`COALESCE(SUM(CASE WHEN ${conversations.isLead} = 1 THEN 1 ELSE 0 END), 0)`,
      ratingSum: sql<number>`COALESCE(SUM(${conversations.satisfactionRating}), 0)`,
      ratingCount: sql<number>`COUNT(${conversations.satisfactionRating})`,
    })
    .from(conversations)
    .where(and(inArray(conversations.chatbotId, ids), gte(conversations.createdAt, since))))[0];

  const events = await db
    .select({ eventType: analyticsEvents.eventType, n: sql<number>`COUNT(*)` })
    .from(analyticsEvents)
    .where(and(inArray(analyticsEvents.chatbotId, ids), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.eventType);
  const count = (t: string) => Number(events.find((e) => e.eventType === t)?.n ?? 0);

  const ratingsCount = Number(conv?.ratingCount ?? 0);
  return {
    conversations: Number(conv?.total ?? 0),
    leads: Number(conv?.leads ?? 0),
    ratingsCount,
    avgRating: ratingsCount > 0 ? Math.round((Number(conv?.ratingSum ?? 0) / ratingsCount) * 10) / 10 : null,
    pageViews: count("page_view"),
    chatOpens: count("chat_open"),
    messagesThisMonth: bots.reduce((sum, b) => sum + (b.messagesThisMonth ?? 0), 0),
  };
}

export async function runWeeklyReports(now: Date = new Date()): Promise<{ sent: number }> {
  // Cheap exit for the 167 hours a week this has nothing to do.
  if (!isWeeklyReportDue(now, null)) return { sent: 0 };
  const db = await getDb();
  if (!db) return { sent: 0 };

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, pushPrefs: users.pushPrefs, isBanned: users.isBanned })
    .from(users);

  let sent = 0;
  for (const u of rows) {
    const prefs = readStoredPrefs(u.pushPrefs);
    if (prefs.weeklyReport !== true || !u.email || u.isBanned) continue;
    if (!isWeeklyReportDue(now, prefs.weeklyReportSentAt as string | undefined)) continue;

    try {
      const stats = await collectWeeklyStats(u.id, now);
      if (!stats) continue;
      // Mark as sent BEFORE sending: if the process dies mid-loop, the worst
      // case is one skipped report — never the same email every hour.
      await db
        .update(users)
        .set({ pushPrefs: { ...prefs, weeklyReportSentAt: now.toISOString() } as never })
        .where(eq(users.id, u.id));
      const ok = await sendWeeklyReportEmail(u.email, u.name ?? "", stats);
      if (ok) sent++;
    } catch (err) {
      console.warn(`[WeeklyReport] user ${u.id} failed:`, err);
    }
  }
  return { sent };
}
