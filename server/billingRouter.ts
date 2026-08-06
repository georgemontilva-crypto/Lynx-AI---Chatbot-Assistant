/**
 * Billing REST API — PayPal Subscriptions
 *
 * POST /api/billing/create-subscription  — creates a PayPal subscription and returns approval URL
 * POST /api/billing/webhook              — receives PayPal webhook events (no auth required)
 * POST /api/billing/cancel               — cancels the current subscription (requires session)
 * GET  /api/billing/status               — returns current subscription status (requires session)
 */

import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb, getUserById } from "./db";
import { users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import {
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentReceiptEmail,
} from "./email";
import { sdk } from "./_core/sdk";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../drizzle/schema";

// Dual-auth helper: tries local JWT first, then Manus OAuth
async function authenticateAny(req: Request): Promise<User | null> {
  // 1. Try local JWT
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  let token = cookies[COOKIE_NAME];
  if (!token) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }
  if (token) {
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload.userId === "number") {
        const user = await getUserById(payload.userId);
        if (user) return user;
      }
    } catch { /* fall through */ }
  }
  // 2. Try Manus OAuth
  try {
    return await sdk.authenticateRequest(req) as User;
  } catch {
    return null;
  }
}

// ─── PayPal helpers ───────────────────────────────────────────────────────────

const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalToken(): Promise<string> {
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// ─── PayPal webhook signature verification ───────────────────────────────────
async function verifyPayPalWebhook(
  req: Request,
  webhookId: string
): Promise<boolean> {
  try {
    const token = await getPayPalToken();
    const headers = req.headers;
    const body = JSON.stringify(req.body);
    const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: req.body,
      }),
    });
    if (!verifyRes.ok) return false;
    const result = (await verifyRes.json()) as { verification_status: string };
    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[Billing] Webhook signature verification error:", err);
    return false;
  }
}

const PLAN_MAP: Record<string, string> = {
  cloud: ENV.paypalPlanCloud,
  embedded: ENV.paypalPlanEmbedded,
  whitelabel: ENV.paypalPlanWhitelabel,
  // TEST PLAN — $1/month, maps to embedded. DELETE after testing.
  test: "P-45G89602V1974512YNJNPHAI",
};

// Reverse map: planId -> plan name (includes test plan)
const TEST_PLAN_ID_TO_PLAN: Record<string, string> = {
  "P-45G89602V1974512YNJNPHAI": "embedded",
};

const PLAN_NAMES: Record<string, string> = {
  cloud: "Cloud AI — $199/mo",
  embedded: "Embedded AI — $399/mo",
  whitelabel: "White-Label — $499/mo",
};

const PLAN_AMOUNTS: Record<string, string> = {
  cloud: "$199.00",
  embedded: "$399.00",
  whitelabel: "$499.00",
};

// ─── Register billing routes ──────────────────────────────────────────────────

export function registerBillingRoutes(app: Express) {
  // POST /api/billing/create-subscription
  // Body: { plan: "cloud" | "embedded" | "whitelabel" }
  // Requires session cookie
  app.post("/api/billing/create-subscription", async (req: Request, res: Response) => {
    try {
      const user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { plan } = req.body ?? {};
      if (!plan || !PLAN_MAP[plan]) {
        return res.status(400).json({ error: "Invalid plan. Must be cloud, embedded, or whitelabel" });
      }

      const planId = PLAN_MAP[plan];
      if (!planId) {
        return res.status(500).json({ error: "Plan ID not configured" });
      }

      const token = await getPayPalToken();

      // Determine return/cancel URLs
      const baseUrl = req.headers.origin ?? "https://lynxaiassistant.com";
      const returnUrl = `${baseUrl}/dashboard/billing?success=1&plan=${plan}`;
      const cancelUrl = `${baseUrl}/dashboard/billing?cancelled=1`;

      const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          plan_id: planId,
          subscriber: {
            name: { given_name: user.name ?? "User" },
            email_address: user.email ?? undefined,
          },
          application_context: {
            brand_name: "Lynx AI",
            locale: "en-US",
            shipping_preference: "NO_SHIPPING",
            user_action: "SUBSCRIBE_NOW",
            payment_method: {
              payer_selected: "PAYPAL",
              payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
            },
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      if (!subRes.ok) {
        const err = await subRes.text();
        console.error("[Billing] PayPal subscription creation failed:", err);
        return res.status(500).json({ error: "Failed to create subscription" });
      }

      const sub = (await subRes.json()) as {
        id: string;
        status: string;
        links: Array<{ rel: string; href: string }>;
      };

      const approvalLink = sub.links.find((l) => l.rel === "approve")?.href;
      if (!approvalLink) {
        return res.status(500).json({ error: "No approval URL returned from PayPal" });
      }

      // Save pending subscription ID to user record
      const db = await getDb();
      if (db) {
        await db
          .update(users)
          .set({
            subscriptionId: sub.id,
            subscriptionStatus: "pending",
            subscriptionPlanId: planId,
          })
          .where(eq(users.id, user.id));
      }

      return res.json({ approvalUrl: approvalLink, subscriptionId: sub.id });
    } catch (err) {
      console.error("[Billing] create-subscription error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/billing/create-web-setup-order
  // Creates a PayPal one-time order for the $199 Web Setup Service
  app.post("/api/billing/create-web-setup-order", async (req: Request, res: Response) => {
    try {
      const user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { requestId } = req.body ?? {};
      if (!requestId || typeof requestId !== "number") {
        return res.status(400).json({ error: "requestId is required" });
      }

      const token = await getPayPalToken();
      const baseUrl = req.headers.origin ?? "https://lynxaiassistant.com";
      const returnUrl = `${baseUrl}/dashboard/web-setup?payment=success&requestId=${requestId}`;
      const cancelUrl = `${baseUrl}/dashboard/web-setup?payment=cancelled`;

      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: "199.00" },
            description: "Lynx AI — Professional Website Setup Service",
          }],
          application_context: {
            brand_name: "Lynx AI",
            locale: "en-US",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.text();
        console.error("[Billing] PayPal order creation failed:", err);
        return res.status(500).json({ error: "Failed to create PayPal order" });
      }

      const order = (await orderRes.json()) as {
        id: string;
        links: Array<{ rel: string; href: string }>;
      };

      const approvalLink = order.links.find((l) => l.rel === "approve")?.href;
      if (!approvalLink) {
        return res.status(500).json({ error: "No approval URL returned from PayPal" });
      }

      // Save orderId to the web_setup_request row
      const db = await getDb();
      if (db) {
        const { webSetupRequests } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await db.update(webSetupRequests)
          .set({ paypalOrderId: order.id })
          .where(eqOp(webSetupRequests.id, requestId));
      }

      return res.json({ approvalUrl: approvalLink, orderId: order.id });
    } catch (err) {
      console.error("[Billing] create-web-setup-order error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/billing/capture-web-setup-order
  // Captures the PayPal one-time order after user approves it
  app.post("/api/billing/capture-web-setup-order", async (req: Request, res: Response) => {
    try {
      const user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { orderId, requestId } = req.body ?? {};
      if (!orderId || !requestId) {
        return res.status(400).json({ error: "orderId and requestId are required" });
      }

      const token = await getPayPalToken();
      const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!captureRes.ok) {
        const err = await captureRes.text();
        console.error("[Billing] PayPal capture failed:", err);
        return res.status(500).json({ error: "Failed to capture payment" });
      }

      const capture = (await captureRes.json()) as { status: string };
      if (capture.status !== "COMPLETED") {
        return res.status(400).json({ error: `Payment not completed: ${capture.status}` });
      }

      // Mark request as paid
      const db = await getDb();
      if (db) {
        const { webSetupRequests } = await import("../drizzle/schema");
        const { eq: eqOp } = await import("drizzle-orm");
        await db.update(webSetupRequests)
          .set({ paidAt: new Date(), status: "in_progress" })
          .where(eqOp(webSetupRequests.id, Number(requestId)));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[Billing] capture-web-setup-order error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/billing/create-test-subscription
  // TEST ONLY — $1/month plan that grants Embedded AI. DELETE AFTER TESTING.
  app.post("/api/billing/create-test-subscription", async (req: Request, res: Response) => {
    try {
      const user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const TEST_PLAN_ID = "P-45G89602V1974512YNJNPHAI";
      const token = await getPayPalToken();
      const baseUrl = req.headers.origin ?? "https://lynxaiassistant.com";
      const returnUrl = `${baseUrl}/test-payment?success=1`;
      const cancelUrl = `${baseUrl}/test-payment?cancelled=1`;

      const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          plan_id: TEST_PLAN_ID,
          subscriber: {
            name: { given_name: user.name ?? "User" },
            email_address: user.email ?? undefined,
          },
          application_context: {
            brand_name: "Lynx AI",
            locale: "en-US",
            shipping_preference: "NO_SHIPPING",
            user_action: "SUBSCRIBE_NOW",
            payment_method: { payer_selected: "PAYPAL", payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED" },
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      if (!subRes.ok) {
        const err = await subRes.text();
        console.error("[TestBilling] PayPal error:", err);
        return res.status(500).json({ error: "Failed to create test subscription" });
      }

      const sub = (await subRes.json()) as {
        id: string;
        status: string;
        links: Array<{ rel: string; href: string }>;
      };

      const approvalLink = sub.links.find((l) => l.rel === "approve")?.href;
      if (!approvalLink) return res.status(500).json({ error: "No approval URL" });

      const db = await getDb();
      if (db) {
        await db.update(users).set({
          subscriptionId: sub.id,
          subscriptionStatus: "pending",
          subscriptionPlanId: TEST_PLAN_ID,
        }).where(eq(users.id, user.id));
      }

      return res.json({ approvalUrl: approvalLink, subscriptionId: sub.id });
    } catch (err) {
      console.error("[TestBilling] error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

    // POST /api/billing/webhook
  // Receives PayPal webhook events — no auth required (PayPal signs the payload)
  app.post("/api/billing/webhook", async (req: Request, res: Response) => {
    try {
      // ── Verify PayPal webhook signature when WEBHOOK_ID is configured ───────
      const webhookId = ENV.paypalWebhookId;
      if (webhookId) {
        const isValid = await verifyPayPalWebhook(req, webhookId);
        if (!isValid) {
          console.warn("[Billing] Webhook signature verification failed");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
      } else {
        console.warn("[Billing] PAYPAL_WEBHOOK_ID not set — skipping signature verification");
      }
      const event = req.body as {
        event_type: string;
        resource: Record<string, unknown>;
      };
      console.log("[Billing] Webhook received:", event.event_type);

      const db = await getDb();
      if (!db) return res.status(200).json({ received: true });

      switch (event.event_type) {
        case "BILLING.SUBSCRIPTION.ACTIVATED": {
          const sub = event.resource as {
            id: string;
            plan_id: string;
            subscriber?: { email_address?: string; name?: { given_name?: string } };
            billing_info?: { next_billing_time?: string };
          };

          // Find user by subscriptionId
          const rows = await db
            .select()
            .from(users)
            .where(eq(users.subscriptionId, sub.id))
            .limit(1);
          const user = rows[0];
          if (!user) break;

          // Map planId back to plan name (check test plan map first, then regular map)
          const plan =
            TEST_PLAN_ID_TO_PLAN[sub.plan_id] ??
            Object.entries(PLAN_MAP).find(([, id]) => id === sub.plan_id)?.[0] ??
            "cloud";

          const nextBilling = sub.billing_info?.next_billing_time
            ? new Date(sub.billing_info.next_billing_time)
            : undefined;

          await db
            .update(users)
            .set({
              plan: plan as "cloud" | "embedded" | "whitelabel",
              subscriptionStatus: "active",
              subscriptionPlanId: sub.plan_id,
              ...(nextBilling ? { nextBillingDate: nextBilling } : {}),
            })
            .where(eq(users.id, user.id));

          // Send welcome + receipt emails
          if (user.email) {
            const activatedAt = new Date().toLocaleDateString("es-MX", {
              year: "numeric", month: "long", day: "numeric",
            });
            await sendWelcomeEmail(user.email, user.name ?? "", plan);
            await sendPaymentReceiptEmail(
              user.email,
              user.name ?? "",
              plan,
              "",
              sub.id,
              activatedAt
            ).catch(() => {});
          }
          break;
        }

        case "PAYMENT.SALE.COMPLETED": {
          const sale = event.resource as {
            billing_agreement_id?: string;
            amount?: { total?: string; currency?: string };
          };

          if (!sale.billing_agreement_id) break;

          const rows = await db
            .select()
            .from(users)
            .where(eq(users.subscriptionId, sale.billing_agreement_id))
            .limit(1);
          const user = rows[0];
          if (!user) break;

          const amount = sale.amount?.total
            ? `$${sale.amount.total} ${sale.amount.currency ?? "USD"}`
            : "N/A";

          if (user.email) {
            const nextDate = user.nextBillingDate
              ? new Date(user.nextBillingDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : "Next month";
            await sendPaymentConfirmationEmail(
              user.email,
              user.name ?? "",
              PLAN_NAMES[user.plan] ?? user.plan,
              amount,
              nextDate
            );
          }
          break;
        }

        case "BILLING.SUBSCRIPTION.CANCELLED":
        case "BILLING.SUBSCRIPTION.EXPIRED":
        case "BILLING.SUBSCRIPTION.SUSPENDED": {
          const sub = event.resource as { id: string };

          const rows = await db
            .select()
            .from(users)
            .where(eq(users.subscriptionId, sub.id))
            .limit(1);
          const user = rows[0];
          if (!user) break;

          const status =
            event.event_type === "BILLING.SUBSCRIPTION.CANCELLED"
              ? "cancelled"
              : event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED"
              ? "suspended"
              : "expired";

          await db
            .update(users)
            .set({ subscriptionStatus: status as "cancelled" | "suspended" | "expired" })
            .where(eq(users.id, user.id));

          if (status === "cancelled" && user.email) {
            await sendSubscriptionCancelledEmail(
              user.email,
              user.name ?? "",
              PLAN_NAMES[user.plan] ?? user.plan
            );
          }
          break;
        }

        case "BILLING.SUBSCRIPTION.UPDATED": {
          const sub = event.resource as {
            id: string;
            plan_id?: string;
            billing_info?: { next_billing_time?: string };
          };

          const rows = await db
            .select()
            .from(users)
            .where(eq(users.subscriptionId, sub.id))
            .limit(1);
          const user = rows[0];
          if (!user) break;

          const nextBilling = sub.billing_info?.next_billing_time
            ? new Date(sub.billing_info.next_billing_time)
            : undefined;

          if (sub.plan_id) {
            const plan =
              Object.entries(PLAN_MAP).find(([, id]) => id === sub.plan_id)?.[0] ?? user.plan;
            await db
              .update(users)
              .set({
                plan: plan as "cloud" | "embedded" | "whitelabel",
                subscriptionPlanId: sub.plan_id,
                ...(nextBilling ? { nextBillingDate: nextBilling } : {}),
              })
              .where(eq(users.id, user.id));
          }
          break;
        }

        default:
          console.log("[Billing] Unhandled webhook event:", event.event_type);
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error("[Billing] Webhook error:", err);
      return res.status(200).json({ received: true }); // Always 200 to PayPal
    }
  });

  // POST /api/billing/cancel
  // Cancels the current PayPal subscription
  app.post("/api/billing/cancel", async (req: Request, res: Response) => {
    try {
      const user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      if (!user.subscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const token = await getPayPalToken();

      const cancelRes = await fetch(
        `${PAYPAL_BASE}/v1/billing/subscriptions/${user.subscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: "User requested cancellation" }),
        }
      );

      if (!cancelRes.ok && cancelRes.status !== 422) {
        const err = await cancelRes.text();
        console.error("[Billing] Cancel failed:", err);
        return res.status(500).json({ error: "Failed to cancel subscription" });
      }

      // Update DB
      const db = await getDb();
      if (db) {
        await db
          .update(users)
          .set({ subscriptionStatus: "cancelled" })
          .where(eq(users.id, user.id));
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("[Billing] cancel error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/billing/verify-subscription
  // Queries PayPal directly to check if the subscription is ACTIVE and updates the DB.
  // Called by the frontend after returning from PayPal approval page.
  app.post("/api/billing/verify-subscription", async (req: Request, res: Response) => {
    try {
      const user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      if (!user.subscriptionId) {
        return res.status(400).json({ error: "No subscription found" });
      }

      const token = await getPayPalToken();
      const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${user.subscriptionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!subRes.ok) {
        const err = await subRes.text();
        console.error("[Billing] verify-subscription PayPal error:", err);
        return res.status(500).json({ error: "Failed to query PayPal" });
      }

      const sub = (await subRes.json()) as {
        id: string;
        status: string;
        plan_id: string;
        billing_info?: { next_billing_time?: string };
        subscriber?: { email_address?: string };
      };

      console.log(`[Billing] verify-subscription: PayPal status=${sub.status} for user=${user.id}`);

      if (sub.status === "ACTIVE") {
        const plan =
          TEST_PLAN_ID_TO_PLAN[sub.plan_id] ??
          Object.entries(PLAN_MAP).find(([, id]) => id === sub.plan_id)?.[0] ??
          "cloud";

        const nextBilling = sub.billing_info?.next_billing_time
          ? new Date(sub.billing_info.next_billing_time)
          : undefined;

        const db = await getDb();
        if (db) {
          await db.update(users).set({
            plan: plan as "cloud" | "embedded" | "whitelabel",
            subscriptionStatus: "active",
            subscriptionPlanId: sub.plan_id,
            ...(nextBilling ? { nextBillingDate: nextBilling } : {}),
          }).where(eq(users.id, user.id));
        }

        // Send welcome + receipt emails if this is the first activation
        if (user.subscriptionStatus !== "active" && user.email) {
          const activatedAt = new Date().toLocaleDateString("es-MX", {
            year: "numeric", month: "long", day: "numeric",
          });
          await sendWelcomeEmail(user.email, user.name ?? "", plan).catch(() => {});
          await sendPaymentReceiptEmail(
            user.email,
            user.name ?? "",
            plan,
            "",
            user.subscriptionId ?? sub.id,
            activatedAt
          ).catch(() => {});
        }

        return res.json({ activated: true, plan, status: "active" });
      }

      return res.json({ activated: false, status: sub.status.toLowerCase() });
    } catch (err) {
      console.error("[Billing] verify-subscription error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/billing/status
  // Returns current subscription status for the logged-in user
  app.get("/api/billing/status", async (req: Request, res: Response) => {
    try {
      // Support both local JWT auth and Manus OAuth
      let user = await authenticateAny(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      return res.json({
        plan: user.plan,
        subscriptionId: user.subscriptionId ?? null,
        subscriptionStatus: user.subscriptionStatus ?? null,
        subscriptionPlanId: user.subscriptionPlanId ?? null,
        nextBillingDate: user.nextBillingDate ?? null,
        createdAt: user.createdAt ?? null,
      });
    } catch (err) {
      console.error("[Billing] status error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}
