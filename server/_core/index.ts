import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { registerWidgetRoutes } from "../widgetRouter";
import { registerBillingRoutes } from "../billingRouter";
import { registerUploadRoutes } from "../uploadRouter";
import { registerSeoRoutes } from "../seoRouter";
import { runPendingSubscriptionCheck } from "../scheduledPendingAlert";
import { runOverdueBillingCheck } from "../overdueBilling";
import { runWeeklyReports } from "../weeklyReport";
import { ensureSchema } from "../ensureSchema";
import { runAutoRescan } from "../autoRescan";
import { pushRouter } from "../pushRouter";
import { authRouter } from "../authRouter";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Bring the database up to the columns this build expects BEFORE serving a
  // single request — a missing column otherwise breaks login for everyone.
  await ensureSchema().catch(err => console.error("[Schema] Startup check failed:", err));

  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (required for express-rate-limit to read real client IP)
  app.set("trust proxy", 1);

  // ── Canonical host redirect ────────────────────────────────────────────────
  // The session cookie lives on www.lynxaiassistant.com. If a request arrives on
  // the bare apex domain, redirect to www so login/session always work on ONE
  // host (a cookie set on one host isn't sent to the other → login loop).
  app.use((req, res, next) => {
    const host = String(req.headers.host ?? "").toLowerCase();
    if (host === "lynxaiassistant.com") {
      return res.redirect(301, `https://www.lynxaiassistant.com${req.originalUrl}`);
    }
    next();
  });

  // Gzip/Brotli compression for all responses
  app.use(compression());

  // ── Security headers ─────────────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    // HSTS: force HTTPS for 1 year, include subdomains
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // Prevent MIME sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // XSS protection (legacy browsers)
    res.setHeader("X-XSS-Protection", "1; mode=block");
    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Permissions policy: disable unused browser features
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });

  // ── Global rate limiting ──────────────────────────────────────────────────────────
  // General API: 200 requests per minute per IP
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => req.path.startsWith("/manus-storage"), // skip storage proxy
  });
  app.use("/api", apiLimiter);

  // Stricter limit for auth endpoints: 20 per 15 minutes per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts, please try again later." },
  });
  app.use("/api/auth", authLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  registerStorageProxy(app);
  app.use("/api/auth", authRouter);
  registerWidgetRoutes(app);
  registerBillingRoutes(app);
  registerUploadRoutes(app);
  registerSeoRoutes(app);
  // Push notifications
  app.use("/api/push", pushRouter);
  // Scheduled endpoints (AGENT cron callbacks)

  // ── Internal scheduler: check pending PayPal subscriptions every hour ──
  setInterval(() => {
    runPendingSubscriptionCheck().catch(err =>
      console.warn("[PendingAlert] Scheduled check failed:", err)
    );
  }, 60 * 60 * 1000);

  // ── Internal scheduler: overdue payments, every hour ──────────────────────
  // Flags accounts whose billing date passed without a payment, emails the
  // warning, and pauses the service once the grace period is over. Offset from
  // the pending check so the two don't hammer the PayPal API at the same moment.
  setInterval(() => {
    runOverdueBillingCheck()
      .then(r => {
        if (r.flagged || r.cleared || r.warned || r.suspended) {
          console.log(
            `[Overdue] checked=${r.checked} flagged=${r.flagged} cleared=${r.cleared} warned=${r.warned} suspended=${r.suspended}`
          );
        }
      })
      .catch(err => console.warn("[Overdue] Scheduled check failed:", err));
  }, 60 * 60 * 1000);
  // ── Internal scheduler: automatic site re-scans ───────────────────────────
  // Daily for Embedded/White-Label sites, weekly for Cloud — a few sites per
  // hourly run so the load stays flat however many customers there are.
  setInterval(() => {
    runAutoRescan()
      .then(r => {
        if (r.due) console.log(`[AutoRescan] due=${r.due} updated=${r.updated} kept=${r.kept} failed=${r.failed}`);
      })
      .catch(err => console.warn("[AutoRescan] Scheduled run failed:", err));
  }, 60 * 60 * 1000);

  // ── Internal scheduler: weekly report emails ──────────────────────────────
  // Checked hourly; the job itself only acts on Mondays and never sends the
  // same account two reports in one week.
  setInterval(() => {
    runWeeklyReports()
      .then(r => { if (r.sent) console.log(`[WeeklyReport] sent=${r.sent}`); })
      .catch(err => console.warn("[WeeklyReport] Scheduled run failed:", err));
  }, 60 * 60 * 1000);
  // Run once ~2 min after boot so a restart doesn't delay detection by an hour.
  setTimeout(() => {
    runOverdueBillingCheck().catch(err =>
      console.warn("[Overdue] Startup check failed:", err)
    );
  }, 2 * 60 * 1000);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // ── Last-resort safety net ────────────────────────────────────────────────
  // A single unhandled stream/socket error used to kill the whole process and
  // take every user's widget down with it (Railway then restarted the
  // container). These handlers log loudly and keep serving: a failed background
  // task must never be an outage. Genuine startup failures still exit below.
  process.on("uncaughtException", (err) => {
    console.error("[FATAL-CAUGHT] Uncaught exception — server kept alive:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL-CAUGHT] Unhandled promise rejection — server kept alive:", reason);
  });

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
