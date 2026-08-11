import { promises as dns } from "node:dns";
import net from "node:net";
import { request as undiciRequest } from "undici";

const MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const DEFAULT_TIMEOUT_MS = 12000;

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 0) return true; // "this network"
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (net.isIPv4(mapped)) return isBlockedIpv4(mapped);
  }
  if (lower.startsWith("::") && net.isIPv4(lower.slice(2))) {
    return isBlockedIpv4(lower.slice(2)); // deprecated IPv4-compatible (::a.b.c.d)
  }
  if (lower.startsWith("64:ff9b::")) {
    return true; // NAT64 well-known prefix (RFC 6052) — embeds an IPv4 target
  }
  const firstHextet = parseInt(lower.split(":")[0].padStart(4, "0"), 16);
  if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIpv4(ip);
  if (net.isIPv6(ip)) return isBlockedIpv6(ip);
  return true; // unrecognized format — fail closed
}

async function assertUrlIsSafe(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL scheme not allowed");
  }
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Could not resolve host");
  }
  for (const { address } of records) {
    if (isBlockedIp(address)) {
      throw new Error("Target host is not allowed");
    }
  }
}

export interface SafeFetchResult {
  status: number;
  text: string;
}

/**
 * Fetches a user-supplied URL while blocking SSRF: validates DNS-resolved
 * IPs against private/loopback/link-local/metadata ranges, and re-validates
 * on every redirect hop instead of letting the HTTP client follow them blindly.
 */
/**
 * Discard a response body we are not going to read.
 *
 * CRITICAL: undici's BodyReadable emits an asynchronous 'error' event
 * (UND_ERR_ABORTED) when destroyed mid-flight. A Readable with no 'error'
 * listener makes Node throw "Unhandled 'error' event", which killed the whole
 * server process — a single redirect during a site scan took the app down and
 * Railway restarted the container, so the request died with no JSON response.
 * Attaching the listener BEFORE destroying keeps the abort local.
 */
function discardBody(body: { on: (e: string, cb: (err?: unknown) => void) => void; destroy: () => void }): void {
  try {
    body.on("error", () => { /* aborted on purpose — nothing to handle */ });
    body.destroy();
  } catch { /* already closed */ }
}

export async function safeFetchText(
  inputUrl: string,
  opts: { timeoutMs?: number; maxBytes?: number; userAgent?: string } = {}
): Promise<SafeFetchResult> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let currentUrl = new URL(inputUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertUrlIsSafe(currentUrl);

    const { statusCode, headers, body } = await undiciRequest(currentUrl, {
      method: "GET",
      headers: { "user-agent": opts.userAgent ?? "LynxAI-Scanner/1.0 (+https://lynxai.io)" },
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
      // undici's request() never auto-follows redirects (unlike fetch()),
      // so 3xx responses are validated and followed manually below.
    });

    if (statusCode >= 300 && statusCode < 400 && headers.location) {
      discardBody(body);
      if (hop === MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }
      const location = Array.isArray(headers.location) ? headers.location[0] : headers.location;
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    // Same reasoning as discardBody: a stream error (timeout, connection reset,
    // aborted body) must surface as a normal rejection this caller can catch,
    // never as an unhandled 'error' event that takes the process down.
    body.on("error", () => { /* handled by the try/catch below */ });
    try {
      for await (const chunk of body) {
        total += (chunk as Buffer).length;
        if (total > maxBytes) {
          discardBody(body);
          break;
        }
        chunks.push(chunk as Buffer);
      }
    } catch (err) {
      // Partial content is still useful to the scanner; only fail if we got nothing.
      if (chunks.length === 0) {
        throw new Error(`Could not read response body: ${(err as Error)?.message ?? "aborted"}`);
      }
    }
    return { status: statusCode, text: Buffer.concat(chunks).toString("utf-8") };
  }

  throw new Error("Too many redirects");
}
