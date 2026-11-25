/**
 * Admin access from configuration.
 *
 * WHY THIS EXISTS: the only ways to become an admin were a leftover hook from
 * the old login provider and editing the database by hand. When the owner had
 * no working admin account, nothing in the product could create one — and the
 * assistant on Lynx's own site depends on an admin's chatbot.
 *
 * Set ADMIN_EMAILS (comma-separated) and every listed account that exists is:
 *   - made an admin,
 *   - put on the White-Label plan with no subscription, so every dashboard
 *     section is open and nothing is billed,
 *   - cleared of any overdue flag,
 *   - given an active chatbot of its own with an API key — which is the one
 *     the public site falls back to (see getSiteChatbotApiKey).
 *
 * The account's password is never touched: the owner registers it themselves.
 *
 * SAFETY: an address is only promoted if the account already exists when the
 * server boots, or at the moment its owner proves the mailbox by clicking the
 * verification link. Registering an address that happens to be on the list
 * does not grant anything by itself — otherwise anyone who learned the address
 * before the owner signed up could claim the admin seat.
 */

import { eq, sql } from "drizzle-orm";
import { chatbots, users } from "../drizzle/schema";
import { ensureChatbotApiKey, getChatbotByUserId, getDb, upsertChatbot } from "./db";

export function adminEmails(raw: string | undefined = process.env.ADMIN_EMAILS): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) seen.add(email);
  }
  return Array.from(seen);
}

export type AdminBootstrapResult = { granted: string[]; missing: string[] };

/**
 * Grants admin access to the configured addresses. Pass `onlyEmail` to act on
 * a single account (used right after it verifies its email); it is ignored
 * unless that address is on the list.
 */
export async function ensureAdminAccess(opts: { onlyEmail?: string | null } = {}): Promise<AdminBootstrapResult> {
  const result: AdminBootstrapResult = { granted: [], missing: [] };
  let emails = adminEmails();
  if (opts.onlyEmail !== undefined) {
    const one = (opts.onlyEmail ?? "").trim().toLowerCase();
    emails = emails.filter((e) => e === one);
  }
  if (emails.length === 0) return result;
  const db = await getDb();
  if (!db) return result;

  for (const email of emails) {
    try {
      const rows = await db
        .select({ id: users.id, role: users.role, plan: users.plan })
        .from(users)
        .where(sql`LOWER(${users.email}) = ${email}`)
        .limit(1);
      const user = rows[0];
      if (!user) {
        result.missing.push(email);
        continue;
      }

      await db
        .update(users)
        .set({ role: "admin", plan: "whitelabel", pastDueSince: null, pastDueStage: 0 })
        .where(eq(users.id, user.id));

      // The admin's own chatbot powers the widget on the public site.
      let bot = await getChatbotByUserId(user.id);
      if (!bot) {
        bot = await upsertChatbot({
          userId: user.id,
          name: "Lynx AI",
          siteUrl: process.env.CANONICAL_ORIGIN ?? "https://www.lynxaiassistant.com",
          isActive: true,
        });
      } else if (bot.isActive === false) {
        await db.update(chatbots).set({ isActive: true }).where(eq(chatbots.id, bot.id));
      }
      if (bot && !bot.apiKey) await ensureChatbotApiKey(bot.id);

      result.granted.push(email);
    } catch (err) {
      console.error(`[AdminBootstrap] Could not grant access to ${email}:`, err);
    }
  }

  if (result.granted.length) console.log(`[AdminBootstrap] Admin access ensured for: ${result.granted.join(", ")}`);
  if (result.missing.length && opts.onlyEmail === undefined) {
    console.warn(
      `[AdminBootstrap] No account yet for: ${result.missing.join(", ")}. ` +
        "Register it, then confirm the email from the verification link (or redeploy)."
    );
  }
  return result;
}
