import { describe, it, expect } from "vitest";
import { overdueState, GRACE_DAYS } from "./overdueState";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-23T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

const paying = {
  plan: "whitelabel",
  role: "user",
  subscriptionId: "I-X41NR4GBHCP1",
};

describe("overdueState", () => {
  it("is clear when no payment is overdue", () => {
    const s = overdueState({ ...paying, pastDueSince: null }, NOW);
    expect(s.isPastDue).toBe(false);
    expect(s.isSuspended).toBe(false);
  });

  it("flags an overdue account but keeps it running during the grace period", () => {
    const s = overdueState({ ...paying, pastDueSince: daysAgo(1) }, NOW);
    expect(s.isPastDue).toBe(true);
    expect(s.isSuspended).toBe(false);
    expect(s.daysPastDue).toBe(1);
    expect(s.daysLeft).toBe(2);
  });

  it("still runs on the last day of grace", () => {
    const s = overdueState({ ...paying, pastDueSince: daysAgo(GRACE_DAYS - 0.01) }, NOW);
    expect(s.isSuspended).toBe(false);
    expect(s.daysLeft).toBe(1);
  });

  it("suspends exactly at the end of the grace period", () => {
    const s = overdueState({ ...paying, pastDueSince: daysAgo(GRACE_DAYS) }, NOW);
    expect(s.isSuspended).toBe(true);
    expect(s.daysLeft).toBe(0);
  });

  it("stays suspended well past the grace period", () => {
    const s = overdueState({ ...paying, pastDueSince: daysAgo(40) }, NOW);
    expect(s.isSuspended).toBe(true);
    expect(s.daysPastDue).toBe(40);
  });

  // ── Exemptions ────────────────────────────────────────────────────────────
  it("never suspends an admin", () => {
    const s = overdueState({ ...paying, role: "admin", pastDueSince: daysAgo(99) }, NOW);
    expect(s.isPastDue).toBe(false);
    expect(s.isSuspended).toBe(false);
  });

  it("never suspends a manually granted plan (no PayPal subscription)", () => {
    const s = overdueState({ ...paying, subscriptionId: null, pastDueSince: daysAgo(99) }, NOW);
    expect(s.isSuspended).toBe(false);
  });

  it("ignores the free plan, which the trial check governs instead", () => {
    const s = overdueState({ ...paying, plan: "free", pastDueSince: daysAgo(99) }, NOW);
    expect(s.isSuspended).toBe(false);
  });

  // ── Bad data must fail open, never pause a paying customer ────────────────
  it("fails open on an unparseable timestamp", () => {
    const s = overdueState({ ...paying, pastDueSince: "not a date" }, NOW);
    expect(s.isPastDue).toBe(false);
  });

  it("does not report negative days when the timestamp is in the future", () => {
    const s = overdueState({ ...paying, pastDueSince: new Date(NOW.getTime() + 5 * DAY) }, NOW);
    expect(s.daysPastDue).toBe(0);
    expect(s.isSuspended).toBe(false);
    expect(s.daysLeft).toBeLessThanOrEqual(GRACE_DAYS);
  });

  it("accepts a date stored as a string, as MySQL returns it", () => {
    const s = overdueState({ ...paying, pastDueSince: "2026-11-18T12:00:00Z" }, NOW);
    expect(s.isSuspended).toBe(true);
    expect(s.daysPastDue).toBe(5);
  });
});
