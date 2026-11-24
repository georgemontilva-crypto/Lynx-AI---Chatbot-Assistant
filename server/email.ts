/**
 * Email service usando Resend
 * All Lynx AI transactional emails — in English
 */

import { ENV } from "./_core/env";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY is not configured — email skipped");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.resendFromEmail,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Email] Error de Resend:", err);
      return false;
    }

    console.log(`[Email] Enviado "${subject}" a ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] Error al enviar:", err);
    return false;
  }
}

// ─── Plantillas de email ──────────────────────────────────────────────────────

const BASE_STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;`;
const CARD_STYLE = `max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);`;
const HEADER_BLUE = `background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 32px 40px; text-align: center;`;
const BODY_PAD = `padding: 40px;`;
const BTN_BLUE = `background: linear-gradient(135deg, #3b82f6, #1e40af); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;`;
const LOGO_URL = `https://lynxaiassistant.com/manus-storage/lynx-logo-dark_062479cc.png`;
const FOOTER_TEXT = (email = "support@lynxaiassistant.com") =>
  `<p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">Questions? Email us at <a href="mailto:${email}" style="color: #3b82f6;">${email}</a></p>`;

// ─── Bienvenida ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, plan: string) {
  const planNames: Record<string, string> = {
    free: "Free trial",
    cloud: "Cloud AI — $199/mo",
    embedded: "Embedded AI — $399/mo",
    whitelabel: "White-Label — $499/mo",
  };

  return sendEmail({
    to,
    subject: "Welcome to Lynx AI! Your chatbot is ready",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Welcome to Lynx AI!</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Your <strong>${planNames[plan] ?? plan}</strong> plan is active. Your AI chatbot is ready to install on your website.
      </p>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #0369a1; font-size: 14px; margin: 0; font-weight: 600;">Next steps:</p>
        <ol style="color: #374151; font-size: 14px; margin: 12px 0 0; padding-left: 20px; line-height: 2;">
          <li>Go to <strong>Dashboard → Chatbot Config</strong> to personalize it</li>
          <li>Scan your website in <strong>Site Scanner</strong></li>
          <li>Copy the code from <strong>Install Snippet</strong> and paste it into your site</li>
        </ol>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://lynxaiassistant.com/dashboard" style="${BTN_BLUE}">Go to dashboard →</a>
      </div>
      ${FOOTER_TEXT()}
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Payment confirmation ─────────────────────────────────────────────────────

export async function sendPaymentConfirmationEmail(
  to: string,
  name: string,
  plan: string,
  amount: string,
  nextBillingDate: string
) {
  return sendEmail({
    to,
    subject: `Payment confirmed — Lynx AI ${plan} plan`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Payment confirmed ✓</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Your Lynx AI payment was processed successfully.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Plan</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${plan}</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Amount</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${amount}</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Next charge</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${nextBillingDate}</td></tr>
        </table>
      </div>
      ${FOOTER_TEXT()}
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Usage limit alert ──────────────────────────────────────────────────

export async function sendUsageLimitAlertEmail(
  to: string,
  name: string,
  used: number,
  limit: number,
  plan: string
) {
  const pct = Math.round((used / limit) * 100);
  return sendEmail({
    to,
    subject: `Heads up — you have used ${pct}% of your Lynx AI messages this month`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Usage alert ⚠</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Your Lynx AI chatbot has used <strong>${used.toLocaleString("en-US")} of ${limit.toLocaleString("en-US")} messages</strong> (${pct}%) this month on the <strong>${plan}</strong> plan.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <div style="background: #e5e7eb; border-radius: 999px; height: 8px; overflow: hidden; margin-bottom: 8px;">
          <div style="background: #f59e0b; width: ${pct}%; height: 100%; border-radius: 999px;"></div>
        </div>
        <p style="color: #92400e; font-size: 13px; margin: 0; text-align: center;">${used.toLocaleString("en-US")} / ${limit.toLocaleString("en-US")} messages used</p>
      </div>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Once the limit is reached, the widget stops replying until next month. Upgrade your plan to avoid interruptions.
      </p>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard/billing" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Upgrade plan →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;"><a href="https://lynxaiassistant.com/dashboard" style="color: #3b82f6;">See usage in the dashboard</a></p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Subscription cancelled ───────────────────────────────────────────────

export async function sendSubscriptionCancelledEmail(to: string, name: string, plan: string) {
  return sendEmail({
    to,
    subject: "Your Lynx AI subscription has been cancelled",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: #6b7280; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Subscription cancelled</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Your <strong>${plan}</strong> plan has been cancelled. Your chatbot keeps working until the end of the current billing period.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Changed your mind?</strong> You can reactivate your plan any time from the dashboard.
        </p>
      </div>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard/billing" style="${BTN_BLUE}">Reactivate plan →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">Sorry to see you go. <a href="mailto:support@lynxaiassistant.com" style="color: #3b82f6;">Tell us how we can do better.</a></p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Email verification ────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string, origin: string) {
  const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "Verify your Lynx AI account",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Verify your email</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Thanks for signing up for Lynx AI. Please verify your email address to activate your account.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="${BTN_BLUE}">Verify email →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Password reset ──────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string, origin: string) {
  const resetUrl = `${origin}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Reset your Lynx AI password",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Reset your password</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        We received a request to reset your Lynx AI password. Click the button below to choose a new one.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="${BTN_BLUE}">Reset password →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Nuevo Lead del Widget ────────────────────────────────────────────────────

export async function sendNewLeadEmail(
  ownerEmail: string,
  ownerName: string,
  leadName: string,
  leadEmail: string,
  pageUrl: string | null,
  chatbotName?: string,
  leadCompany?: string | null,
) {
  const botLabel = chatbotName ? ` via ${chatbotName}` : "";
  return sendEmail({
    to: ownerEmail,
    subject: `New lead${botLabel}: ${leadName}`,
    html: `
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height:36px;margin-bottom:12px;" />
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">New lead captured!</h1>
      ${chatbotName ? `<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">Chatbot: ${chatbotName}</p>` : ""}
    </div>
    <div style="${BODY_PAD}">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">Hi ${ownerName}, someone left their details in your chatbot widget:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f8fafc;">
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:120px;border-radius:8px 0 0 0;">Name</td>
          <td style="padding:12px 16px;font-size:15px;font-weight:600;color:#111827;border-radius:0 8px 0 0;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;">Email</td>
          <td style="padding:12px 16px;font-size:15px;color:#3b82f6;"><a href="mailto:${leadEmail}" style="color:#3b82f6;text-decoration:none;">${leadEmail}</a></td>
        </tr>
        ${leadCompany ? `<tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;">Company</td><td style="padding:12px 16px;font-size:15px;color:#111827;">${leadCompany}</td></tr>` : ""}
        ${pageUrl ? `<tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-radius:0 0 0 8px;">Page</td><td style="padding:12px 16px;font-size:13px;color:#6b7280;border-radius:0 0 8px 0;">${pageUrl}</td></tr>` : ""}
      </table>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://lynxaiassistant.com/dashboard/leads" style="${BTN_BLUE}">View all leads →</a>
      </div>
      ${FOOTER_TEXT()}
    </div>
  </div>
</body>`,
  });
}

// ─── Web Setup Service Request ($199) ────────────────────────────────────────

export async function sendWebSetupRequestEmail(data: {
  userId: number;
  userName: string;
  userEmail: string;
  businessName: string;
  businessType?: string;
  websiteDomain?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  aiIconUrl?: string;
  chatbotName?: string;
  chatbotWelcome?: string;
  targetAudience?: string;
  keyPages?: string;
  additionalNotes?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const row = (label: string, value: string | undefined | null) =>
    value
      ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;vertical-align:top;width:40%;">${label}</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${value}</td></tr>`
      : "";

  const colorSwatch = (hex: string | undefined) =>
    hex
      ? `<span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${hex};vertical-align:middle;margin-right:6px;border:1px solid #e5e7eb;"></span>${hex}`
      : "—";

  return sendEmail({
    to: "sales@lynxaiassistant.com",
    subject: `New Web Setup request — ${data.businessName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 32px 40px; text-align: center;">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">🚀 Nueva solicitud Web Setup</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 15px;">$199 — Sitio web personalizado</p>
    </div>
    <div style="${BODY_PAD}">

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="color: #15803d; font-size: 14px; font-weight: 700; margin: 0 0 4px;">👤 Client</p>
        <p style="color: #374151; font-size: 15px; margin: 0;">${data.userName} &lt;${data.userEmail}&gt; — User ID: ${data.userId}</p>
      </div>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📋 Business information</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Nombre del negocio", data.businessName)}
        ${row("Tipo de negocio", data.businessType)}
        ${row("Dominio deseado", data.websiteDomain)}
        ${row("Email de contacto", data.contactEmail)}
        ${row("Phone", data.contactPhone)}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🎨 Branding</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="color:#6b7280;font-size:14px;padding:8px 0;width:40%;">Primary color</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${colorSwatch(data.primaryColor)}</td></tr>
        <tr><td style="color:#6b7280;font-size:14px;padding:8px 0;width:40%;">Secondary color</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${colorSwatch(data.secondaryColor)}</td></tr>
        ${data.logoUrl ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;">Logo</td><td style="padding:8px 0;"><a href="${data.logoUrl}" style="color:#3b82f6;">View logo →</a></td></tr>` : ""}
        ${data.aiIconUrl ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;">AI icon</td><td style="padding:8px 0;"><a href="${data.aiIconUrl}" style="color:#3b82f6;">View icon →</a></td></tr>` : ""}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🤖 Chatbot</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Nombre del chatbot", data.chatbotName)}
        ${row("Mensaje de bienvenida", data.chatbotWelcome)}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📝 Additional details</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Audiencia objetivo", data.targetAudience)}
        ${row("Key pages", data.keyPages)}
        ${row("Notas adicionales", data.additionalNotes)}
      </table>

      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin-top: 8px;">
        <p style="color: #92400e; font-size: 14px; font-weight: 700; margin: 0 0 4px;">⏱ Action required</p>
        <p style="color: #78350f; font-size: 14px; margin: 0;">Reply to the client within 24 hours to confirm receipt and the delivery timeline.</p>
      </div>

    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Subscription activation receipt ─────────────────────────────────────

export async function sendPaymentReceiptEmail(
  to: string,
  name: string,
  plan: string,
  amount: string,
  subscriptionId: string,
  activatedAt: string
) {
  const planNames: Record<string, string> = {
    cloud: "Cloud AI",
    embedded: "Embedded AI",
    whitelabel: "White-Label",
  };
  const planAmounts: Record<string, string> = {
    cloud: "$199.00 USD/mo",
    embedded: "$399.00 USD/mo",
    whitelabel: "$499.00 USD/mo",
  };
  const displayPlan = planNames[plan] ?? plan;
  const displayAmount = planAmounts[plan] ?? amount;

  return sendEmail({
    to,
    subject: `Payment receipt — Lynx AI ${displayPlan} plan`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 40px; text-align: center;">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Payment receipt ✓</h1>
      <p style="color: #d1fae5; margin: 8px 0 0; font-size: 15px;">Your subscription is active</p>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Your <strong>${displayPlan}</strong> plan has been activated. Here's your payment summary:
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">Plan</td>
            <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right; padding: 10px 0;">${displayPlan}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">Amount</td>
            <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right; padding: 10px 0;">${displayAmount}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">Activation date</td>
            <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right; padding: 10px 0;">${activatedAt}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">Subscription ID</td>
            <td style="color: #6b7280; font-size: 12px; font-family: monospace; text-align: right; padding: 10px 0;">${subscriptionId}</td>
          </tr>
        </table>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="color: #065f46; font-size: 14px; margin: 0; font-weight: 600;">What's included in your plan?</p>
        <p style="color: #374151; font-size: 14px; margin: 8px 0 0; line-height: 1.6;">
          Open your dashboard to set up your chatbot, scan your site and install the snippet on your website.
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://lynxaiassistant.com/dashboard" style="${BTN_BLUE}">Go to dashboard →</a>
      </div>
      ${FOOTER_TEXT()}
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Alerta admin: suscripciones atascadas en pending ────────────────────────

export async function sendPendingSubscriptionAlertEmail(
  adminEmail: string,
  pendingUsers: Array<{ id: number; name: string; email: string; plan: string; subscriptionId: string; createdAt: string }>
) {
  const rows = pendingUsers.map(u => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; font-size: 14px; color: #111827;">${u.name}</td>
      <td style="padding: 10px 8px; font-size: 14px; color: #3b82f6;"><a href="mailto:${u.email}" style="color: #3b82f6;">${u.email}</a></td>
      <td style="padding: 10px 8px; font-size: 14px; color: #111827; text-transform: capitalize;">${u.plan}</td>
      <td style="padding: 10px 8px; font-size: 12px; color: #6b7280; font-family: monospace;">${u.subscriptionId}</td>
      <td style="padding: 10px 8px; font-size: 13px; color: #6b7280;">${u.createdAt}</td>
    </tr>`).join("");

  return sendEmail({
    to: adminEmail,
    subject: `⚠️ ${pendingUsers.length} subscription(s) stuck in "pending" — Lynx AI`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">⚠️ Alert: pending payments</h1>
      <p style="color: #fef3c7; margin: 8px 0 0; font-size: 15px;">${pendingUsers.length} user(s) paid but their plan didn't activate</p>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        The following users have a PayPal subscription stuck at <strong>"pending"</strong> for over 1 hour. The webhook may not have arrived. Check manually in the admin panel or activate the plan directly.
      </p>
      <div style="overflow-x: auto; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Name</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Email</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Plan</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Subscription ID</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Since</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://lynxaiassistant.com/dashboard/admin" style="${BTN_BLUE}">Go to the admin panel →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">This email is sent automatically every hour while there are stuck subscriptions.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Owner notification (replaces the Manus notification service) ────────────
export async function sendOwnerNotificationEmail(
  to: string,
  title: string,
  content: string
): Promise<boolean> {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111;">${escapeHtml(title)}</h2>
      <div style="color: #333; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(content)}</div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Automated notification from Lynx AI</p>
    </div>
  `;
  return sendEmail({ to, subject: title, html });
}

/**
 * Widget chat continuity: sends the 6-digit code the visitor types back into
 * the chat to restore their previous conversation (cross-device, Violet-style).
 */
export async function sendChatVerificationCode(to: string, code: string, botName: string) {
  return sendEmail({
    to,
    subject: `${code} — your verification code`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:440px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 8px;font-size:18px;">Your verification code</h2>
        <p style="color:#555;font-size:14px;margin:0 0 16px;">${botName} sent you this code to restore your previous conversation. Type it in the chat:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f4f4f5;border-radius:12px;">${code}</div>
        <p style="color:#999;font-size:12px;margin:16px 0 0;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
      </div>`,
  });
}

// ─── Overdue payment: warning ─────────────────────────────────────────────────

/**
 * Sent once, as soon as a charge is detected as overdue. The tone is a heads-up,
 * not a threat: the service is still running at this point.
 */
export async function sendPaymentOverdueEmail(to: string, name: string, daysLeft: number) {
  const dayWord = daysLeft === 1 ? "day" : "days";
  return sendEmail({
    to,
    subject: `Action needed: your Lynx AI payment didn't go through`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Payment didn't go through</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        We couldn't process the payment for your Lynx AI subscription. This usually means the card on file
        expired, was replaced, or was declined by the bank.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Your assistant is still running.</strong> To keep it that way, please update your payment
          method within the next <strong>${daysLeft} ${dayWord}</strong>. After that the service is paused
          until a payment comes through.
        </p>
      </div>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard/billing" style="${BTN_BLUE}">Update payment method →</a>
      </div>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Already paid? Nothing to do — the warning clears itself within the hour.
      </p>
      ${FOOTER_TEXT("billing@lynxaiassistant.com")}
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Overdue payment: service paused ──────────────────────────────────────────

/**
 * Sent once, when the grace period runs out and the assistant stops answering.
 * It must be unambiguous about what happened and about the fact that nothing
 * was deleted — the account is paused, not cancelled.
 */
export async function sendServicePausedEmail(to: string, name: string, daysPastDue: number) {
  return sendEmail({
    to,
    subject: "Your Lynx AI service has been paused",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Service paused</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Your payment has been outstanding for ${daysPastDue} days, so your Lynx AI assistant has been paused.
        It is no longer answering visitors on your site.
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Nothing has been deleted.</strong> Your chatbots, training data, conversations and settings
          are all intact. The service resumes automatically as soon as a payment is received — you don't need
          to reinstall anything.
        </p>
      </div>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard/billing" style="${BTN_BLUE}">Restore my service →</a>
      </div>
      ${FOOTER_TEXT("billing@lynxaiassistant.com")}
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Weekly report ────────────────────────────────────────────────────────────

/**
 * Monday summary of the previous seven days, for accounts that switched the
 * weekly report on. Every number is a real count from the account's own data.
 */
export async function sendWeeklyReportEmail(
  to: string,
  name: string,
  s: {
    conversations: number; leads: number; avgRating: number | null; ratingsCount: number;
    pageViews: number; chatOpens: number; messagesThisMonth: number;
  }
) {
  const stat = (value: string, label: string) => `
        <td style="padding: 14px 8px; text-align: center; width: 33%;">
          <div style="font-size: 26px; font-weight: 700; color: #111827;">${value}</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${label}</div>
        </td>`;
  const quiet = s.conversations === 0 && s.pageViews === 0;
  return sendEmail({
    to,
    subject: `Your Lynx AI week: ${s.conversations} conversation${s.conversations === 1 ? "" : "s"}, ${s.leads} lead${s.leads === 1 ? "" : "s"}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Your week in review</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Last 7 days</p>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; margin: 0 0 12px;">
        <tr>${stat(String(s.conversations), "Conversations")}${stat(String(s.leads), "Leads captured")}${stat(s.avgRating === null ? "—" : `${s.avgRating}/5`, s.ratingsCount > 0 ? `Avg rating (${s.ratingsCount})` : "No ratings yet")}</tr>
      </table>
      <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; margin: 0 0 24px;">
        <tr>${stat(s.pageViews.toLocaleString("en-US"), "Page views")}${stat(s.chatOpens.toLocaleString("en-US"), "Chats opened")}${stat(s.messagesThisMonth.toLocaleString("en-US"), "Messages this month")}</tr>
      </table>
      ${quiet ? `<p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">A quiet week: no visits were recorded. If your site did have traffic, check that the widget snippet is still installed on it.</p>` : ""}
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard" style="${BTN_BLUE}">Open dashboard →</a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0 0 16px;">You get this email because the weekly report is switched on. Turn it off any time under Notifications.</p>
      ${FOOTER_TEXT()}
    </div>
  </div>
</body>
</html>`,
  });
}
