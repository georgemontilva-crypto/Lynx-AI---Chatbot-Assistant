import { TRPCError } from "@trpc/server";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface Counter {
  count: number;
  windowStart: number;
}

const counters = new Map<number, Counter>();

// Entries for users who only ever call this once would otherwise sit in
// the Map forever. Sweep expired ones periodically instead of paying an
// eviction cost on every checkTestChatRateLimit() call.
setInterval(() => {
  const now = Date.now();
  counters.forEach((counter, userId) => {
    if (now - counter.windowStart >= WINDOW_MS) {
      counters.delete(userId);
    }
  });
}, SWEEP_INTERVAL_MS).unref();

/**
 * Anti-abuse cap for the dashboard's "test your chatbot" button
 * (chatbot.chat). In-memory and per-process: resets on deploy/restart,
 * not shared across instances. Not a billing guarantee — just enough
 * to stop a single account from scripting a cost-draining loop.
 */
export function checkTestChatRateLimit(userId: number): void {
  const now = Date.now();
  const existing = counters.get(userId);

  if (!existing || now - existing.windowStart >= WINDOW_MS) {
    counters.set(userId, { count: 1, windowStart: now });
    return;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You've reached the test message limit. Try again in a bit.",
    });
  }

  existing.count += 1;
}
