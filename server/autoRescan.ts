/**
 * Automatic re-scan of customer sites.
 *
 * The product has always told customers "Lynx re-scans your site automatically
 * — weekly on Cloud, every 24 hours on Embedded and White-Label". Nothing did.
 * A site was read once, when its owner pressed Scan, and the assistant kept
 * answering from that snapshot forever: new products never appeared, old prices
 * were quoted as current, a changed return policy went unnoticed.
 *
 * This job keeps that promise. It reuses the crawler that needs no AI call, so
 * it costs bandwidth but no tokens.
 */

import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { chatbots, users } from "../drizzle/schema";
import { buildSiteKnowledge } from "./routers";
import { overdueState } from "./overdueState";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Sites re-read per hourly run. Bounds outbound load and run time. */
const MAX_PER_RUN = 4;

/** How often a plan's sites are re-read; null = never (manual scans only). */
export function rescanIntervalDays(plan: string | null | undefined): number | null {
  switch (plan) {
    case "whitelabel":
    case "embedded":
      return 1;
    case "cloud":
      return 7;
    default:
      return null; // free trial: one manual scan
  }
}

export function productCountInContext(context: string | null | undefined): number {
  const m = String(context ?? "").match(/=== PRODUCT CATALOG \((\d+) products/);
  return m ? Number(m[1]) : 0;
}

/**
 * Should a fresh crawl replace what the assistant already knows?
 *
 * A site can be down, rate-limiting us, or mid-deploy at the moment we read it.
 * Blindly saving that would wipe good knowledge and leave the assistant unable
 * to answer anything until the next run — so a result that looks like a failed
 * read is thrown away and the previous knowledge kept.
 */
export function shouldReplaceKnowledge(
  previous: { context: string | null | undefined },
  next: { context: string; products: number; pagesRead: number }
): boolean {
  const prevContext = String(previous.context ?? "");
  if (!prevContext.trim()) return next.context.trim().length > 0;
  if (next.pagesRead <= 1 && prevContext.length > 2000) return false; // only the home answered
  const prevProducts = productCountInContext(prevContext);
  if (prevProducts > 0 && next.products === 0) return false;          // catalog vanished
  if (prevProducts >= 6 && next.products < prevProducts * 0.5) return false; // lost most of it
  if (next.context.length < prevContext.length * 0.4) return false;   // far thinner read
  return true;
}

export type AutoRescanResult = { due: number; updated: number; kept: number; failed: number };

export async function runAutoRescan(now: Date = new Date()): Promise<AutoRescanResult> {
  const result: AutoRescanResult = { due: 0, updated: 0, kept: 0, failed: 0 };
  const db = await getDb();
  if (!db) return result;

  const rows = await db
    .select({
      id: chatbots.id,
      siteUrl: chatbots.siteUrl,
      siteContext: chatbots.siteContext,
      lastScannedAt: chatbots.lastScannedAt,
      lastAutoScanAt: chatbots.lastAutoScanAt,
      lastScanResult: chatbots.lastScanResult,
      plan: users.plan,
      role: users.role,
      isBanned: users.isBanned,
      subscriptionId: users.subscriptionId,
      pastDueSince: users.pastDueSince,
    })
    .from(chatbots)
    .innerJoin(users, eq(users.id, chatbots.userId))
    // Only sites whose owner scanned them at least once: the first scan is a
    // deliberate act (and the moment the URL is confirmed to be theirs).
    .where(and(isNotNull(chatbots.siteUrl), isNotNull(chatbots.lastScannedAt), eq(chatbots.isActive, true)))
    .orderBy(asc(chatbots.lastScannedAt));

  const due = rows.filter((r) => {
    const days = rescanIntervalDays(r.plan);
    if (days === null || r.isBanned || !r.siteUrl) return false;
    if (overdueState(r, now).isSuspended) return false; // paused accounts get no service
    const lastTouch = Math.max(
      r.lastScannedAt ? new Date(r.lastScannedAt).getTime() : 0,
      r.lastAutoScanAt ? new Date(r.lastAutoScanAt).getTime() : 0
    );
    return now.getTime() - lastTouch >= days * DAY_MS;
  });
  result.due = due.length;

  for (const bot of due.slice(0, MAX_PER_RUN)) {
    // Stamp the attempt first, so a site that keeps failing waits a full
    // interval before its next try instead of being retried every hour and
    // starving everyone behind it in the queue.
    await db.update(chatbots).set({ lastAutoScanAt: now }).where(eq(chatbots.id, bot.id));
    try {
      const fresh = await buildSiteKnowledge(bot.siteUrl as string, bot.plan === "cloud" ? 25 : 80);
      const next = { context: fresh.context, products: fresh.products, pagesRead: fresh.pagesRead.length };
      if (!shouldReplaceKnowledge({ context: bot.siteContext }, next)) {
        result.kept++;
        console.log(`[AutoRescan] chatbot ${bot.id}: fresh read looked incomplete — kept previous knowledge`);
        continue;
      }
      // Keep the stored summary honest too, so the Scanner page shows today's
      // numbers and says the refresh was automatic.
      let summary: unknown = bot.lastScanResult;
      if (typeof summary === "string") { try { summary = JSON.parse(summary); } catch { summary = null; } }
      const updatedSummary = summary && typeof summary === "object"
        ? {
            ...(summary as Record<string, unknown>),
            scannedAt: now.toISOString(),
            autoRescanned: true,
            productsFound: fresh.products,
            productsEstimate: fresh.products,
            pagesCrawled: fresh.pagesRead.length,
          }
        : undefined;
      await db.update(chatbots).set({
        siteContext: fresh.context,
        lastScannedAt: now,
        updatedAt: now,
        ...(updatedSummary ? { lastScanResult: updatedSummary as never } : {}),
      }).where(eq(chatbots.id, bot.id));
      result.updated++;
    } catch (err) {
      result.failed++;
      console.warn(`[AutoRescan] chatbot ${bot.id} (${bot.siteUrl}) failed:`, (err as Error)?.message ?? err);
    }
  }
  return result;
}
