/**
 * Widget REST API
 *
 * Provides two public endpoints:
 *   GET  /widget.js          — serves the self-contained embeddable chat widget
 *   POST /api/widget/chat    — accepts { apiKey, message, history, siteContext } and returns { reply, chatbotConfig }
 *   GET  /api/widget/config  — accepts ?apiKey=... and returns chatbot config (name, color, welcome, position, etc.)
 *
 * These endpoints are intentionally unauthenticated (no session required) because they are
 * called from third-party websites that embed the widget.
 */

import type { Express, Request, Response } from "express";
import { and, desc, eq, ne, gt } from "drizzle-orm";
import { buildTrainingPromptSection } from "./routers";
import { getDb, checkAndIncrementUsage, PLAN_LIMITS, saveAnalyticsEvent } from "./db";
import { chatbots, users, conversations, widgetEmailVerifications } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { sendUsageLimitAlertEmail, sendNewLeadEmail, sendChatVerificationCode } from "./email";
import { sendPushToUser } from "./pushNotifications";
import path from "path";
import fs from "fs";

// ─── CORS helper ─────────────────────────────────────────────────────────────

function setCorsHeaders(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// ─── Get chatbot by API key ───────────────────────────────────────────────────

async function getChatbotByApiKey(apiKey: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.apiKey, apiKey))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Normalize a URL/host to its bare registrable hostname for comparison.
 * "https://www.brighterdayslabs.com/path" → "brighterdayslabs.com"
 */
function normalizeHost(input: string | undefined | null): string {
  if (!input) return "";
  let h = input.trim().toLowerCase();
  // If it's a full URL, extract the host
  try {
    if (h.includes("://")) h = new URL(h).hostname;
    else if (h.includes("/")) h = new URL("https://" + h).hostname;
  } catch {
    // fall through with raw value
  }
  h = h.replace(/^www\./, "");
  return h;
}

/**
 * For White-Label CLIENT chatbots, enforce that the widget only runs on the
 * domain registered in "My Clients" (chatbot.siteUrl). Returns true if allowed.
 * Non-client chatbots (the reseller's own, cloud/embedded users) are never
 * restricted here. The request origin is taken from the Origin/Referer header
 * the browser sends automatically — it cannot be forged from client JS.
 */
function isDomainAllowed(chatbot: { isClientChatbot?: boolean | null; siteUrl?: string | null }, req: Request): boolean {
  // Only client chatbots are domain-locked
  if (!chatbot.isClientChatbot) return true;
  const registered = normalizeHost(chatbot.siteUrl);
  if (!registered) return true; // no domain on file → don't lock out (safety)

  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  const reqHost = normalizeHost(origin || referer);
  if (!reqHost) return false; // client chatbot but no origin → block

  // Allow exact match or subdomain of the registered domain
  return reqHost === registered || reqHost.endsWith("." + registered);
}

// ─── Register widget routes ───────────────────────────────────────────────────


// ─── Conversation persistence ────────────────────────────────────────────────
// Appends a user/assistant message pair to the visitor's active conversation
// (same visitor within the last 12h), creating the row if needed. This is the
// single source of truth for transcripts — it runs server-side on every chat
// turn, so the dashboard always has the full history regardless of client
// behavior.
const CONVERSATION_WINDOW_MS = 12 * 60 * 60 * 1000;
const MAX_STORED_MESSAGES = 200;


/**
 * Conversational lead capture: if the visitor types an email address in their
 * chat message (e.g. after the bot asks for it, Violet-style), save it as the
 * lead on their active conversation automatically — no form needed.
 */
async function captureEmailFromMessage(params: {
  chatbotId: number;
  visitorId: string | null;
  message: string;
  chatbotName?: string;
}): Promise<{ codeSent: boolean; email: string | null }> {
  const { chatbotId, visitorId, message, chatbotName } = params;
  const none = { codeSent: false, email: null as string | null };
  if (!visitorId) return none;
  const emailMatch = message.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (!emailMatch) return none;
  const email = emailMatch[0].toLowerCase().slice(0, 320);
  try {
    const db = await getDb();
    if (!db) return none;
    const rows = await db
      .select({ id: conversations.id, updatedAt: conversations.updatedAt, leadEmail: conversations.leadEmail })
      .from(conversations)
      .where(and(
        eq(conversations.chatbotId, chatbotId),
        eq(conversations.visitorId, visitorId),
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    const recent = rows[0];
    if (recent && Date.now() - new Date(recent.updatedAt).getTime() < CONVERSATION_WINDOW_MS) {
      // Don't overwrite an email captured via the lead form
      if (!recent.leadEmail) {
        await db.update(conversations)
          .set({ leadEmail: email, leadName: "Chat visitor" })
          .where(eq(conversations.id, recent.id));
      }
    } else {
      await db.insert(conversations).values({
        chatbotId,
        visitorId: visitorId.slice(0, 64),
        leadEmail: email,
        leadName: "Chat visitor",
        messages: [],
      });
    }

    // ── Cross-device continuity: does this email have an OLDER conversation
    // (different visitor) with real messages on this chatbot? If so, email a
    // 6-digit code the visitor can type here to restore it.
    const prev = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(
        eq(conversations.chatbotId, chatbotId),
        eq(conversations.leadEmail, email),
        ne(conversations.visitorId, visitorId),
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    if (prev.length > 0) {
      // Reuse an unexpired code instead of spamming new emails
      const existing = await db
        .select({ id: widgetEmailVerifications.id })
        .from(widgetEmailVerifications)
        .where(and(
          eq(widgetEmailVerifications.chatbotId, chatbotId),
          eq(widgetEmailVerifications.visitorId, visitorId),
          eq(widgetEmailVerifications.email, email),
          gt(widgetEmailVerifications.expiresAt, new Date()),
        ))
        .limit(1);
      if (existing.length === 0) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await db.insert(widgetEmailVerifications).values({
          chatbotId,
          visitorId: visitorId.slice(0, 64),
          email,
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        void sendChatVerificationCode(email, code, chatbotName ?? "The assistant");
      }
      return { codeSent: true, email };
    }
    return { codeSent: false, email };
  } catch (err) {
    console.warn("[Widget] Email capture failed:", err);
    return none;
  }
}

/**
 * If the visitor typed a 6-digit code, check it against pending verifications.
 * On success: returns the previous conversation's messages so the widget can
 * restore them, and links the email to the current conversation.
 */
async function tryVerifyCode(params: {
  chatbotId: number;
  visitorId: string | null;
  message: string;
}): Promise<{ restored: Array<{ role: string; content: string }>; email: string } | null> {
  const { chatbotId, visitorId, message } = params;
  if (!visitorId) return null;
  const m = message.trim().match(/^(\d{6})$/);
  if (!m) return null;
  const code = m[1];
  try {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(widgetEmailVerifications)
      .where(and(
        eq(widgetEmailVerifications.chatbotId, chatbotId),
        eq(widgetEmailVerifications.visitorId, visitorId),
        eq(widgetEmailVerifications.code, code),
        gt(widgetEmailVerifications.expiresAt, new Date()),
      ))
      .orderBy(desc(widgetEmailVerifications.createdAt))
      .limit(1);
    const ver = rows[0];
    if (!ver) return null;
    // one-time use
    await db.delete(widgetEmailVerifications).where(eq(widgetEmailVerifications.id, ver.id));
    // fetch the previous conversation for that email (not this visitor)
    const prevRows = await db
      .select({ id: conversations.id, messages: conversations.messages, leadName: conversations.leadName })
      .from(conversations)
      .where(and(
        eq(conversations.chatbotId, chatbotId),
        eq(conversations.leadEmail, ver.email),
        ne(conversations.visitorId, visitorId),
      ))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    const prev = prevRows[0];
    if (!prev) return null;
    let rawMsgs: unknown = prev.messages;
    if (typeof rawMsgs === "string") { try { rawMsgs = JSON.parse(rawMsgs); } catch { rawMsgs = []; } }
    const msgs = (Array.isArray(rawMsgs) ? rawMsgs : [])
      .filter((x: { role?: string; content?: string }) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
      .slice(-40)
      .map((x: { role?: string; content?: string }) => ({ role: String(x.role), content: String(x.content) }));
    return { restored: msgs, email: ver.email };
  } catch (err) {
    console.warn("[Widget] Code verification failed:", err);
    return null;
  }
}

async function persistChatTurn(params: {
  chatbotId: number;
  visitorId: string | null;
  visitorIp: string | null;
  pageUrl: string | null;
  userMessage: string;
  assistantMessage: string;
}): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const now = Date.now();
    const newEntries = [
      { role: "user", content: params.userMessage.slice(0, 2000), timestamp: now },
      { role: "assistant", content: params.assistantMessage.slice(0, 4000), timestamp: now },
    ];

    // Find the visitor's most recent conversation for this chatbot
    let existing: { id: number; messages: unknown; createdAt: Date; updatedAt: Date } | undefined;
    if (params.visitorId) {
      const rows = await db
        .select({
          id: conversations.id,
          messages: conversations.messages,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .where(and(
          eq(conversations.chatbotId, params.chatbotId),
          eq(conversations.visitorId, params.visitorId),
        ))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);
      const candidate = rows[0];
      if (candidate && now - new Date(candidate.updatedAt).getTime() < CONVERSATION_WINDOW_MS) {
        existing = candidate;
      }
    }

    if (existing) {
      // mysql2 may return the JSON column as a raw string — parse defensively
      let prior: unknown[] = [];
      if (Array.isArray(existing.messages)) {
        prior = existing.messages;
      } else if (typeof existing.messages === "string") {
        try {
          const parsed = JSON.parse(existing.messages);
          if (Array.isArray(parsed)) prior = parsed;
        } catch { /* corrupt JSON — start fresh */ }
      }
      const merged = [...prior, ...newEntries].slice(-MAX_STORED_MESSAGES);
      const durationSec = Math.round((now - new Date(existing.createdAt).getTime()) / 1000);
      await db
        .update(conversations)
        .set({
          messages: merged as never,
          pageUrl: params.pageUrl ?? undefined,
          duration: durationSec,
        })
        .where(eq(conversations.id, existing.id));
      return existing.id;
    }

    const result = await db.insert(conversations).values({
      chatbotId: params.chatbotId,
      visitorId: params.visitorId ? params.visitorId.slice(0, 64) : null,
      visitorIp: params.visitorIp ? params.visitorIp.slice(0, 64) : null,
      pageUrl: params.pageUrl ? params.pageUrl.slice(0, 500) : null,
      messages: newEntries as never,
      duration: 0,
    });
    return (result as unknown as { insertId?: number }).insertId ?? null;
  } catch (err) {
    console.warn("[Widget] Failed to persist chat turn:", err);
    return null;
  }
}

export function registerWidgetRoutes(app: Express) {
  // Handle CORS preflight for all widget endpoints
  app.options("/api/widget/*", (req: Request, res: Response) => {
    setCorsHeaders(res);
    res.status(204).end();
  });

  // GET /api/widget/config?apiKey=xxx
  // Returns chatbot configuration (name, primaryColor, welcomeMessage, position, etc.)
  app.get("/api/widget/config", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    // Never cache config — customization changes must reflect immediately
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const apiKey = (req.query.apiKey as string) ?? "";
    if (!apiKey) {
      return res.status(400).json({ error: "apiKey is required" });
    }

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ error: "Chatbot not found or inactive" });
      }
      // White-Label client chatbots only run on their registered domain
      if (!isDomainAllowed(chatbot, req)) {
        return res.status(403).json({ error: "This chatbot is not authorized for this domain." });
      }

      // Convert relative /manus-storage/... paths to absolute URLs so the widget
      // can load them from external sites (the relative path only works on lynxaiassistant.com).
      const rawAvatarUrl = chatbot.avatarUrl ?? null;
      let avatarUrl: string | null = null;
      if (rawAvatarUrl) {
        if (rawAvatarUrl.startsWith('http://') || rawAvatarUrl.startsWith('https://')) {
          avatarUrl = rawAvatarUrl;
        } else {
          // Build absolute URL from the request host
          const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'lynxaiassistant.com';
          const protocol = (req.headers['x-forwarded-proto'] as string) ?? (req.secure ? 'https' : 'http');
          avatarUrl = `${protocol}://${host}${rawAvatarUrl.startsWith('/') ? '' : '/'}${rawAvatarUrl}`;
        }
      }

      return res.json({
        name: chatbot.name ?? "Lynx AI",
        primaryColor: chatbot.primaryColor ?? "#3b82f6",
        secondaryColor: chatbot.secondaryColor ?? "#1e40af",
        welcomeMessage: chatbot.welcomeMessage ?? "Hi! How can I help you today?",
        disclaimer: chatbot.disclaimer ?? null,
        placeholder: chatbot.placeholder ?? "Type your question...",
        position: chatbot.position ?? "bottom-right",
        autoOpen: chatbot.autoOpen ?? false,
        autoOpenDelay: chatbot.autoOpenDelay ?? 5,
        // White-Label custom icon — absolute URL so external sites can load it
        avatarUrl,
      });
    } catch (err) {
      console.error("[Widget] Config error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/widget/chat
  // Body: { apiKey: string, message: string, history?: {role, content}[], pageUrl?: string }
  // Returns: { reply: string }
  app.post("/api/widget/chat", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const { apiKey, message, history, visitorId, pageUrl, visitorTimezone } = req.body ?? {};

    // Detect visitor timezone: use client-sent Intl value first, then IP-based lookup
    let detectedTimezone: string | null = (typeof visitorTimezone === "string" && visitorTimezone) ? visitorTimezone : null;
    if (!detectedTimezone) {
      try {
        const visitorIp = ((req.headers["x-forwarded-for"] as string) ?? "").split(",")[0]?.trim() || req.socket.remoteAddress || "";
        if (visitorIp && visitorIp !== "127.0.0.1" && visitorIp !== "::1") {
          const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(visitorIp)}?fields=timezone`, { signal: AbortSignal.timeout(1500) });
          if (geoRes.ok) {
            const geo = await geoRes.json() as { timezone?: string; countryCode?: string };
            if (geo.timezone) detectedTimezone = geo.timezone;
          }
        }
      } catch { /* fail silently */ }
    }

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "apiKey is required" });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "message too long (max 2000 chars)" });
    }

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ error: "Chatbot not found or inactive" });
      }
      if (!isDomainAllowed(chatbot, req)) {
        return res.status(403).json({ error: "This chatbot is not authorized for this domain." });
      }

      // ─── Rate limiting by plan ────────────────────────────────────────────
      const db = await getDb();
      let userPlan = "cloud";
      let userCreatedAt: Date | null = null;
      if (db) {
        const ownerRows = await db
          .select({ plan: users.plan, createdAt: users.createdAt })
          .from(users)
          .where(eq(users.id, chatbot.userId))
          .limit(1);
        userPlan = ownerRows[0]?.plan ?? "cloud";
        userCreatedAt = ownerRows[0]?.createdAt ? new Date(ownerRows[0].createdAt) : null;
      }
      // ─── Free plan: 14-day trial — chat disabled after that ───────────────
      if (userPlan === "free" && userCreatedAt) {
        const daysSinceSignup = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSignup > 14) {
          return res.status(403).json({
            error: "Free trial expired",
            message: "Your 14-day free trial has ended. Upgrade to keep your chatbot active.",
            upgradeUrl: "https://lynxaiassistant.com/pricing",
            trialExpired: true,
          });
        }
      }

      const usage = await checkAndIncrementUsage(chatbot.id, userPlan, chatbot.isClientChatbot ?? false);
      if (!usage.allowed) {
        return res.status(429).json({
          error: "Monthly message limit reached",
          used: usage.used,
          limit: usage.limit,
          plan: userPlan,
          upgradeUrl: "https://lynxaiassistant.com/pricing",
        });
      }

      // Conversational lead capture (Violet-style): detect an email typed in chat
      // 1) If the visitor typed a 6-digit code → verify & restore their previous
      // conversation (cross-device continuity) without calling the LLM.
      const codeResult = await tryVerifyCode({
        chatbotId: chatbot.id,
        visitorId: typeof visitorId === "string" ? visitorId : null,
        message: String(message ?? ""),
      });

      // 2) If the message contains an email → save lead; if that email has an
      // older conversation, a verification code is emailed to them.
      const emailResult = codeResult ? { codeSent: false, email: null } : await captureEmailFromMessage({
        chatbotId: chatbot.id,
        visitorId: typeof visitorId === "string" ? visitorId : null,
        message: String(message ?? ""),
        chatbotName: chatbot.name ?? undefined,
      });

      if (codeResult) {
        const confirmMsg = "✅ ¡Listo! Verificación correcta — retomamos tu conversación anterior. / Verified — your previous conversation has been restored.";
        void persistChatTurn({
          chatbotId: chatbot.id,
          visitorId: typeof visitorId === "string" ? visitorId : null,
          visitorIp: null,
          pageUrl: typeof pageUrl === "string" ? pageUrl : null,
          userMessage: String(message ?? ""),
          assistantMessage: confirmMsg,
        });
        return res.json({
          reply: confirmMsg,
          restoredMessages: codeResult.restored,
          quickReplies: [],
          usage: { used: usage.used, limit: usage.limit },
        });
      }

      // Fire-and-forget 80% usage alert email + push
      if (usage.shouldAlertAt80 && db) {
        db.select({ id: users.id, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, chatbot.userId))
          .limit(1)
          .then((rows) => {
            const owner = rows[0];
            if (owner?.email) {
              sendUsageLimitAlertEmail(
                owner.email,
                owner.name ?? "",
                usage.used,
                usage.limit,
                userPlan
              ).catch(console.error);
            }
            if (owner?.id) {
              const pct = Math.round((usage.used / usage.limit) * 100);
              sendPushToUser(owner.id, {
                title: `📊 Chatbot at ${pct}% of monthly limit`,
                body: `${usage.used}/${usage.limit} messages used. Upgrade to avoid interruptions.`,
                url: "/dashboard/billing",
                tag: "usage-limit",
                eventType: "usageLimit",
              }).catch(console.error);
            }
          })
          .catch(console.error);
      }
      // ─────────────────────────────────────────────────────────────────────

      const systemPrompt = `You are ${chatbot.name ?? "Lynx AI"}, a friendly EXPERT CONSULTANT for this website — think of a knowledgeable specialist in this site's field who genuinely enjoys helping people find the right solution. You guide the visitor like a trusted advisor, not a generic support bot.

CONVERSATION FLOW (like a real consultant):
1. Early in the conversation, if you don't know the visitor's name yet, ask it naturally ("What should I call you?" / "¿Cómo te llamas?"). Once you know it, use their name occasionally — it builds rapport.
2. After a couple of exchanges, when the visitor shows real interest, ask for their email naturally so you can "save their recommendation / send them the summary" — never demand it, offer it as a benefit. If they share it, thank them and confirm it's saved.
3. Before recommending, ask ONE smart qualifying question (their goal, their experience level, their situation). This makes the recommendation feel personal and earns trust.
4. THEN recommend the specific product from the PRODUCT CATALOG that best fits their answer: name it exactly, mention the price if available, explain in 1-2 sentences WHY it fits them, and share its exact URL from the catalog. If they ask where to get it, tell them right here on this site and give the direct product link.

KNOWLEDGE (this is what makes you valuable):
5. You MAY use your general expert knowledge of this site's FIELD to educate: explain how this type of product works, what results to expect, best practices, comparisons between categories. Teach like a specialist would — this is encouraged.
6. BUT specific products, prices, and links must come ONLY from the PRODUCT CATALOG in the site context. Never invent a product, price, discount code, or URL. If something isn't in the catalog, say you don't see it and suggest the closest alternative that IS there.
6b. If the visitor wants to SEE a product (photo, "how does it look"), include the product's IMG url from the catalog on its own line — the chat renders image links as photos automatically.

STYLE:
7. Warm, human, conversational — like texting with a smart friend. Use natural phrasing, react to what they say ("Good question", "Entiendo perfectamente"). Never sound scripted.
8. Usually 2-4 sentences. When educating (rule 5) you may go slightly longer, but keep it digestible — no long lectures, no bullet lists.
9. Mirror the visitor's language: Spanish → Spanish, English → English.
10. Suggest 3-4 natural follow-up questions as quickReplies (under 40 chars each).
11. If you truly don't know something, say so briefly and pivot to what you DO know that helps them.
12. When the visitor says goodbye or wraps up (thanks, that's all, bye), close warmly in one short sentence and ask how satisfied they were with the help — star buttons will appear right below your message for them to tap.
${buildTrainingPromptSection(chatbot)}${chatbot.siteContext ? `\n\nSite context (use this to give accurate, specific answers):\n${chatbot.siteContext}` : ""}
${pageUrl ? `\n\nVisitor is currently on: ${pageUrl}` : ""}
${detectedTimezone ? `\n\nVisitor's timezone: ${detectedTimezone} (use this for any time/schedule references — NEVER ask the visitor for their timezone).` : ""}${emailResult.codeSent ? `\n\nSYSTEM NOTE: We just emailed a 6-digit verification code to ${emailResult.email}. Tell the visitor (in their language) to check their inbox and type the code here to restore their previous conversation.` : ""}`;

      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (m: unknown) =>
                m &&
                typeof m === "object" &&
                "role" in (m as object) &&
                "content" in (m as object) &&
                ((m as { role: string }).role === "user" ||
                  (m as { role: string }).role === "assistant")
            )
            .slice(-20) // keep last 20 messages for context
        : [];

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...safeHistory.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message.trim() },
      ];

      const response = await invokeLLM({
        model: "gpt-5-nano",
        messages,
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "chat_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                reply: {
                  type: "string",
                  description: "Short, direct answer in 1-2 sentences max. Do not use bullet points or lists."
                },
                quickReplies: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 short follow-up question buttons the user might want to ask next. Each max 40 chars."
                }
              },
              required: ["reply", "quickReplies"],
              additionalProperties: false
            }
          }
        }
      });

      let reply = "Sorry, I could not process your request.";
      let quickReplies: string[] = [];

      try {
        const raw = response.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        reply = parsed.reply ?? reply;
        quickReplies = Array.isArray(parsed.quickReplies)
          ? parsed.quickReplies.slice(0, 4).map((q: unknown) => String(q).slice(0, 60))
          : [];
      } catch {
        reply = typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : reply;
      }

      // Persist the turn server-side so the dashboard always has transcripts
      const clientIp = ((req.headers["x-forwarded-for"] as string) ?? "").split(",")[0]?.trim() || req.socket.remoteAddress || null;
      void persistChatTurn({
        chatbotId: chatbot.id,
        visitorId: typeof visitorId === "string" ? visitorId : null,
        visitorIp: clientIp,
        pageUrl: typeof pageUrl === "string" ? pageUrl : null,
        userMessage: message.trim(),
        assistantMessage: reply,
      });

      return res.json({ reply, quickReplies, usage: { used: usage.used, limit: usage.limit, plan: userPlan } });
    } catch (err) {
      console.error("[Widget] Chat error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/widget/chat/stream
  // Body: { apiKey, message, history, pageUrl, visitorTimezone }
  // Returns: SSE stream — text/event-stream
  //   data: {"token": "..."} for each token
  //   data: {"done": true, "quickReplies": [...], "usage": {...}} at the end
  app.post("/api/widget/chat/stream", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const { apiKey, message, history, pageUrl, visitorId, visitorTimezone } = req.body ?? {};

    // Detect visitor timezone
    let detectedTimezone: string | null = (typeof visitorTimezone === "string" && visitorTimezone) ? visitorTimezone : null;
    if (!detectedTimezone) {
      try {
        const visitorIp = ((req.headers["x-forwarded-for"] as string) ?? "").split(",")[0]?.trim() || req.socket.remoteAddress || "";
        if (visitorIp && visitorIp !== "127.0.0.1" && visitorIp !== "::1") {
          const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(visitorIp)}?fields=timezone`, { signal: AbortSignal.timeout(1500) });
          if (geoRes.ok) {
            const geo = await geoRes.json() as { timezone?: string; countryCode?: string };
            if (geo.timezone) detectedTimezone = geo.timezone;
          }
        }
      } catch { /* fail silently */ }
    }

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "apiKey is required" });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "message too long (max 2000 chars)" });
    }

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ error: "Chatbot not found or inactive" });
      }
      if (!isDomainAllowed(chatbot, req)) {
        return res.status(403).json({ error: "This chatbot is not authorized for this domain." });
      }

      // Rate limiting by plan
      const db = await getDb();
      let userPlan = "cloud";
      let userCreatedAt: Date | null = null;
      if (db) {
        const ownerRows = await db
          .select({ plan: users.plan, createdAt: users.createdAt })
          .from(users)
          .where(eq(users.id, chatbot.userId))
          .limit(1);
        userPlan = ownerRows[0]?.plan ?? "cloud";
        userCreatedAt = ownerRows[0]?.createdAt ? new Date(ownerRows[0].createdAt) : null;
      }

      if (userPlan === "free" && userCreatedAt) {
        const daysSinceSignup = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSignup > 14) {
          return res.status(403).json({
            error: "Free trial expired",
            message: "Your 14-day free trial has ended. Upgrade to keep your chatbot active.",
            upgradeUrl: "https://lynxaiassistant.com/pricing",
            trialExpired: true,
          });
        }
      }

      const usage = await checkAndIncrementUsage(chatbot.id, userPlan, chatbot.isClientChatbot ?? false);
      if (!usage.allowed) {
        return res.status(429).json({
          error: "Monthly message limit reached",
          used: usage.used,
          limit: usage.limit,
          plan: userPlan,
          upgradeUrl: "https://lynxaiassistant.com/pricing",
        });
      }

      // Conversational lead capture (Violet-style): detect an email typed in chat
      // 1) If the visitor typed a 6-digit code → verify & restore their previous
      // conversation (cross-device continuity) without calling the LLM.
      const codeResult = await tryVerifyCode({
        chatbotId: chatbot.id,
        visitorId: typeof visitorId === "string" ? visitorId : null,
        message: String(message ?? ""),
      });

      // 2) If the message contains an email → save lead; if that email has an
      // older conversation, a verification code is emailed to them.
      const emailResult = codeResult ? { codeSent: false, email: null } : await captureEmailFromMessage({
        chatbotId: chatbot.id,
        visitorId: typeof visitorId === "string" ? visitorId : null,
        message: String(message ?? ""),
        chatbotName: chatbot.name ?? undefined,
      });


      const systemPrompt = `You are ${chatbot.name ?? "Lynx AI"}, a friendly EXPERT CONSULTANT for this website — think of a knowledgeable specialist in this site's field who genuinely enjoys helping people find the right solution. You guide the visitor like a trusted advisor, not a generic support bot.

CONVERSATION FLOW (like a real consultant):
1. Early in the conversation, if you don't know the visitor's name yet, ask it naturally ("What should I call you?" / "¿Cómo te llamas?"). Once you know it, use their name occasionally — it builds rapport.
2. After a couple of exchanges, when the visitor shows real interest, ask for their email naturally so you can "save their recommendation / send them the summary" — never demand it, offer it as a benefit. If they share it, thank them and confirm it's saved.
3. Before recommending, ask ONE smart qualifying question (their goal, their experience level, their situation). This makes the recommendation feel personal and earns trust.
4. THEN recommend the specific product from the PRODUCT CATALOG that best fits their answer: name it exactly, mention the price if available, explain in 1-2 sentences WHY it fits them, and share its exact URL from the catalog. If they ask where to get it, tell them right here on this site and give the direct product link.

KNOWLEDGE (this is what makes you valuable):
5. You MAY use your general expert knowledge of this site's FIELD to educate: explain how this type of product works, what results to expect, best practices, comparisons between categories. Teach like a specialist would — this is encouraged.
6. BUT specific products, prices, and links must come ONLY from the PRODUCT CATALOG in the site context. Never invent a product, price, discount code, or URL. If something isn't in the catalog, say you don't see it and suggest the closest alternative that IS there.
6b. If the visitor wants to SEE a product (photo, "how does it look"), include the product's IMG url from the catalog on its own line — the chat renders image links as photos automatically.

STYLE:
7. Warm, human, conversational — like texting with a smart friend. Use natural phrasing, react to what they say ("Good question", "Entiendo perfectamente"). Never sound scripted.
8. Usually 2-4 sentences. When educating (rule 5) you may go slightly longer, but keep it digestible — no long lectures, no bullet lists.
9. Mirror the visitor's language: Spanish → Spanish, English → English.
10. Do NOT include quick reply suggestions in your text response — they will be generated separately.
11. If you truly don't know something, say so briefly and pivot to what you DO know that helps them.
12. When the visitor says goodbye or wraps up (thanks, that's all, bye), close warmly in one short sentence and ask how satisfied they were with the help — star buttons will appear right below your message for them to tap.
${buildTrainingPromptSection(chatbot)}${chatbot.siteContext ? `\n\nSite context (use this to give accurate, specific answers):\n${chatbot.siteContext}` : ""}
${pageUrl ? `\n\nVisitor is currently on: ${pageUrl}` : ""}
${detectedTimezone ? `\n\nVisitor's timezone: ${detectedTimezone}` : ""}${emailResult.codeSent ? `\n\nSYSTEM NOTE: We just emailed a 6-digit verification code to ${emailResult.email}. Tell the visitor (in their language) to check their inbox and type the code here to restore their previous conversation.` : ""}`;

      const safeHistory = Array.isArray(history)
        ? history
            .filter((m: unknown) => m && typeof m === "object" && "role" in (m as object) && "content" in (m as object) &&
              ((m as { role: string }).role === "user" || (m as { role: string }).role === "assistant"))
            .slice(-20)
        : [];

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...safeHistory.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message.trim() },
      ];

      // ── SSE headers ──────────────────────────────────────────────────────────
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
      res.flushHeaders();

      const sendEvent = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        // @ts-ignore — flush exists on compressed responses
        if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
          (res as unknown as { flush: () => void }).flush();
        }
      };

      if (codeResult) {
        const confirmMsg = "✅ ¡Listo! Verificación correcta — retomamos tu conversación anterior. / Verified — your previous conversation has been restored.";
        sendEvent({ restored: codeResult.restored });
        sendEvent({ token: confirmMsg });
        sendEvent({ done: true, quickReplies: [], usage: { used: usage.used, limit: usage.limit } });
        res.end();
        void persistChatTurn({
          chatbotId: chatbot.id,
          visitorId: typeof visitorId === "string" ? visitorId : null,
          visitorIp: null,
          pageUrl: typeof pageUrl === "string" ? pageUrl : null,
          userMessage: String(message ?? ""),
          assistantMessage: confirmMsg,
        });
        return;
      }

      // ── Stream the reply from Claude (Anthropic Messages API, SSE) ────────────
      // Split system prompt out (Anthropic takes it as a top-level field).
      const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
      const convoMsgs = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const anthropicModel = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
      const streamRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: 1024,
          stream: true,
          system: systemMsg,
          messages: convoMsgs,
        }),
      });

      if (!streamRes.ok || !streamRes.body) {
        const errText = streamRes.body ? await streamRes.text() : "no body";
        console.error("[Widget] Anthropic stream failed:", streamRes.status, errText);
        sendEvent({ error: "LLM stream failed" });
        res.end();
        return;
      }

      let fullReply = "";
      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const evt = JSON.parse(raw);
            // Anthropic streaming: content_block_delta carries text_delta tokens
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              const token = evt.delta.text ?? "";
              if (token) {
                fullReply += token;
                sendEvent({ token });
              }
            }
          } catch { /* malformed chunk, skip */ }
        }
      }

      // ── Generate quickReplies separately (non-blocking feel) ─────────────────
      let quickReplies: string[] = [];
      try {
        const qrRes = await invokeLLM({
          model: "gpt-5-nano",
          messages: [
            ...messages,
            { role: "assistant" as const, content: fullReply },
            { role: "user" as const, content: "Generate 3-4 short follow-up questions the visitor might want to ask next. Each max 40 chars. Return JSON array only." },
          ],
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "quick_replies",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  quickReplies: { type: "array", items: { type: "string" } }
                },
                required: ["quickReplies"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = qrRes.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        quickReplies = Array.isArray(parsed.quickReplies)
          ? parsed.quickReplies.slice(0, 4).map((q: unknown) => String(q).slice(0, 60))
          : [];
      } catch { /* quickReplies optional */ }

      // ── Fire-and-forget 80% usage alert ──────────────────────────────────────
      if (usage.shouldAlertAt80 && db) {
        db.select({ id: users.id, email: users.email, name: users.name })
          .from(users).where(eq(users.id, chatbot.userId)).limit(1)
          .then((rows) => {
            const owner = rows[0];
            if (owner?.email) {
              sendUsageLimitAlertEmail(owner.email, owner.name ?? "", usage.used, usage.limit, userPlan).catch(console.error);
            }
          }).catch(console.error);
      }

      // Persist the turn server-side so the dashboard always has transcripts
      const clientIp = ((req.headers["x-forwarded-for"] as string) ?? "").split(",")[0]?.trim() || req.socket.remoteAddress || null;
      void persistChatTurn({
        chatbotId: chatbot.id,
        visitorId: typeof visitorId === "string" ? visitorId : null,
        visitorIp: clientIp,
        pageUrl: typeof pageUrl === "string" ? pageUrl : null,
        userMessage: message.trim(),
        assistantMessage: fullReply,
      });

      sendEvent({ done: true, quickReplies, usage: { used: usage.used, limit: usage.limit, plan: userPlan } });
      res.end();
    } catch (err) {
      console.error("[Widget] Stream chat error:", err);
      try { res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`); res.end(); } catch { /* already ended */ }
    }
  });

  // POST /api/widget/lead
  // Body: { apiKey, name, email, pageUrl }
  // Saves visitor lead info and returns conversationId for message tracking
  // GET /api/widget/history?apiKey=xxx&visitorId=yyy
  // Returns the visitor's recent conversation (within the active window) so the
  // widget can restore the chat when they come back — Violet-style continuity.
  app.get("/api/widget/history", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    res.setHeader("Cache-Control", "no-store");
    const apiKey = (req.query.apiKey as string) ?? "";
    const visitorId = (req.query.visitorId as string) ?? "";
    if (!apiKey || !visitorId) return res.json({ messages: [] });
    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot) return res.json({ messages: [] });
      const db = await getDb();
      if (!db) return res.json({ messages: [] });
      const rows = await db
        .select({ id: conversations.id, updatedAt: conversations.updatedAt, messages: conversations.messages })
        .from(conversations)
        .where(and(
          eq(conversations.chatbotId, chatbot.id),
          eq(conversations.visitorId, visitorId),
        ))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);
      const recent = rows[0];
      if (!recent || Date.now() - new Date(recent.updatedAt).getTime() > CONVERSATION_WINDOW_MS) {
        return res.json({ messages: [] });
      }
      // mysql2 may return the JSON column as a string — parse defensively
      let rawMsgs: unknown = recent.messages;
      if (typeof rawMsgs === "string") {
        try { rawMsgs = JSON.parse(rawMsgs); } catch { rawMsgs = []; }
      }
      const msgs = Array.isArray(rawMsgs) ? rawMsgs : [];
      // Only role/content, capped for payload size
      const safe = (msgs as Array<{ role?: string; content?: string }>)
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-40)
        .map(m => ({ role: m.role, content: m.content }));
      return res.json({ messages: safe, conversationId: recent.id });
    } catch {
      return res.json({ messages: [] });
    }
  });

  app.post("/api/widget/lead", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const { apiKey, name, email, pageUrl, company, visitorId } = req.body ?? {};

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "apiKey is required" });
    }
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "valid email is required" });
    }
    const companyTrimmed = typeof company === "string" && company.trim().length > 0 ? company.trim().slice(0, 256) : null;

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const db = await getDb();
      let conversationId: number | null = null;
      if (db) {
        // Attach the lead to the visitor's active conversation (so the owner
        // can read the full transcript behind each lead). Falls back to a new
        // row when the visitor has no recent conversation.
        const leadFields = {
          isLead: true,
          leadName: name.trim().slice(0, 256),
          leadEmail: email.trim().toLowerCase().slice(0, 320),
          leadCompany: companyTrimmed,
          pageUrl: typeof pageUrl === "string" ? pageUrl.slice(0, 500) : null,
        };

        if (typeof visitorId === "string" && visitorId) {
          const rows = await db
            .select({ id: conversations.id, updatedAt: conversations.updatedAt })
            .from(conversations)
            .where(and(
              eq(conversations.chatbotId, chatbot.id),
              eq(conversations.visitorId, visitorId),
            ))
            .orderBy(desc(conversations.updatedAt))
            .limit(1);
          const recent = rows[0];
          if (recent && Date.now() - new Date(recent.updatedAt).getTime() < CONVERSATION_WINDOW_MS) {
            await db.update(conversations).set(leadFields).where(eq(conversations.id, recent.id));
            conversationId = recent.id;
          }
        }

        if (conversationId === null) {
          const result = await db.insert(conversations).values({
            chatbotId: chatbot.id,
            visitorId: typeof visitorId === "string" ? visitorId.slice(0, 64) : null,
            ...leadFields,
            messages: [],
          });
          conversationId = (result as unknown as { insertId: number }).insertId ?? null;
        }
      }

      // Notify owner by email + push (non-blocking)
      try {
        const ownerDb = await getDb();
        if (ownerDb) {
          const owner = await ownerDb.select().from(users).where(eq(users.id, chatbot.userId)).limit(1);
          if (owner[0]?.email) {
            sendNewLeadEmail(
              owner[0].email,
              owner[0].name ?? "there",
              name.trim(),
              email.trim().toLowerCase(),
              typeof pageUrl === "string" ? pageUrl : null,
              chatbot.name ?? undefined,
              companyTrimmed,
            ).catch(() => {});
          }
          if (owner[0]?.id) {
            const leadDisplay = companyTrimmed
              ? `${name.trim()} (${companyTrimmed})`
              : name.trim();
            sendPushToUser(owner[0].id, {
              title: `🎯 New lead via ${chatbot.name ?? "Lynx AI"}`,
              body: `${leadDisplay} — ${email.trim().toLowerCase()}`,
              url: "/dashboard/leads",
              tag: "new-lead",
              eventType: "newLead",
            }).catch(() => {});
          }
        }
      } catch { /* non-blocking */ }

      return res.json({ success: true, conversationId });
    } catch (err) {
      console.error("[Widget] Lead error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/widget/save-messages
  // Body: { apiKey, conversationId, messages: [{role, content, timestamp}] }
  // Updates the messages JSON in an existing conversation
  app.post("/api/widget/save-messages", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const { apiKey, conversationId, messages: msgs } = req.body ?? {};

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "apiKey is required" });
    }
    if (!conversationId || typeof conversationId !== "number") {
      return res.status(400).json({ error: "conversationId is required" });
    }
    if (!Array.isArray(msgs)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const db = await getDb();
      if (db) {
        const safeMessages = msgs
          .filter((m: unknown) => m && typeof m === "object" && "role" in (m as object) && "content" in (m as object))
          .slice(0, 100)
          .map((m: { role: string; content: string; timestamp?: number }) => ({
            role: m.role,
            content: String(m.content).slice(0, 2000),
            timestamp: m.timestamp ?? Date.now(),
          }));
        await db
          .update(conversations)
          .set({ messages: safeMessages })
          .where(eq(conversations.id, conversationId));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[Widget] Save-messages error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/widget/rate
  // Body: { apiKey, rating (1-5), pageUrl }
  // Saves star rating to the conversations table (latest conversation for this chatbot)
  app.post("/api/widget/rate", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const { apiKey, rating, pageUrl, visitorId } = req.body ?? {};

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "apiKey is required" });
    }
    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "rating must be 1-5" });
    }

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot) {
        return res.status(404).json({ error: "Chatbot not found" });
      }

      const db = await getDb();
      if (db) {
        const { desc } = await import("drizzle-orm");
        // Find the visitor's own most recent conversation (falls back to the
        // chatbot's latest only when no visitorId was provided by the widget)
        const recent = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(
            typeof visitorId === "string" && visitorId
              ? and(eq(conversations.chatbotId, chatbot.id), eq(conversations.visitorId, visitorId))
              : eq(conversations.chatbotId, chatbot.id)
          )
          .orderBy(desc(conversations.updatedAt))
          .limit(1);

        if (recent[0]) {
          await db
            .update(conversations)
            .set({ satisfactionRating: ratingNum })
            .where(eq(conversations.id, recent[0].id));
        } else {
          // No conversation yet — create a placeholder to store the rating
          await db.insert(conversations).values({
            chatbotId: chatbot.id,
            pageUrl: typeof pageUrl === "string" ? pageUrl.slice(0, 500) : null,
            satisfactionRating: ratingNum,
          });
        }
      }

      // Send push notification for low ratings (1-2 stars) — non-blocking
      if (ratingNum <= 2) {
        try {
          const ownerDb = await getDb();
          if (ownerDb) {
            const owner = await ownerDb.select({ id: users.id }).from(users).where(eq(users.id, chatbot.userId)).limit(1);
            if (owner[0]?.id) {
              sendPushToUser(owner[0].id, {
                title: `⚠️ Low rating on ${chatbot.name ?? "Lynx AI"}`,
                body: `A visitor rated their experience ${ratingNum} star${ratingNum === 1 ? "" : "s"}. Review the conversation.`,
                url: "/dashboard/conversations",
                tag: "low-rating",
                eventType: "lowRating",
              }).catch(() => {});
            }
          }
        } catch { /* non-blocking */ }
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[Widget] Rate error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/widget/track — records analytics events (page_view, chat_open, message_sent, etc.)
  // Called from the embedded widget script on the client's website
  app.post("/api/widget/track", async (req: Request, res: Response) => {
    setCorsHeaders(res);
    const { apiKey, eventType, pageUrl, visitorId, metadata } = req.body ?? {};

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ error: "apiKey is required" });
    }
    const validEvents = ["page_view", "chat_open", "chat_close", "message_sent", "lead_captured", "click"];
    if (!eventType || !validEvents.includes(eventType)) {
      return res.status(400).json({ error: "invalid eventType" });
    }

    try {
      const chatbot = await getChatbotByApiKey(apiKey);
      if (!chatbot) return res.status(404).json({ error: "Chatbot not found" });

      // Fire-and-forget: don't block the response
      saveAnalyticsEvent({
        chatbotId: chatbot.id,
        eventType,
        pageUrl: typeof pageUrl === "string" ? pageUrl.slice(0, 500) : undefined,
        visitorId: typeof visitorId === "string" ? visitorId.slice(0, 64) : undefined,
        metadata: typeof metadata === "object" && metadata !== null ? metadata : undefined,
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error("[Widget] Track error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /widget.js — serves the self-contained embeddable chat widget script.
  // Registered under BOTH /widget.js and /api/widget.js: some edge/proxy
  // configurations only route /api/* paths to the Node server, so /api/widget.js
  // is the reliable public entry point (the snippet uses it).
  const serveWidget = (req: Request, res: Response) => {
    setCorsHeaders(res);
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
    const widgetScript = buildWidgetScript();
    return res.send(widgetScript);
  };
  app.get("/widget.js", serveWidget);
  app.get("/api/widget.js", serveWidget);
}

// ─── Widget script builder ────────────────────────────────────────────────────

function buildWidgetScript(): string {
  return `
(function() {
  'use strict';

  // Prevent double-initialization
  if (window.__lynxAIWidget) return;
  window.__lynxAIWidget = true;

  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var API_KEY = script.getAttribute('data-api-key') || '';
  var BASE_URL = script.getAttribute('data-base-url') || (function() {
    var src = script.src || '';
    // Strip query string and hash first
    var clean = src.split('?')[0].split('#')[0];
    // Remove trailing /api/widget.js or /widget.js to get the origin
    var marker = '/api/widget.js';
    var pos = clean.lastIndexOf(marker);
    if (pos < 0) { marker = '/widget.js'; pos = clean.lastIndexOf(marker); }
    if (pos >= 0) clean = clean.slice(0, pos);
    return clean;
  })();
  var POSITION = script.getAttribute('data-position') || 'bottom-right';

  if (!API_KEY) {
    console.warn('[Lynx AI Widget] Missing data-api-key attribute.');
    return;
  }

  // ── State ──────────────────────────────────────────────────────────────────
  var config = {
    name: 'Lynx AI',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    welcomeMessage: 'Hi! How can I help you today?',
    placeholder: 'Type your question...',
    position: POSITION,
    autoOpen: true,
    autoOpenDelay: 3,
  };
  var history = [];
  var isOpen = false;
  var isLoading = false;
  var configLoaded = false;
  var leadStep = 0;               // 0=not started, 1=asked name, 2=asked email
  var leadName = '';              // captured visitor name
  var leadEmail = '';             // captured visitor email
  var leadCompany = '';           // captured visitor company (optional)
  var messageCount = 0;           // total assistant messages sent
  var ratingShown = false;        // true once rating UI was shown
  var farewellDetected = false;   // visitor said goodbye/thanks — offer rating after bot reply
  var conversationId = null;       // ID of the conversation record in DB

  // ── Analytics tracking helper ──────────────────────────────────────────────
  // Generate or reuse a stable anonymous visitor ID for this browser
  var visitorId = (function() {
    try {
      var stored = localStorage.getItem('_lynx_vid');
      if (stored) return stored;
      var id = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('_lynx_vid', id);
      return id;
    } catch(e) { return 'v_' + Math.random().toString(36).slice(2, 10); }
  })();

  function trackEvent(eventType, extra) {
    try {
      fetch(BASE_URL + '/api/widget/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ apiKey: API_KEY, eventType: eventType, pageUrl: window.location.href, visitorId: visitorId }, extra || {})),
      }).catch(function() {});
    } catch(e) {}
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#lynx-widget-btn{position:fixed;bottom:24px;z-index:2147483647;width:64px;height:64px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(59,130,246,0.35);transition:transform 0.18s cubic-bezier(0.23,1,0.32,1),box-shadow 0.18s;outline:none;background:linear-gradient(135deg,#7c3aed,#3b82f6,#06b6d4);padding:3px;}',
    '#lynx-widget-btn:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(0,0,0,0.22);}',
    '#lynx-widget-btn:active{transform:scale(0.96);}',
    '#lynx-widget-btn.right{right:24px;}',
    '#lynx-widget-btn.left{left:24px;}',
    '#lynx-widget-panel{position:fixed;bottom:92px;overscroll-behavior:contain;z-index:2147483646;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 48px rgba(0,0,0,0.18);display:none;flex-direction:column;overflow:hidden;transition:opacity 0.22s cubic-bezier(0.23,1,0.32,1),transform 0.22s cubic-bezier(0.23,1,0.32,1);opacity:0;transform:scale(0.95) translateY(12px);pointer-events:none;}',
    '#lynx-widget-panel.open{display:flex;opacity:1;transform:scale(1) translateY(0);pointer-events:all;}',
    '#lynx-widget-panel.right{right:24px;}',
    '#lynx-widget-panel.left{left:24px;}',
    '#lynx-widget-header{padding:12px 16px;display:flex;align-items:center;gap:10px;color:#fff;flex-shrink:0;}',
    '#lynx-widget-header .lynx-logo{height:26px;width:auto;object-fit:contain;flex-shrink:0;display:block;}',
    '#lynx-widget-header .lynx-title{font-size:15px;font-weight:700;flex:1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:block;color:#fff;letter-spacing:-0.01em;}',
    '#lynx-widget-header .lynx-close{display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(255,255,255,0.15);border:none;border-radius:50%;cursor:pointer;color:#fff;flex-shrink:0;transition:background 0.15s;}',
    '#lynx-widget-header .lynx-close:hover{background:rgba(255,255,255,0.25);}',
    '#lynx-widget-messages{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}',
    '#lynx-widget-messages::-webkit-scrollbar{width:4px;}',
    '#lynx-widget-messages::-webkit-scrollbar-track{background:transparent;}',
    '#lynx-widget-messages::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:2px;}',
    '.lynx-msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;word-break:break-word;flex-shrink:0;}',
    '.lynx-msg.user{align-self:flex-end;color:#fff;border-bottom-right-radius:4px;}',
    '.lynx-msg.assistant{align-self:flex-start;background:#f3f4f6;color:#111827;border-bottom-left-radius:4px;}',
    '.lynx-msg.welcome{align-self:flex-start;background:#f3f4f6;color:#111827;border-bottom-left-radius:4px;}',
    '.lynx-typing{align-self:flex-start;background:#f3f4f6;padding:10px 14px;border-radius:14px;border-bottom-left-radius:4px;display:flex;gap:4px;align-items:center;}',
    '.lynx-typing span{width:7px;height:7px;border-radius:50%;background:#9ca3af;display:inline-block;animation:lynxDot 1.2s infinite;}',
    '.lynx-typing span:nth-child(2){animation-delay:0.2s;}',
    '.lynx-typing span:nth-child(3){animation-delay:0.4s;}',
    '@keyframes lynxDot{0%,80%,100%{transform:scale(0.7);opacity:0.5}40%{transform:scale(1);opacity:1}}',
    '#lynx-widget-input-row{padding:12px 14px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:flex-end;background:#fff;flex-shrink:0;}',
    '#lynx-widget-disclaimer{font-size:10.5px;color:#9ca3af;text-align:center;padding:4px 14px 2px;line-height:1.35;background:#fff;flex-shrink:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '.lynx-msg a{color:inherit;text-decoration:underline;word-break:break-all;}',
    '.lynx-msg img.lynx-product-img{display:block;max-width:100%;border-radius:10px;margin-top:6px;}',
    '@media (max-width:480px){#lynx-widget-panel{bottom:0 !important;left:0 !important;right:0 !important;width:100vw !important;max-width:100vw !important;height:100% !important;height:100dvh !important;max-height:100% !important;max-height:100dvh !important;border-radius:0 !important;}#lynx-widget-messages{padding:12px 12px !important;}.lynx-msg{font-size:14px !important;max-width:86% !important;}#lynx-widget-input-row{padding:10px 10px calc(10px + env(safe-area-inset-bottom));}#lynx-widget-input-row textarea{font-size:16px !important;}}',
    '#lynx-widget-input{flex:1;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 12px;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;resize:none;max-height:100px;outline:none;transition:border-color 0.15s;background:#fff;color:#111827;}',
    '#lynx-widget-input:focus{border-color:#3b82f6;}',
    '#lynx-widget-send{width:36px;height:36px;border-radius:9px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s,transform 0.15s;color:#fff;}',
    '#lynx-widget-send:hover{opacity:0.88;}',
    '#lynx-widget-send:active{transform:scale(0.94);}',
    '#lynx-widget-send:disabled{opacity:0.45;cursor:not-allowed;}',
    '#lynx-widget-branding{text-align:center;padding:6px 0 10px;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '#lynx-widget-branding a{color:#6b7280;text-decoration:none;}',
    '#lynx-widget-branding a:hover{text-decoration:underline;}',
    '.lynx-quick-replies{display:flex;flex-wrap:wrap;gap:7px;padding:4px 0 2px;align-self:flex-start;max-width:100%;}',
    '.lynx-qr-btn{background:#fff;border:1.5px solid #e5e7eb;border-radius:20px;padding:6px 13px;font-size:12.5px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#374151;cursor:pointer;transition:background 0.15s,border-color 0.15s,color 0.15s,transform 0.12s;white-space:nowrap;line-height:1.3;}',
    '.lynx-qr-btn:hover{background:#f0f7ff;border-color:#93c5fd;color:#1d4ed8;transform:translateY(-1px);}',
    '.lynx-qr-btn:active{transform:scale(0.96);}',
    // Lead capture form
    // Rating
    '.lynx-rating-bubble{background:#f3f4f6;border-radius:14px;padding:10px 14px;max-width:80%;align-self:flex-start;}',
    '.lynx-rating-bubble p{font-size:12.5px;color:#374151;margin:0 0 6px;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '#lynx-rating-stars{display:flex;justify-content:center;gap:8px;}',
    '.lynx-star{font-size:26px;cursor:pointer;color:#d1d5db;transition:color 0.12s,transform 0.12s;}',
    '.lynx-star:hover,.lynx-star.active{color:#f59e0b;transform:scale(1.15);}',
    '#lynx-rating-thanks{font-size:12px;color:#6b7280;margin-top:6px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
  ].join('');
  document.head.appendChild(style);

  // ── DOM ────────────────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.id = 'lynx-widget-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.className = config.position === 'bottom-left' ? 'left' : 'right';
  // Button icon: initially empty circle; filled after config loads (avoids flash of Lynx default)
  btn.innerHTML = '<div id="lynx-btn-inner" style="width:100%;height:100%;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
    '<svg id="lynx-btn-default-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<img id="lynx-btn-icon" src="" alt="Chat" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:none;" />' +
  '</div>';

  var panel = document.createElement('div');
  panel.id = 'lynx-widget-panel';
  panel.className = config.position === 'bottom-left' ? 'left' : 'right';

  panel.innerHTML = [
    '<div id="lynx-widget-header">',
      '<div id="lynx-header-avatar" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">',
        '<img id="lynx-header-icon" src="" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:none;" />',
        '<svg id="lynx-header-default-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      '</div>',
      '<div style="flex:1;min-width:0;">',
        '<div id="lynx-bot-name" style="font-size:15px;font-weight:700;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + config.name + '</div>',
        '<div style="font-size:11px;color:rgba(255,255,255,0.75);display:flex;align-items:center;gap:4px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;"><span style="width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;"></span>Online</div>',
      '</div>',
      '<button class="lynx-close" id="lynx-close-btn" aria-label="Close chat">',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '</button>',
    '</div>',
    '<div id="lynx-widget-messages"></div>',
    '<div id="lynx-widget-input-row">',
      '<textarea id="lynx-widget-input" rows="1" placeholder="Type your question..."></textarea>',
      '<button id="lynx-widget-send" aria-label="Send message">',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      '</button>',
    '</div>',
    '<div id="lynx-widget-disclaimer" style="display:none;"></div>',
    '<div id="lynx-widget-branding">Powered by <a href="https://lynxaiassistant.com" target="_blank" rel="noopener">Lynx AI</a></div>',
  ].join('');

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var messagesEl = document.getElementById('lynx-widget-messages');

  // Mouse wheel over ANY part of the panel scrolls the chat — never the page.
  panel.addEventListener('wheel', function(e) {
    if (!messagesEl) return;
    messagesEl.scrollTop += e.deltaY;
    e.preventDefault();
  }, { passive: false });

  // Touch: keep the gesture inside the chat. Nudge off the exact edges so iOS
  // never hands the scroll to the page (classic edge-chaining bug), and block
  // touch scrolling that starts outside the message list.
  panel.addEventListener('touchstart', function() {
    if (!messagesEl) return;
    if (messagesEl.scrollTop <= 0) messagesEl.scrollTop = 1;
    var max = messagesEl.scrollHeight - messagesEl.clientHeight;
    if (max > 0 && messagesEl.scrollTop >= max) messagesEl.scrollTop = max - 1;
  }, { passive: true });
  panel.addEventListener('touchmove', function(e) {
    if (!messagesEl) return;
    var inMessages = messagesEl.contains(e.target);
    var scrollable = messagesEl.scrollHeight > messagesEl.clientHeight;
    if (!inMessages || !scrollable) {
      var t = e.target;
      // allow typing area to behave normally
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
      e.preventDefault();
    }
  }, { passive: false });
  var inputEl = document.getElementById('lynx-widget-input');
  var sendBtn = document.getElementById('lynx-widget-send');
  var closeBtn = document.getElementById('lynx-close-btn');
  var botNameEl = document.getElementById('lynx-bot-name');

  // ── Apply config ───────────────────────────────────────────────────────────
  function applyConfig(cfg) {
    if (cfg.name) {
      config.name = cfg.name;
      var botNameEl2 = document.getElementById('lynx-bot-name');
      if (botNameEl2) botNameEl2.textContent = cfg.name;
      btn.setAttribute('aria-label', 'Chat with ' + cfg.name);
    }
    if (cfg.primaryColor) {
      config.primaryColor = cfg.primaryColor;
      btn.style.background = cfg.primaryColor;
      var header = document.getElementById('lynx-widget-header');
      if (header) header.style.background = 'linear-gradient(135deg, ' + cfg.primaryColor + ', ' + (cfg.secondaryColor || cfg.primaryColor) + ')';
      var sendBtnEl = document.getElementById('lynx-widget-send');
      if (sendBtnEl) sendBtnEl.style.background = cfg.primaryColor;
      // Update user message bubble color
      updateUserBubbleColor(cfg.primaryColor);
    }
    if (cfg.disclaimer) {
      var discEl = document.getElementById('lynx-widget-disclaimer');
      if (discEl) { discEl.textContent = cfg.disclaimer; discEl.style.display = 'block'; }
    }
    if (cfg.welcomeMessage) {
      config.welcomeMessage = cfg.welcomeMessage;
    }
    if (cfg.placeholder && inputEl) {
      config.placeholder = cfg.placeholder;
      inputEl.placeholder = cfg.placeholder;
    }
    if (cfg.position) {
      config.position = cfg.position;
      var pos = cfg.position === 'bottom-left' ? 'left' : 'right';
      btn.className = pos;
      panel.className = (isOpen ? 'open ' : '') + pos;
    }
    if (cfg.autoOpen) {
      config.autoOpen = cfg.autoOpen;
      config.autoOpenDelay = cfg.autoOpenDelay || 5;
    }
    // Custom avatar: swap button icon and header icon if avatarUrl is set
    if (cfg.avatarUrl) {
      config.avatarUrl = cfg.avatarUrl;
      // Floating button: show custom icon (fills circle), hide default SVG
      var btnIcon = document.getElementById('lynx-btn-icon');
      var btnDefaultIcon = document.getElementById('lynx-btn-default-icon');
      if (btnIcon) {
        btnIcon.setAttribute('src', cfg.avatarUrl);
        btnIcon.style.display = 'block';
      }
      if (btnDefaultIcon) btnDefaultIcon.style.display = 'none';
      // Header avatar: show custom icon (fills circle), hide default SVG
      var headerIcon = document.getElementById('lynx-header-icon');
      var defaultIcon = document.getElementById('lynx-header-default-icon');
      if (headerIcon) {
        headerIcon.setAttribute('src', cfg.avatarUrl);
        headerIcon.style.display = 'block';
        headerIcon.style.width = '100%';
        headerIcon.style.height = '100%';
        headerIcon.style.objectFit = 'cover';
        headerIcon.style.borderRadius = '50%';
      }
      if (defaultIcon) defaultIcon.style.display = 'none';
    } else {
      config.avatarUrl = null;
    }
    // Re-render the button icon to reflect the updated avatarUrl
    if (!isOpen) renderBtnIcon();
  }

  function updateUserBubbleColor(color) {
    var existing = document.getElementById('lynx-user-bubble-style');
    if (existing) existing.remove();
    var s = document.createElement('style');
    s.id = 'lynx-user-bubble-style';
    s.textContent = '.lynx-msg.user { background: ' + color + ' !important; }';
    document.head.appendChild(s);
  }

  // ── Initial button render ──────────────────────────────────────────────────
  btn.style.background = config.primaryColor;

  var header = document.getElementById('lynx-widget-header');
  if (header) header.style.background = 'linear-gradient(135deg, ' + config.primaryColor + ', ' + config.secondaryColor + ')';
  var sendBtnEl = document.getElementById('lynx-widget-send');
  if (sendBtnEl) sendBtnEl.style.background = config.primaryColor;
  updateUserBubbleColor(config.primaryColor);

  // ── Lead capture form ─────────────────────────────────────────────────────

  // ── Rating card ────────────────────────────────────────────────────────────
  function showRatingBubble() {
    if (ratingShown || document.getElementById('lynx-rating-stars')) return;
    ratingShown = true;
    var bubble = document.createElement('div');
    bubble.className = 'lynx-msg assistant lynx-rating-bubble';
    bubble.innerHTML = '<p>&#11088; Rate your experience / Califica tu experiencia</p>' +
      '<div id="lynx-rating-stars">' +
        '<span class="lynx-star" data-v="1">&#9733;</span>' +
        '<span class="lynx-star" data-v="2">&#9733;</span>' +
        '<span class="lynx-star" data-v="3">&#9733;</span>' +
        '<span class="lynx-star" data-v="4">&#9733;</span>' +
        '<span class="lynx-star" data-v="5">&#9733;</span>' +
      '</div>' +
      '<div id="lynx-rating-thanks" style="display:none;">&#10084;&#65039; Thank you! / &#161;Gracias!</div>';
    if (messagesEl) {
      messagesEl.appendChild(bubble);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    var stars = bubble.querySelectorAll('.lynx-star');
    stars.forEach(function(star) {
      star.addEventListener('mouseenter', function() {
        var v = parseInt(star.getAttribute('data-v'));
        stars.forEach(function(s, i) { s.classList.toggle('active', i < v); });
      });
      star.addEventListener('mouseleave', function() {
        stars.forEach(function(s) { s.classList.remove('active'); });
      });
      star.addEventListener('click', function() {
        var rating = parseInt(star.getAttribute('data-v'));
        stars.forEach(function(s, i) { s.classList.toggle('active', i < rating); s.style.cursor = 'default'; s.style.pointerEvents = 'none'; });
        var thanks = document.getElementById('lynx-rating-thanks');
        if (thanks) thanks.style.display = 'block';
        // Persist the transcript so the rating lands on the right conversation
        if (conversationId) {
          var msgs = history.map(function(m, i) { return { role: m.role, content: m.content, timestamp: m.timestamp || (Date.now() - (history.length - i) * 1000) }; });
          fetch(BASE_URL + '/api/widget/save-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: API_KEY, conversationId: conversationId, messages: msgs }),
          }).catch(function() {});
        }
        fetch(BASE_URL + '/api/widget/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: API_KEY, rating: rating, pageUrl: window.location.href, visitorId: visitorId }),
        }).catch(function() {});
        trackEvent('rating_given');
      });
    });
  }

  // ── Load config from API ───────────────────────────────────────────────────
  function loadConfig() {
    fetch(BASE_URL + '/api/widget/config?apiKey=' + encodeURIComponent(API_KEY))
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(cfg) {
        if (cfg) {
          applyConfig(cfg);
          configLoaded = true;
          // Restore previous conversation (same visitor, active window) — then
          // fall back to the welcome message for brand-new visitors.
          fetch(BASE_URL + '/api/widget/history?apiKey=' + encodeURIComponent(API_KEY) + '&visitorId=' + encodeURIComponent(visitorId))
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(h) {
              if (h && h.messages && h.messages.length > 0 && messagesEl && messagesEl.children.length === 0) {
                for (var mi = 0; mi < h.messages.length; mi++) {
                  var pm = h.messages[mi];
                  addMessage(pm.role, pm.content);
                  history.push({ role: pm.role, content: pm.content });
                }
                messageCount += h.messages.length;
                if (h.conversationId) conversationId = h.conversationId;
              } else if (messagesEl && messagesEl.children.length === 0) {
                addMessage('assistant', config.welcomeMessage, 'welcome');
                messageCount++;
              }
            })
            .catch(function() {
              if (messagesEl && messagesEl.children.length === 0) {
                addMessage('assistant', config.welcomeMessage, 'welcome');
                messageCount++;
              }
            });
          // Auto-open: always open after 3 seconds on first visit
          if (!isOpen) {
            var delay = (cfg.autoOpen !== false) ? ((cfg.autoOpenDelay || 3) * 1000) : 3000;
            setTimeout(function() { if (!isOpen) openPanel(); }, delay);
          }
        }
      })
      .catch(function(e) {
        console.warn('[Lynx AI Widget] Could not load config:', e);
        configLoaded = true;
        if (messagesEl && messagesEl.children.length === 0) {
          addMessage('assistant', config.welcomeMessage, 'welcome');
          messageCount++;
        }
        // Auto-open even on config error
        setTimeout(function() { if (!isOpen) openPanel(); }, 3000);
      });
  }

  // ── Message helpers ────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // Convert URLs into clickable links; image URLs render inline as product photos.
  function renderRichText(el, text) {
    var urlRe = /(https?:\\/\\/[^\\s<>"')]+)/g;
    var html = escapeHtml(text).replace(urlRe, function(u) {
      if (/\\.(png|jpe?g|webp|gif)(\\?|$)/i.test(u)) {
        return '<img class="lynx-product-img" src="' + u + '" alt="" loading="lazy" />';
      }
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>';
    });
    el.innerHTML = html;
  }

  // Insert restored messages ABOVE the current thread (cross-device continuity)
  function prependMessages(msgs) {
    if (!messagesEl || !msgs || !msgs.length) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < msgs.length; i++) {
      var d = document.createElement('div');
      d.className = 'lynx-msg ' + msgs[i].role;
      if (msgs[i].role === 'assistant') { renderRichText(d, msgs[i].content); } else { d.textContent = msgs[i].content; }
      frag.appendChild(d);
    }
    var sep = document.createElement('div');
    sep.style.cssText = 'text-align:center;font-size:10.5px;color:#9ca3af;padding:6px 0;';
    sep.textContent = '· · ·';
    frag.appendChild(sep);
    messagesEl.insertBefore(frag, messagesEl.firstChild);
    // prepend to history for LLM context too
    for (var j = msgs.length - 1; j >= 0; j--) {
      history.unshift({ role: msgs[j].role, content: msgs[j].content });
    }
  }

  function addMessage(role, text, extraClass) {
    var div = document.createElement('div');
    div.className = 'lynx-msg ' + role + (extraClass ? ' ' + extraClass : '');
    if (role === 'assistant') { renderRichText(div, text); } else { div.textContent = text; }
    if (messagesEl) {
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    return div;
  }
  // Typewriter effect: streams text char by char into a message bubble
  function typewriterMessage(text, onDone) {
    var div = document.createElement('div');
    div.className = 'lynx-msg assistant';
    div.textContent = '';
    if (messagesEl) {
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    var i = 0;
    var speed = Math.max(12, Math.min(28, Math.floor(2200 / text.length))); // adaptive speed
    function tick() {
      if (i < text.length) {
        div.textContent += text.charAt(i);
        i++;
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
        setTimeout(tick, speed);
      } else {
        renderRichText(div, text);
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
        if (onDone) onDone();
      }
    }
    tick();
    return div;
  }

  // Remove any existing quick reply buttons
  function clearQuickReplies() {
    var existing = document.getElementById('lynx-quick-replies');
    if (existing) existing.remove();
  }

  // Render quick reply buttons below the last assistant message
  function showQuickReplies(replies) {
    clearQuickReplies();
    if (!replies || replies.length === 0 || !messagesEl) return;
    var container = document.createElement('div');
    container.className = 'lynx-quick-replies';
    container.id = 'lynx-quick-replies';
    replies.forEach(function(text) {
      var btn2 = document.createElement('button');
      btn2.className = 'lynx-qr-btn';
      btn2.textContent = text;
      btn2.addEventListener('click', function() {
        clearQuickReplies();
        if (inputEl) {
          inputEl.value = text;
          sendMessage();
        }
      });
      container.appendChild(btn2);
    });
    messagesEl.appendChild(container);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'lynx-typing';
    div.id = 'lynx-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    if (messagesEl) {
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function hideTyping() {
    var el = document.getElementById('lynx-typing-indicator');
    if (el) el.remove();
  }

  // ── Open / close ───────────────────────────────────────────────────────────
  var _bodyOverflow = '';
  function lockPageScroll() {
    // On mobile the panel is fullscreen — freeze the page behind it so
    // chat scrolling can never move the site underneath (Intercom-style).
    if (window.matchMedia && window.matchMedia('(max-width: 480px)').matches) {
      _bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
    }
  }
  function unlockPageScroll() {
    document.body.style.overflow = _bodyOverflow || '';
    document.documentElement.style.overscrollBehavior = '';
  }

  function openPanel() {
    isOpen = true;
    panel.classList.add('open');
    lockPageScroll();
    trackEvent('chat_open');
    // Show X icon when open, keep logo visible
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    if (!configLoaded) {
      loadConfig();
    } else {
      if (messagesEl && messagesEl.children.length === 0) {
        addMessage('assistant', config.welcomeMessage, 'welcome');
        messageCount++;
      }
    }
    if (inputEl) inputEl.focus();
  }

  function renderBtnIcon() {
    // Render the button icon based on current config.avatarUrl
    if (config.avatarUrl) {
      btn.innerHTML = '<div id="lynx-btn-inner" style="width:100%;height:100%;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
        '<img id="lynx-btn-icon" src="' + config.avatarUrl + '" alt="Chat" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />' +
        '</div>';
    } else {
      btn.innerHTML = '<div id="lynx-btn-inner" style="width:100%;height:100%;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
        '<svg id="lynx-btn-default-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
        '</div>';
    }
  }

  function closePanel() {
    unlockPageScroll();
    isOpen = false;
    panel.classList.remove('open');
    // Restore the custom icon (or default) — never hardcode Lynx AI icon here
    renderBtnIcon();
  }

  btn.addEventListener('click', function() {
    if (isOpen) closePanel(); else openPanel();
  });
  // Propagate wheel events from the button to the page so the page scrolls normally
  btn.addEventListener('wheel', function(e) {
    e.preventDefault();
    window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: 'auto' });
  }, { passive: false });
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // ── Send message (streaming SSE) ─────────────────────────────────────────
  function sendMessage() {
    if (!inputEl || isLoading) return;
    var text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = '';
    inputEl.style.height = 'auto';
    clearQuickReplies();
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    trackEvent('message_sent');
    // Farewell detection (es/en): after the bot replies, offer the star rating in-thread
    if (/\b(gracias|muchas gracias|thank you|thanks|bye|adios|adi\u00f3s|chao|chau|hasta luego|nos vemos|eso es todo|that'?s all|perfecto,? gracias)\b/i.test(text)) {
      farewellDetected = true;
    }
    isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    showTyping();

    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e) {}

    // Create the assistant bubble early (will be filled token by token)
    var assistantDiv = null;
    var accumulatedReply = '';

    fetch(BASE_URL + '/api/widget/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        message: text,
        history: history.slice(-20),
        pageUrl: window.location.href,
        visitorId: visitorId,
        visitorTimezone: tz,
      }),
    }).then(function(res) {
      if (!res.ok || !res.body) {
        throw new Error('Stream request failed: ' + res.status);
      }
      hideTyping();
      // Create the message bubble
      assistantDiv = document.createElement('div');
      assistantDiv.className = 'lynx-msg assistant';
      assistantDiv.textContent = '';
      if (messagesEl) {
        messagesEl.appendChild(assistantDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var sseBuffer = '';

      function pump() {
        return reader.read().then(function(result) {
          if (result.done) return;
          sseBuffer += decoder.decode(result.value, { stream: true });
          var lines = sseBuffer.split('\\n');
          sseBuffer = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line.startsWith('data: ')) continue;
            var raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              var evt = JSON.parse(raw);
              if (evt.restored) {
                prependMessages(evt.restored);
              } else if (evt.token) {
                accumulatedReply += evt.token;
                if (assistantDiv) {
                  assistantDiv.textContent = accumulatedReply;
                  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
                }
              } else if (evt.done) {
                // Stream finished — render final text with links & product images
                if (assistantDiv) renderRichText(assistantDiv, accumulatedReply);
                history.push({ role: 'assistant', content: accumulatedReply });
                messageCount++;
                if (evt.quickReplies && evt.quickReplies.length > 0) {
                  showQuickReplies(evt.quickReplies);
                }
                if (farewellDetected && !ratingShown) {
                  setTimeout(showRatingBubble, 800);
                }
                isLoading = false;
                if (sendBtn) sendBtn.disabled = false;
                if (inputEl) inputEl.focus();
                // Save messages
                if (conversationId) {
                  var msgs = history.map(function(m, idx) { return { role: m.role, content: m.content, timestamp: m.timestamp || (Date.now() - (history.length - idx) * 1000) }; });
                  fetch(BASE_URL + '/api/widget/save-messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: API_KEY, conversationId: conversationId, messages: msgs }),
                  }).catch(function() {});
                }
              } else if (evt.error) {
                if (assistantDiv) assistantDiv.textContent = 'Sorry, there was an error. Please try again.';
                isLoading = false;
                if (sendBtn) sendBtn.disabled = false;
              }
            } catch(e) { /* malformed event, skip */ }
          }
          return pump();
        });
      }

      return pump();
    }).catch(function(err) {
      hideTyping();
      // Fallback to non-streaming endpoint
      fetch(BASE_URL + '/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY, message: text, history: history.slice(-20), pageUrl: window.location.href, visitorId: visitorId, visitorTimezone: tz }),
      }).then(function(r) { return r.json(); }).then(function(data) {
        hideTyping();
        if (data.restoredMessages) prependMessages(data.restoredMessages);
        var reply = data.reply || 'Sorry, I could not process your request.';
        history.push({ role: 'assistant', content: reply });
        messageCount++;
        typewriterMessage(reply, function() {
          if (data.quickReplies && data.quickReplies.length > 0) showQuickReplies(data.quickReplies);
          if (farewellDetected && !ratingShown) setTimeout(showRatingBubble, 800);
          isLoading = false;
          if (sendBtn) sendBtn.disabled = false;
          if (inputEl) inputEl.focus();
        });
      }).catch(function() {
        hideTyping();
        addMessage('assistant', 'Sorry, there was an error. Please try again.');
        isLoading = false;
        if (sendBtn) sendBtn.disabled = false;
      });
    });
  }

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);

  if (inputEl) {
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    // Auto-resize textarea
    inputEl.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });
  }

  // ── Preload config on page load (so it's ready when opened) ───────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { loadConfig(); trackEvent('page_view'); });
  } else {
    loadConfig();
    trackEvent('page_view');
  }

  // Public API: window.LynxAI.hide() / show()
  window.LynxAI = {
    hide: function() {
      if (btn) btn.style.display = 'none';
      if (panel) { panel.style.display = 'none'; isOpen = false; }
    },
    show: function() {
      if (btn) btn.style.display = '';
      if (panel) panel.style.display = '';
    },
  };

})();
`.trim();
}
