// Storage helpers — Cloudflare R2 edition.
// Replaces the Manus Forge presigned-URL flow with direct uploads to an
// S3-compatible R2 bucket. Public URLs are served from R2_PUBLIC_URL
// (the bucket's public domain or a connected custom domain).
//
// Required env vars:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   R2_PUBLIC_URL  (e.g. https://media.tudominio.com or the r2.dev public URL)

import crypto from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  client: S3Client;
  bucket: string;
  publicUrl: string;
};

let cached: R2Config | null = null;

function getR2(): R2Config {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(
      "Storage config missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL"
    );
  }

  cached = {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
    publicUrl,
  };
  return cached;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Uploads a buffer to R2 and returns the object's public URL.
 * A short random suffix is appended to the key to bust caches on re-upload
 * (same behavior as the previous implementation).
 */
export async function storagePut(
  relKey: string,
  body: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { client, bucket, publicUrl } = getR2();
  const key = appendHashSuffix(normalizeKey(relKey));

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: typeof body === "string" ? Buffer.from(body) : body,
      ContentType: contentType,
    })
  );

  return { key, url: `${publicUrl}/${key}` };
}

/** Returns the public URL for a stored object. */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const { publicUrl } = getR2();
  const key = normalizeKey(relKey);
  return { key, url: `${publicUrl}/${key}` };
}

/** Returns a time-limited signed URL (for private objects). */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { client, bucket } = getR2();
  const key = normalizeKey(relKey);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 }
  );
}
