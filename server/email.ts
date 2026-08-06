/**
 * Email service usando Resend
 * Todos los emails transaccionales de Lynx AI — en español
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
  `<p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">¿Tienes preguntas? Escríbenos a <a href="mailto:${email}" style="color: #3b82f6;">${email}</a></p>`;

// ─── Bienvenida ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, plan: string) {
  const planNames: Record<string, string> = {
    cloud: "Cloud AI — $199/mes",
    embedded: "Embedded AI — $399/mes",
    whitelabel: "White-Label — $499/mes",
  };

  return sendEmail({
    to,
    subject: "¡Bienvenido a Lynx AI! Tu chatbot está listo",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">¡Bienvenido a Lynx AI!</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Tu suscripción al plan <strong>${planNames[plan] ?? plan}</strong> está activa. Tu chatbot de IA está listo para instalarse en tu sitio web.
      </p>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #0369a1; font-size: 14px; margin: 0; font-weight: 600;">Próximos pasos:</p>
        <ol style="color: #374151; font-size: 14px; margin: 12px 0 0; padding-left: 20px; line-height: 2;">
          <li>Ve a <strong>Dashboard → Configuración del chatbot</strong> para personalizarlo</li>
          <li>Escanea tu sitio en <strong>Escáner de sitio</strong></li>
          <li>Copia el snippet desde <strong>Instalar snippet</strong> y pégalo en tu sitio</li>
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

// ─── Confirmación de pago ─────────────────────────────────────────────────────

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
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Tu pago de Lynx AI fue procesado exitosamente.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Plan</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${plan}</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Monto</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${amount}</td></tr>
          <tr><td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Próximo cobro</td><td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${nextBillingDate}</td></tr>
        </table>
      </div>
      ${FOOTER_TEXT()}
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Alerta de límite de uso ──────────────────────────────────────────────────

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
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
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
        Al alcanzar el límite, el widget dejará de responder hasta el próximo mes. Actualiza tu plan para evitar interrupciones.
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

// ─── Cancelación de suscripción ───────────────────────────────────────────────

export async function sendSubscriptionCancelledEmail(to: string, name: string, plan: string) {
  return sendEmail({
    to,
    subject: "Tu suscripción de Lynx AI ha sido cancelada",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: #6b7280; padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Suscripción cancelada</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Tu suscripción al plan <strong>${plan}</strong> ha sido cancelada. Tu chatbot seguirá funcionando hasta el final del período de facturación actual.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>¿Cambias de opinión?</strong> Puedes reactivar tu plan en cualquier momento desde el dashboard.
        </p>
      </div>
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="https://lynxaiassistant.com/dashboard/billing" style="${BTN_BLUE}">Reactivar plan →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">Lamentamos verte partir. <a href="mailto:support@lynxaiassistant.com" style="color: #3b82f6;">Cuéntanos cómo podemos mejorar.</a></p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Verificación de email ────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, name: string, token: string, origin: string) {
  const verifyUrl = `${origin}/api/auth/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "Verifica tu cuenta de Lynx AI",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Verifica tu email</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Gracias por registrarte en Lynx AI. Por favor verifica tu dirección de email para activar tu cuenta.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="${BTN_BLUE}">Verificar email →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">Este enlace expira en 24 horas. Si no creaste una cuenta, puedes ignorar este email con seguridad.</p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Reset de contraseña ──────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, token: string, origin: string) {
  const resetUrl = `${origin}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Restablece tu contraseña de Lynx AI",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_BLUE}">
      <img src="${LOGO_URL}" alt="Lynx AI" style="height: 36px; margin-bottom: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Restablecer contraseña</h1>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Recibimos una solicitud para restablecer tu contraseña de Lynx AI. Haz clic en el botón de abajo para elegir una nueva contraseña.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="${BTN_BLUE}">Restablecer contraseña →</a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">Este enlace expira en 1 hora. Si no solicitaste restablecer tu contraseña, puedes ignorar este email con seguridad.</p>
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
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">¡Nuevo lead capturado!</h1>
      ${chatbotName ? `<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">Chatbot: ${chatbotName}</p>` : ""}
    </div>
    <div style="${BODY_PAD}">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">Hola ${ownerName}, alguien dejó sus datos en el widget de tu chatbot:</p>
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
        ${pageUrl ? `<tr style="background:#f8fafc;"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-radius:0 0 0 8px;">Página</td><td style="padding:12px 16px;font-size:13px;color:#6b7280;border-radius:0 0 8px 0;">${pageUrl}</td></tr>` : ""}
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

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📋 Información del negocio</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Nombre del negocio", data.businessName)}
        ${row("Tipo de negocio", data.businessType)}
        ${row("Dominio deseado", data.websiteDomain)}
        ${row("Email de contacto", data.contactEmail)}
        ${row("Teléfono", data.contactPhone)}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🎨 Branding</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="color:#6b7280;font-size:14px;padding:8px 0;width:40%;">Color primario</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${colorSwatch(data.primaryColor)}</td></tr>
        <tr><td style="color:#6b7280;font-size:14px;padding:8px 0;width:40%;">Color secundario</td><td style="color:#111827;font-size:14px;font-weight:600;padding:8px 0;">${colorSwatch(data.secondaryColor)}</td></tr>
        ${data.logoUrl ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;">Logo</td><td style="padding:8px 0;"><a href="${data.logoUrl}" style="color:#3b82f6;">Ver logo →</a></td></tr>` : ""}
        ${data.aiIconUrl ? `<tr><td style="color:#6b7280;font-size:14px;padding:8px 0;">Ícono del AI</td><td style="padding:8px 0;"><a href="${data.aiIconUrl}" style="color:#3b82f6;">Ver ícono →</a></td></tr>` : ""}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🤖 Chatbot</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Nombre del chatbot", data.chatbotName)}
        ${row("Mensaje de bienvenida", data.chatbotWelcome)}
      </table>

      <h2 style="color: #111827; font-size: 16px; font-weight: 700; margin: 0 0 16px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📝 Detalles adicionales</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${row("Audiencia objetivo", data.targetAudience)}
        ${row("Páginas clave", data.keyPages)}
        ${row("Notas adicionales", data.additionalNotes)}
      </table>

      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px 20px; margin-top: 8px;">
        <p style="color: #92400e; font-size: 14px; font-weight: 700; margin: 0 0 4px;">⏱ Acción requerida</p>
        <p style="color: #78350f; font-size: 14px; margin: 0;">Responder al cliente en menos de 24 horas para confirmar la recepción y el timeline de entrega.</p>
      </div>

    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Recibo de activación de suscripción ─────────────────────────────────────

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
      <p style="color: #d1fae5; margin: 8px 0 0; font-size: 15px;">Tu suscripción está activa</p>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">Hola ${name || ""},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Tu suscripción al plan <strong>${displayPlan}</strong> ha sido activada exitosamente. Aquí está el resumen de tu pago:
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
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">Fecha de activación</td>
            <td style="color: #111827; font-size: 14px; font-weight: 700; text-align: right; padding: 10px 0;">${activatedAt}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 10px 0;">ID de suscripción</td>
            <td style="color: #6b7280; font-size: 12px; font-family: monospace; text-align: right; padding: 10px 0;">${subscriptionId}</td>
          </tr>
        </table>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px 20px; margin: 0 0 24px;">
        <p style="color: #065f46; font-size: 14px; margin: 0; font-weight: 600;">¿Qué incluye tu plan?</p>
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
    subject: `⚠️ ${pendingUsers.length} suscripción(es) atascada(s) en "pending" — Lynx AI`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">⚠️ Alerta: Pagos pendientes</h1>
      <p style="color: #fef3c7; margin: 8px 0 0; font-size: 15px;">${pendingUsers.length} usuario(s) pagaron pero su plan no se activó</p>
    </div>
    <div style="${BODY_PAD}">
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Los siguientes usuarios tienen una suscripción PayPal con status <strong>"pending"</strong> por más de 1 hora. Es posible que el webhook no haya llegado. Revisa manualmente en el panel de admin o activa el plan directamente.
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
      <p style="color: #9ca3af; font-size: 13px; margin: 0; text-align: center;">Este email se envía automáticamente cada hora cuando hay suscripciones atascadas.</p>
    </div>
  </div>
</body>
</html>`,
  });
}
