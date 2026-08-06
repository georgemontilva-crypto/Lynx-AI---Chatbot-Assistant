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

      try {
        const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "png";
        const key = `uploads/user-${user.id}/avatar.${ext}`;
        const { url } = await storagePut(key, file.buffer, file.mimetype);
        return res.json({ url });
      } catch (err) {
        console.error("[Upload] Error:", err);
        return res.status(500).json({ error: "Upload failed" });
      }
    }
  );
}
