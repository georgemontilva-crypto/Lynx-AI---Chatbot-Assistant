import webpush from "web-push";
import { getDb } from "./db";
import { pushSubscriptions, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

// Configure VAPID details once
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@lynxaiassistant.com",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  /** Event type used to check user preferences before sending */
  eventType?: "newLead" | "lowRating" | "usageLimit";
}

/**
 * Send a push notification to all subscriptions for a given user.
 * Respects the user's push notification preferences (pushPrefs column).
 * Automatically removes expired/invalid subscriptions.
 */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[Push] VAPID keys not configured, skipping push notification");
    return;
  }

  const db = await getDb();
  if (!db) return;

  // Check user preferences if an eventType is specified
  if (payload.eventType) {
    const userRow = await db
      .select({ pushPrefs: users.pushPrefs })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const prefs = userRow[0]?.pushPrefs;
    // Default is enabled (null prefs = all on)
    const isEnabled = prefs ? prefs[payload.eventType] !== false : true;
    if (!isEnabled) {
      console.log(`[Push] User ${userId} has disabled ${payload.eventType} notifications, skipping`);
      return;
    }
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subscriptions.length === 0) return;

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icon-192x192.png",
    badge: payload.badge ?? "/icon-192x192.png",
    url: payload.url ?? "/dashboard",
    tag: payload.tag ?? "lynx-notification",
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub: typeof pushSubscriptions.$inferSelect) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          notification
        );
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          const db2 = await getDb();
          if (db2) await db2
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id));
          console.log(`[Push] Removed expired subscription ${sub.id} for user ${userId}`);
        } else {
          throw err;
        }
      }
    })
  );

  const failed = results.filter((r: PromiseSettledResult<void>) => r.status === "rejected");
  if (failed.length > 0) {
    console.warn(`[Push] ${failed.length} push(es) failed for user ${userId}`);
  }
}

/**
 * Save a new push subscription for a user.
 * Replaces existing subscription with the same endpoint.
 */
export async function savePushSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Remove any existing subscription with the same endpoint
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  await db.insert(pushSubscriptions).values({
    userId,
    endpoint,
    p256dh,
    auth,
    userAgent: userAgent ?? null,
  });
}

/**
 * Remove a push subscription by endpoint.
 */
export async function removePushSubscription(userId: number, endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * Check if a user has any active push subscriptions.
 */
export async function userHasPushSubscription(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const subs = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);
  return subs.length > 0;
}
