import { eq, desc, and, sql, or, asc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes } from "crypto";
import {
  InsertUser, users,
  chatbots, InsertChatbot, Chatbot,
  seoReports,
  conversations,
  notifications,
  analyticsEvents,
  onboardingProgress,
  blogPosts, InsertBlogPost,
} from "../drizzle/schema";
import { ENV } from './_core/env';

function generateApiKey(): string {
  return 'lx_' + randomBytes(24).toString('hex');
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
  verificationToken: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: data.openId,
    name: data.name,
    email: data.email,
    loginMethod: 'email',
    passwordHash: data.passwordHash,
    emailVerified: false,
    verificationToken: data.verificationToken,
    lastSignedIn: new Date(),
  });
  return getUserByEmail(data.email);
}

export async function verifyUserEmail(token: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(users).where(eq(users.verificationToken, token)).limit(1);
  if (!result[0]) return false;
  await db.update(users).set({ emailVerified: true, verificationToken: null }).where(eq(users.id, result[0].id));
  return result[0];
}

export async function setResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(users.id, userId));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  if (!result[0]) return undefined;
  // Check expiry
  if (!result[0].resetTokenExpiresAt || result[0].resetTokenExpiresAt < new Date()) return undefined;
  return result[0];
}

export async function updatePassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null }).where(eq(users.id, userId));
}

export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── Chatbots ─────────────────────────────────────────────────────────────────
/**
 * The user's OWN chatbot — the one their dashboard configures and whose API key
 * is the "main" key (8,000 msg/month on White-Label).
 *
 * CRITICAL: on White-Label, the chatbots a reseller creates for their clients
 * are stored under the SAME userId with isClientChatbot=true. Selecting by
 * userId alone could return a CLIENT's chatbot, which would make the dashboard
 * show the client's API key, overwrite the client's branding on save, and bill
 * a client bot against the 8,000 limit. Always exclude client chatbots, and
 * order by id so the answer is deterministic.
 */
export async function getChatbotByUserId(userId: number): Promise<Chatbot | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(chatbots)
    .where(and(
      eq(chatbots.userId, userId),
      or(eq(chatbots.isClientChatbot, false), isNull(chatbots.isClientChatbot)),
    ))
    .orderBy(asc(chatbots.id))
    .limit(1);
  return result[0];
}

// The chatbot that powers the widget on Lynx's OWN public site. Prefers an
// explicit SITE_WIDGET_API_KEY; otherwise falls back to the admin's own
// chatbot, so the owner can just personalize it in Chatbot Config and see it
// live on the marketing site — no API key wiring needed.
export async function getSiteChatbotApiKey(): Promise<string | null> {
  const explicit = process.env.SITE_WIDGET_API_KEY;
  if (explicit && explicit.trim()) return explicit.trim();
  const db = await getDb();
  if (!db) return null;
  try {
    // First admin user, then their chatbot's apiKey.
    const admins = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    const admin = admins[0];
    if (!admin) return null;
    const bot = await getChatbotByUserId(admin.id);
    if (bot?.apiKey) return bot.apiKey;
    if (bot && !bot.apiKey) {
      await ensureChatbotApiKey(bot.id);
      const refreshed = await getChatbotByUserId(admin.id);
      return refreshed?.apiKey ?? null;
    }
    return null;
  } catch {
    return null;
  }
}


export async function upsertChatbot(data: InsertChatbot & { userId: number }): Promise<Chatbot> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getChatbotByUserId(data.userId);
  if (existing) {
    // Preserve the existing apiKey — never overwrite it
    const updateData = { ...data, updatedAt: new Date() };
    if (!updateData.apiKey) delete updateData.apiKey;
    await db.update(chatbots).set(updateData).where(eq(chatbots.id, existing.id));
    const updated = await db.select().from(chatbots).where(eq(chatbots.id, existing.id)).limit(1);
    return updated[0]!;
  } else {
    // Generate a unique API key for new chatbots
    const newData = { ...data, isClientChatbot: false };
    if (!newData.apiKey) newData.apiKey = generateApiKey();
    await db.insert(chatbots).values(newData);
    const created = await getChatbotByUserId(data.userId);
    return created!;
  }
}

export async function ensureChatbotApiKey(chatbotId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId)).limit(1);
  const chatbot = result[0];
  if (!chatbot) throw new Error("Chatbot not found");
  if (chatbot.apiKey) return chatbot.apiKey;
  // Generate and save a new API key
  const apiKey = generateApiKey();
  await db.update(chatbots).set({ apiKey }).where(eq(chatbots.id, chatbotId));
  return apiKey;
}

// ─── Admin helpers ───────────────────────────────────────────────────────────

export async function getAllUsers(opts: { limit?: number; offset?: number; search?: string } = {}) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  const { limit = 50, offset = 0, search } = opts;
  let allRows;
  if (search) {
    const pattern = `%${search}%`;
    allRows = await db.select().from(users)
      .where(or(sql`${users.name} LIKE ${pattern}`, sql`${users.email} LIKE ${pattern}`))
      .limit(limit).offset(offset);
  } else {
    allRows = await db.select().from(users).limit(limit).offset(offset);
  }
  return { users: allRows, total: allRows.length };
}

export async function updateUserPlan(userId: number, plan: "free" | "cloud" | "embedded" | "whitelabel") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ plan, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function toggleUserBan(userId: number, banned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isBanned: banned, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

// Plan prices (monthly) for MRR calculation — must match actual PayPal plan prices
const PLAN_PRICES: Record<string, number> = {
  cloud: 199,
  embedded: 349,
  whitelabel: 499,
  free: 0,
};

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeSubscriptions: 0, planBreakdown: {}, recentSignups: 0, bannedUsers: 0, mrr: 0 };
  const allUsers = await db.select().from(users);
  const totalUsers = allUsers.length;
  // Count users with active OR pending status on a paid plan (pending = paid but webhook delayed)
  const activeSubscriptions = allUsers.filter(u =>
    u.plan !== "free" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "pending")
  ).length;
  const planBreakdown = allUsers.reduce((acc, u) => {
    acc[u.plan] = (acc[u.plan] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSignups = allUsers.filter(u => u.createdAt && new Date(u.createdAt) > sevenDaysAgo).length;
  const bannedUsers = allUsers.filter(u => u.isBanned).length;
  // MRR = sum of plan prices for paying users only (exclude admins)
  const mrr = allUsers
    .filter(u => u.role !== "admin" && u.plan !== "free" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "pending"))
    .reduce((sum, u) => sum + (PLAN_PRICES[u.plan] ?? 0), 0);
  return { totalUsers, activeSubscriptions, planBreakdown, recentSignups, bannedUsers, mrr };
}

// ─── Plan limits ─────────────────────────────────────────────────────────────
// Messages per month PER CHATBOT (each chatbot has its own independent counter).
//
// White-Label model: the reseller starts with 15 client chatbots (base plan).
// Additional client slots can be purchased as expansion packs:
//   Starter Pack  → +15 clients  (+$99/mo)
//   Growth Pack   → +30 clients  (+$179/mo)
//   Agency Pack   → +60 clients  (+$299/mo)
//   Enterprise Pack → +100 clients (+$449/mo)
//
// Each client chatbot gets its OWN 6,000 msg/month limit — completely isolated.
// The reseller does NOT share a global pool across clients.
//
// Plan        | Own chatbot | Per resold client chatbot | Base clients | Max (with packs)
// ─────────────┼─────────────┼───────────────────────────┼──────────────┼──────────────────
// free         |      50     |            —              |      1       |       1  (14-day trial)
// cloud        |     500     |            —              |      1       |       1
// embedded     |   2,000     |            —              |      1       |       1
// whitelabel   |   8,000     |          6,000            |     15       |     215 (15+100+100)
export const PLAN_LIMITS: Record<string, number> = {
  free: 50,
  cloud: 500,
  embedded: 2000,
  whitelabel: 8000,        // reseller's own chatbot (their own website)
  whitelabel_client: 6000, // each client chatbot the reseller creates for their customers
};

/**
 * Check if the chatbot (via its owner's plan) has remaining messages this month.
 * If yes, increment the counter and return { allowed: true, used, limit }.
 * If no, return { allowed: false, used, limit }.
 * Also resets the counter if a new calendar month has started.
 *
 * White-Label distinction:
 *   - isClientChatbot=false → reseller's own chatbot → 8,000 msg/month
 *   - isClientChatbot=true  → a client chatbot created by the reseller → 6,000 msg/month
 */
export async function checkAndIncrementUsage(
  chatbotId: number,
  userPlan: string,
  isClientChatbot = false
): Promise<{ allowed: boolean; used: number; limit: number; shouldAlertAt80: boolean }> {
  const db = await getDb();
  if (!db) return { allowed: true, used: 0, limit: 9999, shouldAlertAt80: false };

  // For White-Label, use a different limit depending on whether this is the
  // reseller's own chatbot or a chatbot they created for one of their clients.
  const planKey =
    userPlan === "whitelabel" && isClientChatbot ? "whitelabel_client" : userPlan;
  const limit = PLAN_LIMITS[planKey] ?? 500;

  const rows = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId)).limit(1);
  const chatbot = rows[0];
  if (!chatbot) return { allowed: false, used: 0, limit, shouldAlertAt80: false };

  // Reset counter if we're in a new calendar month
  const now = new Date();
  const resetAt = chatbot.messagesResetAt ? new Date(chatbot.messagesResetAt) : new Date(0);
  const isNewMonth =
    now.getFullYear() !== resetAt.getFullYear() ||
    now.getMonth() !== resetAt.getMonth();

  let currentCount = isNewMonth ? 0 : (chatbot.messagesThisMonth ?? 0);

  if (currentCount >= limit) {
    return { allowed: false, used: currentCount, limit, shouldAlertAt80: false };
  }

  // Increment
  const newCount = currentCount + 1;
  await db
    .update(chatbots)
    .set({
      messagesThisMonth: newCount,
      ...(isNewMonth ? { messagesResetAt: now } : {}),
    })
    .where(eq(chatbots.id, chatbotId));

  // Trigger 80% alert exactly when crossing the threshold (not on every message after)
  const threshold80 = Math.floor(limit * 0.8);
  const shouldAlertAt80 = currentCount < threshold80 && newCount >= threshold80;

  return { allowed: true, used: newCount, limit, shouldAlertAt80 };
}

/**
 * Monthly usage of a single chatbot against the limit that applies to it.
 * Read-only (never increments) — for dashboards.
 */
export function usageOf(
  chatbot: { messagesThisMonth?: number | null; messagesResetAt?: Date | null; isClientChatbot?: boolean | null },
  userPlan: string
): { used: number; limit: number } {
  const planKey = userPlan === "whitelabel" && chatbot.isClientChatbot ? "whitelabel_client" : userPlan;
  const limit = PLAN_LIMITS[planKey] ?? 500;
  const now = new Date();
  const resetAt = chatbot.messagesResetAt ? new Date(chatbot.messagesResetAt) : new Date(0);
  const isNewMonth = now.getFullYear() !== resetAt.getFullYear() || now.getMonth() !== resetAt.getMonth();
  return { used: isNewMonth ? 0 : (chatbot.messagesThisMonth ?? 0), limit };
}

export async function updateChatbotSiteContext(chatbotId: number, siteUrl: string, siteContext: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chatbots).set({ siteUrl, siteContext, lastScannedAt: new Date(), updatedAt: new Date() }).where(eq(chatbots.id, chatbotId));
}

// ─── SEO Reports ──────────────────────────────────────────────────────────────
export async function saveSeoReport(data: {
  chatbotId: number;
  siteUrl: string;
  score: number;
  keywords: Array<{ keyword: string; count: number; density: number }>;
  suggestions: Array<{ type: string; priority: string; message: string; page?: string }>;
  topPages: Array<{ url: string; title: string; visits: number; bounceRate: number }>;
  metaIssues: Array<{ page: string; issue: string; severity: string }>;
  loadSpeed: number;
  mobileScore: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(seoReports).values(data);
}

/**
 * JSON columns come back parsed from MySQL but as raw strings from MariaDB and
 * some driver/proxy setups. Pages then saw a string where they expected an
 * array and rendered an empty report. Normalise once, here.
 */
function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function getLatestSeoReport(chatbotId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(seoReports)
    .where(eq(seoReports.chatbotId, chatbotId))
    .orderBy(desc(seoReports.createdAt))
    .limit(1);
  const row = result[0];
  if (!row) return undefined;
  return {
    ...row,
    keywords: asJson(row.keywords, [] as typeof row.keywords),
    suggestions: asJson(row.suggestions, [] as typeof row.suggestions),
    topPages: asJson(row.topPages, [] as typeof row.topPages),
    metaIssues: asJson(row.metaIssues, [] as typeof row.metaIssues),
  };
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function saveConversation(data: {
  chatbotId: number;
  visitorId?: string;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  satisfactionRating?: number;
  isLead?: boolean;
  leadEmail?: string;
  leadName?: string;
  pageUrl?: string;
  duration?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(conversations).values(data);
}

export async function getConversationsByChatbot(chatbotId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  // Newest ACTIVITY first: a returning visitor continues their old
  // conversation, and ordering by creation date buried it under stale ones.
  const rows = await db.select().from(conversations)
    .where(eq(conversations.chatbotId, chatbotId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, messages: asJson(row.messages, [] as typeof row.messages) }));
}

// ─── Analytics ───────────────────────────────────────────────────────────────
/**
 * Visits and chats per day for the last 7 days.
 *
 * Aggregated in SQL: this used to load every event row of the week into memory
 * (one row per page view) and count them in a loop, which gets slow and heavy
 * exactly when a site is doing well.
 *
 * "Chats" = visitors who actually SENT a message that day. It used to add up
 * chat_open and message_sent events, and since the widget opens itself for
 * first-time visitors, the number mostly measured page loads.
 */
export async function getWeeklyAnalytics(chatbotId: number) {
  const db = await getDb();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const labelOf = (dateStr: string) => {
    const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    return days[dow === 0 ? 6 : dow - 1];
  };
  const now = new Date();
  const buckets: Record<string, { visits: number; chats: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    buckets[d.toISOString().slice(0, 10)] = { visits: 0, chats: 0 };
  }
  const toRows = () => Object.entries(buckets).map(([dateStr, v]) => ({ day: labelOf(dateStr), ...v }));
  if (!db) return toRows();

  const since = new Date(`${Object.keys(buckets)[0]}T00:00:00Z`);
  const rows = await db
    .select({
      day: sql<string>`DATE_FORMAT(${analyticsEvents.createdAt}, '%Y-%m-%d')`,
      eventType: analyticsEvents.eventType,
      total: sql<number>`COUNT(*)`,
      visitors: sql<number>`COUNT(DISTINCT ${analyticsEvents.visitorId})`,
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.chatbotId, chatbotId), sql`${analyticsEvents.createdAt} >= ${since}`))
    .groupBy(sql`DATE_FORMAT(${analyticsEvents.createdAt}, '%Y-%m-%d')`, analyticsEvents.eventType);

  for (const r of rows) {
    const bucket = buckets[String(r.day)];
    if (!bucket) continue;
    if (r.eventType === "page_view") bucket.visits += Number(r.total);
    // Distinct visitors; falls back to the raw count for events with no visitor id.
    if (r.eventType === "message_sent") bucket.chats += Number(r.visitors) || Number(r.total);
  }
  return toRows();
}

/**
 * Most visited pages this week (top 5), from the widget's page_view events.
 *
 * The card this feeds was titled "Clicks by page" and read "click" events —
 * which the widget has never sent, so it was permanently empty. Page views ARE
 * recorded on every page load, so the card now shows something real. The field
 * is still called `clicks` to keep the response shape stable.
 */
export async function getClicksByPage(chatbotId: number) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({ pageUrl: analyticsEvents.pageUrl, total: sql<number>`COUNT(*)` })
    .from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.chatbotId, chatbotId),
      eq(analyticsEvents.eventType, "page_view"),
      sql`${analyticsEvents.createdAt} >= ${since}`
    ))
    .groupBy(analyticsEvents.pageUrl)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(40);

  // Same page with different query strings / trailing slashes is one page.
  const pageMap: Record<string, number> = {};
  for (const r of rows) {
    let path = r.pageUrl ?? "/";
    try { path = new URL(path).pathname; } catch { /* already a path */ }
    path = path.replace(/\/+$/, "") || "/";
    const label = path === "/" ? "Home" : path.split("/").filter(Boolean).pop() ?? path;
    pageMap[label] = (pageMap[label] ?? 0) + Number(r.total);
  }
  return Object.entries(pageMap)
    .map(([page, clicks]) => ({ page, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);
}

// ─── Analytics (write) ──────────────────────────────────────────────────────
export async function saveAnalyticsEvent(data: {
  chatbotId: number;
  eventType: "page_view" | "chat_open" | "chat_close" | "message_sent" | "lead_captured" | "click";
  pageUrl?: string;
  elementId?: string;
  visitorId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  // Fire-and-forget: don't block the response on analytics
  db.insert(analyticsEvents).values(data).catch(() => {});
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function saveNotification(data: {
  userId: number;
  type: "new_lead" | "low_rating" | "seo_issue" | "scan_complete" | "system";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotificationsByUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** Scoped to the owner: an id alone would let any account mark anyone's. */
export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ─── Onboarding ────────────────────────────────────────────────────────────────────────────────
export async function getOnboardingProgress(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertOnboardingProgress(userId: number, data: {
  step1Done?: boolean;
  step2Done?: boolean;
  step3Done?: boolean;
  completedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await getOnboardingProgress(userId);
  if (existing) {
    await db.update(onboardingProgress).set(data).where(eq(onboardingProgress.userId, userId));
  } else {
    await db.insert(onboardingProgress).values({ userId, ...data });
  }
}

// ─── User profile ──────────────────────────────────────────────────────────────────────────────
export async function updateUserName(userId: number, name: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ name }).where(eq(users.id, userId));
}

// ─── Blog Posts ───────────────────────────────────────────────────────────────
export async function getPublishedBlogPosts(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);
  return result[0];
}

export async function getAllBlogPostsAdmin(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogPosts)
    .orderBy(desc(blogPosts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createBlogPost(data: InsertBlogPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(blogPosts).values(data);
  const result = await db.select().from(blogPosts).where(eq(blogPosts.slug, data.slug!)).limit(1);
  return result[0];
}

export async function updateBlogPost(id: number, data: Partial<InsertBlogPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogPosts).set({ ...data, updatedAt: new Date() }).where(eq(blogPosts.id, id));
  const result = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return result[0];
}

export async function deleteBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

export async function publishBlogPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogPosts).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() }).where(eq(blogPosts.id, id));
}

export async function countPublishedBlogPosts() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.status, "published"));
  return result[0]?.count ?? 0;
}
