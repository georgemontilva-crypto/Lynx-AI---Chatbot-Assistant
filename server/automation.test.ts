import { describe, it, expect } from "vitest";
import { isWeeklyReportDue, startOfIsoWeek } from "./weeklyReport";
import { shouldReplaceKnowledge, rescanIntervalDays, productCountInContext } from "./autoRescan";
import { resolveAlertPrefs, readStoredPrefs, DEFAULT_ALERT_PREFS } from "./accountNotifications";

describe("weekly report schedule", () => {
  const monday = new Date("2026-11-30T14:00:00Z");
  it("starts the ISO week on Monday 00:00 UTC", () => {
    expect(startOfIsoWeek(new Date("2026-12-03T18:30:00Z")).toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(startOfIsoWeek(new Date("2026-12-06T23:59:00Z")).toISOString()).toBe("2026-11-30T00:00:00.000Z"); // Sunday
  });
  it("is due on Monday from the send hour", () => {
    expect(isWeeklyReportDue(monday, null)).toBe(true);
    expect(isWeeklyReportDue(new Date("2026-11-30T09:00:00Z"), null)).toBe(false);
  });
  it("is never due on other days — a missed Monday is not caught up", () => {
    for (const d of ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"]) {
      expect(isWeeklyReportDue(new Date(`${d}T14:00:00Z`), null)).toBe(false);
    }
  });
  it("is sent once per week even though the job runs hourly", () => {
    expect(isWeeklyReportDue(new Date("2026-11-30T15:00:00Z"), monday.toISOString())).toBe(false);
    expect(isWeeklyReportDue(new Date("2026-12-07T14:00:00Z"), monday.toISOString())).toBe(true);
  });
  it("treats an unreadable timestamp as never sent", () => {
    expect(isWeeklyReportDue(monday, "garbage")).toBe(true);
  });
});

describe("automatic re-scan", () => {
  const catalog = (n: number) => `=== BUSINESS OVERVIEW ===\n\n=== PRODUCT CATALOG (${n} products detected) ===\n` + "x".repeat(4000);
  it("follows the cadence the plans advertise", () => {
    expect(rescanIntervalDays("cloud")).toBe(7);
    expect(rescanIntervalDays("embedded")).toBe(1);
    expect(rescanIntervalDays("whitelabel")).toBe(1);
    expect(rescanIntervalDays("free")).toBeNull();
    expect(rescanIntervalDays(undefined)).toBeNull();
  });
  it("reads the product count out of stored knowledge", () => {
    expect(productCountInContext(catalog(15))).toBe(15);
    expect(productCountInContext("no catalog here")).toBe(0);
  });
  it("accepts a healthy fresh read", () => {
    expect(shouldReplaceKnowledge({ context: catalog(15) }, { context: catalog(16), products: 16, pagesRead: 20 })).toBe(true);
  });
  it("keeps the old knowledge when the catalog vanished (site down or blocked)", () => {
    expect(shouldReplaceKnowledge({ context: catalog(15) }, { context: "x".repeat(4000), products: 0, pagesRead: 12 })).toBe(false);
  });
  it("keeps the old knowledge when most products went missing", () => {
    expect(shouldReplaceKnowledge({ context: catalog(15) }, { context: catalog(4), products: 4, pagesRead: 12 })).toBe(false);
  });
  it("keeps the old knowledge when only the home page answered", () => {
    expect(shouldReplaceKnowledge({ context: catalog(15) }, { context: catalog(15), products: 15, pagesRead: 1 })).toBe(false);
  });
  it("keeps the old knowledge when the new read is far thinner", () => {
    expect(shouldReplaceKnowledge({ context: "y".repeat(30000) }, { context: "y".repeat(5000), products: 0, pagesRead: 8 })).toBe(false);
  });
  it("always fills in when there was nothing before", () => {
    expect(shouldReplaceKnowledge({ context: "" }, { context: "something", products: 0, pagesRead: 1 })).toBe(true);
  });
  it("a small store legitimately dropping a product is accepted", () => {
    expect(shouldReplaceKnowledge({ context: catalog(4) }, { context: catalog(3), products: 3, pagesRead: 9 })).toBe(true);
  });
});

describe("alert preferences", () => {
  it("defaults to everything on except the opt-in weekly email", () => {
    expect(resolveAlertPrefs(null)).toEqual(DEFAULT_ALERT_PREFS);
    expect(DEFAULT_ALERT_PREFS.weeklyReport).toBe(false);
  });
  it("keeps explicit choices and fills in the rest", () => {
    const p = resolveAlertPrefs({ newLead: false, weeklyReport: true });
    expect(p.newLead).toBe(false);
    expect(p.weeklyReport).toBe(true);
    expect(p.lowRating).toBe(true);
  });
  it("reads the older three-switch shape", () => {
    expect(resolveAlertPrefs({ newLead: true, lowRating: false, usageLimit: true }).lowRating).toBe(false);
  });
  it("reads a JSON column that arrives as a string", () => {
    expect(resolveAlertPrefs('{"newLead":false}').newLead).toBe(false);
    expect(readStoredPrefs("not json")).toEqual({});
    expect(readStoredPrefs([1, 2])).toEqual({});
  });
  it("ignores non-boolean junk", () => {
    expect(resolveAlertPrefs({ newLead: "no" }).newLead).toBe(true);
  });
});

// ── Admin access from configuration ─────────────────────────────────────────
import { adminEmails } from "./adminBootstrap";

describe("adminEmails", () => {
  it("is empty when the variable is not set", () => {
    expect(adminEmails(undefined)).toEqual([]);
    expect(adminEmails("")).toEqual([]);
  });
  it("accepts commas, semicolons and spaces, lowercases and de-duplicates", () => {
    expect(adminEmails(" Jorge@Example.com, ana@example.com;JORGE@example.com  luis@example.com ")).toEqual([
      "jorge@example.com",
      "ana@example.com",
      "luis@example.com",
    ]);
  });
  it("ignores entries that are not email addresses", () => {
    expect(adminEmails("admin, ,@, a@b, jorge@example.com")).toEqual(["jorge@example.com"]);
  });
});
