import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Pipe the file bytes directly instead of redirecting.
      // This avoids cross-origin issues with 307 redirects to signed S3 URLs
      // and lets us set a long-lived cache header so the image loads fast.
      const s3Resp = await fetch(url);
      if (!s3Resp.ok) {
        res.status(502).send("Storage fetch error");
        return;
      }

      const contentType = s3Resp.headers.get("content-type") ?? "application/octet-stream";
      const buffer = Buffer.from(await s3Resp.arrayBuffer());

      res.set("Content-Type", contentType);
      res.set("Content-Length", String(buffer.length));
      // Cache for 1 hour in CDN/browser — safe because keys include a hash suffix
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.set("Access-Control-Allow-Origin", "*");
      res.status(200).send(buffer);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
