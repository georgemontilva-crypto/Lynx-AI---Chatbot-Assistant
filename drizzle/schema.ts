import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  // Own auth fields
  passwordHash: text("passwordHash"),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  verificationToken: varchar("verificationToken", { length: 128 }),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
  isBanned: boolean("isBanned").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "cloud", "embedded", "whitelabel"]).default("free").notNull(),
  // White-Label expansion packs: extra client slots purchased on top of the base 15
  // 0 = base plan only (15 clients), add pack slots on top
  clientSlots: int("clientSlots").default(0).notNull(),
  // PayPal subscription fields
  subscriptionId: varchar("subscriptionId", { length: 64 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "cancelled", "suspended", "expired", "pending"]),
  subscriptionPlanId: varchar("subscriptionPlanId", { length: 64 }),
  nextBillingDate: timestamp("nextBillingDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Push notification preferences
  pushPrefs: json("pushPrefs").$type<{ newLead: boolean; lowRating: boolean; usageLimit: boolean }>(),
});

export const chatbots = mysqlTable("chatbots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  apiKey: varchar("apiKey", { length: 64 }).unique(),
  name: varchar("name", { length: 128 }).notNull().default("Lynx AI"),
  avatarUrl: text("avatarUrl"),
  disclaimer: varchar("disclaimer", { length: 300 }),
  primaryColor: varchar("primaryColor", { length: 16 }).default("#3b82f6"),
  secondaryColor: varchar("secondaryColor", { length: 16 }).default("#1e40af"),
  welcomeMessage: text("welcomeMessage").default("Hi! How can I help you today?"),
  placeholder: varchar("placeholder", { length: 256 }).default("Type your question..."),
  position: mysqlEnum("position", ["bottom-right", "bottom-left"]).default("bottom-right"),
  autoOpen: boolean("autoOpen").default(false),
  autoOpenDelay: int("autoOpenDelay").default(5),
  language: varchar("language", { length: 8 }).default("en"),
  isActive: boolean("isActive").default(true),
  // White-Label: marks chatbots created by a reseller FOR their clients (not the reseller's own site)
  isClientChatbot: boolean("isClientChatbot").default(false).notNull(),
  // Usage tracking
  messagesThisMonth: int("messagesThisMonth").default(0).notNull(),
  messagesResetAt: timestamp("messagesResetAt").defaultNow().notNull(),
  siteUrl: text("siteUrl"),
  siteContext: text("siteContext"),
  lastScannedAt: timestamp("lastScannedAt"),
  // ── Training (per-user customization) ──
  customInstructions: text("customInstructions"),
  knowledgeBase: json("knowledgeBase").$type<Array<{ title: string; content: string }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  chatbotId: int("chatbotId").notNull(),
  visitorId: varchar("visitorId", { length: 64 }),
  visitorIp: varchar("visitorIp", { length: 64 }),
  visitorCountry: varchar("visitorCountry", { length: 4 }),
  messages: json("messages").$type<Array<{ role: string; content: string; timestamp: number }>>(),
  satisfactionRating: int("satisfactionRating"),
  isLead: boolean("isLead").default(false),
  leadEmail: varchar("leadEmail", { length: 320 }),
  leadName: varchar("leadName", { length: 256 }),
  leadCompany: varchar("leadCompany", { length: 256 }),
  pageUrl: text("pageUrl"),
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const seoReports = mysqlTable("seo_reports", {
  id: int("id").autoincrement().primaryKey(),
  chatbotId: int("chatbotId").notNull(),
  siteUrl: text("siteUrl").notNull(),
  score: int("score"),
  keywords: json("keywords").$type<Array<{ keyword: string; count: number; density: number }>>(),
  suggestions: json("suggestions").$type<Array<{ type: string; priority: string; message: string; page?: string }>>(),
  topPages: json("topPages").$type<Array<{ url: string; title: string; visits: number; bounceRate: number }>>(),
  metaIssues: json("metaIssues").$type<Array<{ page: string; issue: string; severity: string }>>(),
  loadSpeed: float("loadSpeed"),
  mobileScore: int("mobileScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  chatbotId: int("chatbotId").notNull(),
  eventType: mysqlEnum("eventType", ["page_view", "chat_open", "chat_close", "message_sent", "lead_captured", "click"]).notNull(),
  pageUrl: text("pageUrl"),
  elementId: varchar("elementId", { length: 256 }),
  visitorId: varchar("visitorId", { length: 64 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["new_lead", "low_rating", "seo_issue", "scan_complete", "system"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const onboardingProgress = mysqlTable("onboarding_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  step1Done: boolean("step1Done").default(false).notNull(), // Escanear sitio
  step2Done: boolean("step2Done").default(false).notNull(), // Instalar snippet
  step3Done: boolean("step3Done").default(false).notNull(), // Probar chatbot
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(), // HTML content
  coverImageUrl: text("coverImageUrl"),
  category: varchar("category", { length: 128 }).default("General"),
  tags: json("tags").$type<string[]>().default([]),
  author: varchar("author", { length: 128 }).default("Lynx AI Team"),
  status: mysqlEnum("status", ["draft", "published"]).default("draft").notNull(),
  isAutoGenerated: boolean("isAutoGenerated").default(false).notNull(),
  readingTimeMinutes: int("readingTimeMinutes").default(5),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  siteUrl: text("siteUrl").notNull(),
  apiKey: varchar("apiKey", { length: 64 }).notNull().unique(),
  // Branding
  brandName: varchar("brandName", { length: 128 }).default("AI Assistant"),
  brandColor: varchar("brandColor", { length: 16 }).default("#3b82f6"),
  logoUrl: text("logoUrl"),
  welcomeMessage: text("welcomeMessage").default("Hi! How can I help you?"),
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const seoHistory = mysqlTable("seo_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  chatbotId: int("chatbotId").notNull(),
  siteUrl: text("siteUrl").notNull(),
  score: int("score").notNull(),
  loadSpeed: float("loadSpeed"),
  mobileScore: int("mobileScore"),
  issuesCount: int("issuesCount").default(0).notNull(),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
});

export const webSetupRequests = mysqlTable("web_setup_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Business info
  businessName: varchar("businessName", { length: 256 }).notNull(),
  businessType: varchar("businessType", { length: 128 }),
  websiteDomain: varchar("websiteDomain", { length: 256 }),
  // Branding
  primaryColor: varchar("primaryColor", { length: 16 }).default("#3b82f6"),
  secondaryColor: varchar("secondaryColor", { length: 16 }).default("#1e40af"),
  logoUrl: text("logoUrl"),
  aiIconUrl: text("aiIconUrl"),
  // AI chatbot config
  chatbotName: varchar("chatbotName", { length: 128 }),
  chatbotWelcome: text("chatbotWelcome"),
  // Additional info
  targetAudience: text("targetAudience"),
  keyPages: text("keyPages"),
  additionalNotes: text("additionalNotes"),
  // Contact
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 64 }),
  // Payment
  paypalOrderId: varchar("paypalOrderId", { length: 64 }),
  paidAt: timestamp("paidAt"),
  // Status
  status: mysqlEnum("status", ["pending", "in_progress", "delivered", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebSetupRequest = typeof webSetupRequests.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Chatbot = typeof chatbots.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type SeoHistoryEntry = typeof seoHistory.$inferSelect;
export type InsertChatbot = typeof chatbots.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type SeoReport = typeof seoReports.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

// Widget chat continuity: short-lived codes emailed to visitors so they can
// restore a previous conversation from another device/browser.
export const widgetEmailVerifications = mysqlTable("widget_email_verifications", {
  id: int("id").autoincrement().primaryKey(),
  chatbotId: int("chatbotId").notNull(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
