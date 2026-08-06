import { Router } from "express";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { savePushSubscription, removePushSubscription, userHasPushSubscription } from "./pushNotifications";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "@shared/const";

export const pushRouter = Router();

// Helper: extract userId from JWT cookie or Authorization header
async function getUserId(req: any): Promise<number | null> {
  try {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    let token = cookies[COOKIE_NAME];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) return null;

    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

// GET /api/push/vapid-public-key — returns the VAPID public key for the browser
pushRouter.get("/vapid-public-key", (_req, res) => {
  if (!ENV.vapidPublicKey) {
    return res.status(503).json({ error: "Push notifications not configured" });
  }
  res.json({ publicKey: ENV.vapidPublicKey });
});

// POST /api/push/subscribe — save a push subscription
pushRouter.post("/subscribe", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription data" });
  }

  try {
    await savePushSubscription(
      userId,
      endpoint,
      keys.p256dh,
      keys.auth,
      req.headers["user-agent"] ?? undefined
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[Push] Failed to save subscription:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/unsubscribe — remove a push subscription
pushRouter.delete("/unsubscribe", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: "Endpoint required" });
  }

  try {
    await removePushSubscription(userId, endpoint);
    res.json({ success: true });
  } catch (err) {
    console.error("[Push] Failed to remove subscription:", err);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

// GET /api/push/status — check if user has active subscriptions
pushRouter.get("/status", async (req, res) => {
  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const hasSubscription = await userHasPushSubscription(userId);
    res.json({ hasSubscription });
  } catch (err) {
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});
