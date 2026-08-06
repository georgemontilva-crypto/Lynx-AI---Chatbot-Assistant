const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required to start the server");
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: jwtSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // PayPal
  paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "",
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  paypalPlanCloud: process.env.PAYPAL_PLAN_ID_CLOUD ?? "",
  paypalPlanEmbedded: process.env.PAYPAL_PLAN_ID_EMBEDDED ?? "",
  paypalPlanWhitelabel: process.env.PAYPAL_PLAN_ID_WHITELABEL ?? "",
  paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
  // Resend
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "Lynx AI <noreply@lynxaiassistant.com>",
  // Web Push VAPID
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
};
