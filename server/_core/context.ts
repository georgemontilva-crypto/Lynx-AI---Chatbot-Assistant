import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import { getUserById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function authenticateLocalJwt(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  // Try cookie first, then Authorization header
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  let token = cookies[COOKIE_NAME];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    // Local auth JWT has `userId` field
    if (typeof payload.userId === "number") {
      const user = await getUserById(payload.userId);
      return user ?? null;
    }

    // Manus OAuth JWT has `openId` field — fall through to sdk
    return null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. Try local JWT auth first
  try {
    user = await authenticateLocalJwt(opts.req);
  } catch {
    user = null;
  }

  // 2. Fall back to Manus OAuth SDK (for existing sessions / cron)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
