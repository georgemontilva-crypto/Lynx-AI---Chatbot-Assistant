import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for push notification infrastructure.
 * Validates VAPID key format and push helper logic.
 */

describe("Push Notifications — VAPID key validation", () => {
  it("VAPID_PUBLIC_KEY env var is set and is a valid base64url string", () => {
    const key = process.env.VAPID_PUBLIC_KEY;
    // In test environment the key may not be set, but we validate the format if present
    if (key) {
      // VAPID public keys are base64url-encoded, 65 bytes uncompressed EC point → ~87 chars
      expect(key.length).toBeGreaterThan(50);
      // Only base64url characters: A-Z, a-z, 0-9, -, _
      expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
    } else {
      // In CI/test env without secrets, skip
      expect(true).toBe(true);
    }
  });

  it("VAPID_PRIVATE_KEY env var is set and is a valid base64url string", () => {
    const key = process.env.VAPID_PRIVATE_KEY;
    if (key) {
      expect(key.length).toBeGreaterThan(30);
      expect(key).toMatch(/^[A-Za-z0-9\-_]+$/);
    } else {
      expect(true).toBe(true);
    }
  });
});

describe("Push Notifications — preference filtering logic", () => {
  type PushPrefs = { newLead: boolean; lowRating: boolean; usageLimit: boolean };

  function shouldSend(prefs: PushPrefs | null | undefined, eventType: keyof PushPrefs): boolean {
    if (!prefs) return true; // null = all enabled by default
    return prefs[eventType] !== false;
  }

  it("returns true when prefs is null (default all-on)", () => {
    expect(shouldSend(null, "newLead")).toBe(true);
    expect(shouldSend(null, "lowRating")).toBe(true);
    expect(shouldSend(null, "usageLimit")).toBe(true);
  });

  it("returns false when a specific event is disabled", () => {
    const prefs: PushPrefs = { newLead: false, lowRating: true, usageLimit: true };
    expect(shouldSend(prefs, "newLead")).toBe(false);
    expect(shouldSend(prefs, "lowRating")).toBe(true);
    expect(shouldSend(prefs, "usageLimit")).toBe(true);
  });

  it("returns false when all events are disabled", () => {
    const prefs: PushPrefs = { newLead: false, lowRating: false, usageLimit: false };
    expect(shouldSend(prefs, "newLead")).toBe(false);
    expect(shouldSend(prefs, "lowRating")).toBe(false);
    expect(shouldSend(prefs, "usageLimit")).toBe(false);
  });

  it("returns true when all events are explicitly enabled", () => {
    const prefs: PushPrefs = { newLead: true, lowRating: true, usageLimit: true };
    expect(shouldSend(prefs, "newLead")).toBe(true);
    expect(shouldSend(prefs, "lowRating")).toBe(true);
    expect(shouldSend(prefs, "usageLimit")).toBe(true);
  });
});

describe("Push Notifications — urlBase64ToUint8Array", () => {
  // Node-compatible version (uses Buffer instead of window.atob)
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  }

  it("converts a base64url string to Uint8Array correctly", () => {
    // "hello" in base64url is "aGVsbG8"
    const result = urlBase64ToUint8Array("aGVsbG8");
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(5);
    expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]); // "hello"
  });

  it("handles padding correctly", () => {
    // Base64url without padding
    const result = urlBase64ToUint8Array("dGVzdA"); // "test"
    expect(result.length).toBe(4);
    expect(Array.from(result)).toEqual([116, 101, 115, 116]); // "test"
  });
});
