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
    console.warn("[Email] RESEND_API_KEY no configurado, omitiendo email");
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
    cloud: "Cloud AI — $199/mes",
    embedded: "Embedded AI — $399/mes",
    whitelabel: "White-Label — $499/mes",
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
        <a href="https://lynxaiassistant.com/dashboard" style="${BTN_BLUE}">Ir al dashboard →</a>
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
    subject: `Pago confirmado — Plan ${plan} de Lynx AI`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Pago confirmado ✓</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Tu pago de Lynx AI fue procesado exitosamente.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Plan</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${plan}</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Monto</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${amount}</td></tr>
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
    subject: `Aviso — Has usado el ${pct}% de tus mensajes de Lynx AI este mes`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Alerta de uso ⚠</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hi ${name || "there"},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Tu chatbot de Lynx AI ha usado <strong>${used.toLocaleString("es")} de ${limit.toLocaleString("es")} mensajes</strong> (${pct}%) este mes en el plan <strong>${plan}</strong>.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <div style="background: #e5e7eb; border-radius: 999px; height: 8px; overflow: hidden; margin-bottom: 8px;">
          <div style="background: #f59e0b; width: ${pct}%; height: 100%; border-radius: 999px;"></div>
        </div>
        <p style="color: #92400e; font-size: 13px; margin: 0; text-align: center;">${used.toLocaleString("es")} / ${limit.toLocaleString("es")} mensajes usados</p>
      </div>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Once the limit is reached, the widget stops replying until next month. Upgrade your plan to avoid interruptions.
      </p>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard/billing" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Mejorar plan →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;"><a href="https://lynxaiassistant.com/dashboard" style="color: #3b82f6;">Ver uso en el dashboard</a></p>
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
        <a href="https://lynxaiassistant.com/dashboard/billing" style="${BTN_BLUE}">Reactivar plan →</a>
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
    subject: `🎯 Nuevo lead${botLabel}: ${leadName}`,
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
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:120px;border-radius:8px 0 0 0;">Nombre</td>
          <td style="padding:12px 16px;font-size:15px;font-weight:600;color:#111827;border-radius:0 8px 0 0;">${leadName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;">Email</td>
          <td style="padding:12px 16px;font-size:15px;color:#3b82f6;"><a href="mailto:${leadEmail}" style="color:#3b82f6;text-decoration:none;">${leadEmail}</a></td>
        </tr>
        ${leadCompany ? `<tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;">Empresa</td><td style="padding:12px 16px;font-size:15px;color:#111827;">${leadCompany}</td></tr>` : ""}
        ${pageUrl ? `<tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-radius:0 0 0 8px;">Page</td><td style="padding:12px 16px;font-size:13px;color:#6b7280;border-radius:0 0 8px 0;">${pageUrl}</td></tr>` : ""}
      </table>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://lynxaiassistant.com/dashboard/leads" style="${BTN_BLUE}">Ver todos los leads →</a>
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
    subject: `🚀 Nueva solicitud Web Setup — ${data.businessName}`,
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
        <p style="color: #15803d; font-size: 14px; font-weight: 700; margin: 0 0 4px;">👤 Cliente</p>
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
        <tr><td style="color:#6b7280;font-size:14px;padding:8px 0;width:40%;">Color primario</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${colorSwatch(data.primaryColor)}</td></tr>
        <tr><td style="color:#6b7280;font-size:14px;padding:8px 0;width:40%;">Color secundario</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${colorSwatch(data.secondaryColor)}</td></tr>
        ${data.logoUrl ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;">Logo</td><td style="padding:8px 0;"><a href="${data.logoUrl}" style="color:#3b82f6;">Ver logo →</a></td></tr>` : ""}
        ${data.aiIconUrl ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;">AI icon</td><td style="padding:8px 0;"><a href="${data.aiIconUrl}" style="color:#3b82f6;">View icon →</a></td></tr>` : ""}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🤖 Chatbot</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Nombre del chatbot", data.chatbotName)}
        ${row("Mensaje de bienvenida", data.chatbotWelcome)}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📝 Detalles adicionales</h2>
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
    cloud: "$199.00 USD/mes",
    embedded: "$399.00 USD/mes",
    whitelabel: "$499.00 USD/mes",
  };
  const displayPlan = planNames[plan] ?? plan;
  const displayAmount = planAmounts[plan] ?? amount;

  return sendEmail({
    to,
    subject: `Recibo de pago — Plan ${displayPlan} de Lynx AI`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 40px; text-align: center;">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Recibo de pago ✓</h1>
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
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">Monto</td>
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
          Accede a tu dashboard para configurar tu chatbot, escanear tu sitio e instalar el snippet en tu web.
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://lynxaiassistant.com/dashboard" style="${BTN_BLUE}">Ir al dashboard →</a>
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
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">⚠️ Alerta: Pagos pendientes</h1>
      <p style="color: #fef3c7; margin: 8px 0 0; font-size: 15px;">${pendingUsers.length} user(s) paid but their plan didn't activate</p>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        The following users have a PayPal subscription stuck at <strong>"pending"</strong> for over 1 hour. The webhook may not have arrived. Revisa manualmente en el panel de admin o activa el plan directamente.
      </p>
      <div style="overflow-x: auto; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Nombre</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Email</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Plan</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Subscription ID</th>
              <th style="padding: 10px 8px; font-size: 13px; color: #6b7280; text-align: left; font-weight: 600;">Desde</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://lynxaiassistant.com/dashboard/admin" style="${BTN_BLUE}">Ir al panel de admin →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">This email is sent automatically every hour cuando hay suscripciones atascadas.</p>
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
