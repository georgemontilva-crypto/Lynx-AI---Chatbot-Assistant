/**
 * Upload REST endpoint
 *
 * POST /api/upload — accepts a multipart/form-data file and stores it in S3.
 * Requires an authenticated session (session cookie).
 * Returns { url: string } — the /manus-storage/<key> path.
 *
 * Used by:
 *  - White-Label chatbot avatar upload (ChatbotConfig page)
 *  - Web Setup questionnaire logo/icon upload
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { storagePut } from "./storage";
import { getUserById } from "./db";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./_core/env";

// Store files in memory (max 5 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

async function getSessionUser(req: Request) {
  try {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "number") return null;
    return await getUserById(payload.userId);
  } catch {
    return null;
  }
}

export function registerUploadRoutes(app: Express) {
  // POST /api/upload
  // Body: multipart/form-data with field "file"
  // Returns: { url: string }
  app.post(
    "/api/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      // Auth check
      const user = await getSessionUser(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "png";
      const key = `uploads/user-${user.id}/avatar.${ext}`;

      // Primary path: object storage (Cloudflare R2) when configured
      try {
        const { url } = await storagePut(key, file.buffer, file.mimetype);
        return res.json({ url });
      } catch (storageErr) {
        // Fallback: for small images (icons/avatars) embed as a data URL in the
        // DB so customization works even before R2 is configured. Cap at 200KB
        // to avoid bloating rows — larger files still require R2.
        const MAX_INLINE_BYTES = 200 * 1024;
        if (file.size <= MAX_INLINE_BYTES && file.mimetype.startsWith("image/")) {
          const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
          console.warn("[Upload] R2 unavailable — stored image inline as data URL (fallback).");
          return res.json({ url: dataUrl });
        }
        console.error("[Upload] Storage error and file too large for inline fallback:", storageErr);
        return res.status(500).json({
          error: "Image storage is not configured yet. Upload an icon under 200KB, or set up your R2 bucket for larger files.",
        });
      }
    }
  );
}
