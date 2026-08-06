import type { Express } from "express";

/**
 * Storage proxy — R2 edition.
 *
 * Historic asset URLs across the app (and in the database) use the
 * /manus-storage/<key> path. This route now redirects those paths to the
 * Cloudflare R2 public bucket so legacy references keep working after the
 * migration off Manus. New uploads via storagePut() already return absolute
 * R2 URLs.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || key.includes("..")) {
      res.status(400).send("Invalid storage key");
      return;
    }

    const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
    if (!publicUrl) {
      res.status(404).send("Storage not configured");
      return;
    }

    res.set("Cache-Control", "public, max-age=3600");
    res.redirect(302, `${publicUrl}/${key}`);
  });
}
