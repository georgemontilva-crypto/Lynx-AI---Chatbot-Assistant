import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerWidgetRoutes } from "../widgetRouter";
import { registerBillingRoutes } from "../billingRouter";
import { registerUploadRoutes } from "../uploadRouter";
import { registerSeoRoutes } from "../seoRouter";
import { runPendingSubscriptionCheck } from "../scheduledPendingAlert";
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
  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (required for express-rate-limit to read real client IP)
  app.set("trust proxy", 1);

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
  app.use("/api/oauth", authLimiter);
  app.use("/api/auth", authLimiter);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
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

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
