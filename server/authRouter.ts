/**
 * Own authentication router — replaces Manus OAuth
 * Endpoints: register, login, logout, verify-email, forgot-password, reset-password
 */

import { Router, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import {
  getUserByEmail,
  createLocalUser,
  verifyUserEmail,
  setResetToken,
  getUserByResetToken,
  updatePassword,
  updateLastSignedIn,
} from "./db";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "./email";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { COOKIE_NAME } from "@shared/const";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const authRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

async function signSessionJwt(userId: number, email: string, name: string): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ userId, email, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + SESSION_MS) / 1000))
    .sign(secret);
}

function getOrigin(req: Request): string {
  const forwarded = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwarded) ? forwarded[0] : forwarded ?? (req.secure ? "https" : "http");
  return `${proto}://${req.headers.host}`;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

authRouter.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body ?? {};

  if (!email || !password || !name) {
    res.status(400).json({ error: "name, email and password are required" });
    return;
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateToken();
    // Use a unique openId for local users (prefix "local_" + random hex)
    const openId = "local_" + generateToken(16);

    const user = await createLocalUser({
      openId,
      name: String(name).trim(),
      email: email.toLowerCase(),
      passwordHash,
      verificationToken,
    });

    if (!user) {
      res.status(500).json({ error: "Failed to create account" });
      return;
    }

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email!, user.name ?? "", verificationToken, getOrigin(req)).catch(
      (err) => console.error("[Auth] Failed to send verification email:", err)
    );
    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email!, user.name ?? "", user.plan ?? "cloud").catch(
      (err) => console.error("[Auth] Failed to send welcome email:", err)
    );

    // Sign in immediately (no email verification gate for now — user can use the app)
    const token = await signSessionJwt(user.id, user.email!, user.name ?? "");
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MS });

    res.json({
      success: true,
      isNewUser: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const user = await getUserByEmail(String(email).toLowerCase());

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: "Your account has been suspended. Contact support@lynxaiassistant.com" });
      return;
    }

    await updateLastSignedIn(user.id);

    const token = await signSessionJwt(user.id, user.email!, user.name ?? "");
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MS });

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

authRouter.post("/logout", (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

// ─── GET /api/auth/verify-email ───────────────────────────────────────────────

authRouter.get("/verify-email", async (req: Request, res: Response) => {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(400).send("Missing token");
    return;
  }

  try {
    const user = await verifyUserEmail(token);
    if (!user) {
      res.redirect("/?verified=invalid");
      return;
    }
    res.redirect("/dashboard?verified=1");
  } catch (err) {
    console.error("[Auth] Email verification error:", err);
    res.status(500).send("Verification failed");
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body ?? {};

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    const user = await getUserByEmail(String(email).toLowerCase());

    // Always respond with success to avoid email enumeration
    if (user && user.email) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await setResetToken(user.id, token, expiresAt);
      sendPasswordResetEmail(user.email, user.name ?? "", token, getOrigin(req)).catch(
        (err) => console.error("[Auth] Failed to send reset email:", err)
      );
    }

    res.json({ success: true, message: "If an account exists with that email, a reset link has been sent." });
  } catch (err) {
    console.error("[Auth] Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────

authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body ?? {};

  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }

  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const user = await getUserByResetToken(String(token));
    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await updatePassword(user.id, passwordHash);

    res.json({ success: true, message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error("[Auth] Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
