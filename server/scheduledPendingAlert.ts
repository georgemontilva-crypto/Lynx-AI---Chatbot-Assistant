/**
 * POST /api/scheduled/pending-subscription-alert
 *
 * Called by the Heartbeat cron every hour.
 * Detects users whose subscriptionStatus is "pending" for more than 1 hour,
 * tries to verify them directly with PayPal, and if still pending sends an
 * alert email to the admin.
 */

import type { Request, Response } from "express";
import { lt, eq, and, isNotNull } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { sendPendingSubscriptionAlertEmail } from "./email";

const PAYPAL_BASE = "https://api-m.paypal.com";
const ADMIN_EMAIL = "sales@lynxaiassistant.com";

async function getPayPalToken(): Promise<string | null> {
  try {
    const credentials = Buffer.from(
      `${ENV.paypalClientId}:${ENV.paypalClientSecret}`
    ).toString("base64");
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  } catch {
    return null;
  }
}

export async function pendingSubscriptionAlertHandler(req: Request, res: Response) {
  try {
    // ── Auth: only Manus scheduled cron tasks may call this endpoint ──────
    let caller;
    try {
      caller = await sdk.authenticateRequest(req);
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!caller.isCron) {
      return res.status(403).json({ error: "Forbidden: only cron tasks may call this endpoint" });
    }

    const db = await getDb();
    if (!db) return res.json({ checked: 0, activated: 0, alerted: 0 });

    // Find users with pending subscription older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const pendingUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        plan: users.plan,
        subscriptionId: users.subscriptionId,
        subscriptionPlanId: users.subscriptionPlanId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.subscriptionStatus, "pending"),
          isNotNull(users.subscriptionId),
          lt(users.createdAt, oneHourAgo)
        )
      )
      .limit(50);

    if (pendingUsers.length === 0) {
      console.log("[PendingAlert] No pending subscriptions found.");
      return res.json({ checked: 0, activated: 0, alerted: 0 });
    }

    console.log(`[PendingAlert] Found ${pendingUsers.length} pending subscription(s). Checking PayPal...`);

    // Try to auto-activate via PayPal API
    const token = await getPayPalToken();
    let activated = 0;
    const stillPending: typeof pendingUsers = [];

    for (const user of pendingUsers) {
      if (!user.subscriptionId) { stillPending.push(user); continue; }

      let autoActivated = false;
      if (token) {
        try {
          const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${user.subscriptionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (subRes.ok) {
            const sub = (await subRes.json()) as {
              status: string;
              plan_id: string;
              billing_info?: { next_billing_time?: string };
            };

            if (sub.status === "ACTIVE") {
              const PLAN_MAP: Record<string, string> = {
                [ENV.paypalPlanCloud]: "cloud",
                [ENV.paypalPlanEmbedded]: "embedded",
                [ENV.paypalPlanWhitelabel]: "whitelabel",
              };
              const plan = PLAN_MAP[sub.plan_id] ?? "cloud";
              const nextBilling = sub.billing_info?.next_billing_time
                ? new Date(sub.billing_info.next_billing_time)
                : undefined;

              await db.update(users).set({
                plan: plan as "cloud" | "embedded" | "whitelabel",
                subscriptionStatus: "active",
                subscriptionPlanId: sub.plan_id,
                ...(nextBilling ? { nextBillingDate: nextBilling } : {}),
              }).where(eq(users.id, user.id));

              console.log(`[PendingAlert] Auto-activated user ${user.id} (${user.email}) to plan ${plan}`);
              activated++;
              autoActivated = true;
            }
          }
        } catch (err) {
          console.error(`[PendingAlert] PayPal check failed for user ${user.id}:`, err);
        }
      }

      if (!autoActivated) {
        stillPending.push(user);
      }
    }

    // Send alert email for users that could not be auto-activated
    let alerted = 0;
    if (stillPending.length > 0) {
      const alertList = stillPending.map(u => ({
        id: u.id,
        name: u.name ?? "Unknown",
        email: u.email ?? "",
        plan: u.plan ?? "cloud",
        subscriptionId: u.subscriptionId ?? "",
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })
          : "Unknown",
      }));

      await sendPendingSubscriptionAlertEmail(ADMIN_EMAIL, alertList);
      alerted = stillPending.length;
      console.log(`[PendingAlert] Sent alert email for ${alerted} user(s) still pending.`);
    }

    return res.json({ checked: pendingUsers.length, activated, alerted });
  } catch (err) {
    console.error("[PendingAlert] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
