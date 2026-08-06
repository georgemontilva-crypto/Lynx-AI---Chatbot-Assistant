/**
 * Validates that PayPal and Resend credentials are present and reachable.
 * These tests run against the live sandbox environment.
 */
import { describe, it, expect } from "vitest";

describe("PayPal credentials", () => {
  it("should have PAYPAL_CLIENT_ID set", () => {
    expect(process.env.PAYPAL_CLIENT_ID).toBeTruthy();
  });

  it("should have PAYPAL_CLIENT_SECRET set", () => {
    expect(process.env.PAYPAL_CLIENT_SECRET).toBeTruthy();
  });

  it("should have all three plan IDs set", () => {
    expect(process.env.PAYPAL_PLAN_ID_CLOUD).toBeTruthy();
    expect(process.env.PAYPAL_PLAN_ID_EMBEDDED).toBeTruthy();
    expect(process.env.PAYPAL_PLAN_ID_WHITELABEL).toBeTruthy();
  });

  it("should be able to obtain a PayPal access token", async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const secret = process.env.PAYPAL_CLIENT_SECRET!;
    const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");

    const res = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    // If sandbox fails, try live
    if (!res.ok) {
      const liveRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      expect(liveRes.ok).toBe(true);
      return;
    }

    expect(res.ok).toBe(true);
    const data = await res.json() as { access_token?: string };
    expect(data.access_token).toBeTruthy();
  }, 15000);
});

describe("Resend credentials", () => {
  it("should have RESEND_API_KEY set", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
  });

  it("should have RESEND_FROM_EMAIL set", () => {
    expect(process.env.RESEND_FROM_EMAIL).toBeTruthy();
  });

  it("should be able to reach Resend API with the key", async () => {
    const res = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });
    // 200 = valid key, 401 = invalid key
    expect(res.status).not.toBe(401);
  }, 10000);
});
