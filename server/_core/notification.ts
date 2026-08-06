/**
 * Owner notifications — email edition.
 *
 * Previously dispatched through the Manus Notification Service; now delivers
 * via email (Resend) to the platform admin. Configure ADMIN_EMAIL in the
 * environment; falls back to RESEND_FROM_EMAIL's address when unset.
 * Returns `true` on success, `false` when email is not configured or the
 * provider rejects the message — callers already treat `false` as a soft
 * failure, so behavior is unchanged.
 */
import { sendOwnerNotificationEmail } from "../email";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const clamp = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

const resolveAdminEmail = (): string | undefined => {
  const explicit = process.env.ADMIN_EMAIL?.trim();
  if (explicit) return explicit;
  // RESEND_FROM_EMAIL may be "Name <addr@domain>" — extract the address.
  const from = process.env.RESEND_FROM_EMAIL ?? "";
  const match = from.match(/<([^>]+)>/);
  const addr = (match ? match[1] : from).trim();
  return addr.includes("@") ? addr : undefined;
};

export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const title = clamp((payload.title ?? "").trim(), TITLE_MAX_LENGTH);
  const content = clamp((payload.content ?? "").trim(), CONTENT_MAX_LENGTH);
  if (!title || !content) {
    console.warn("[Notification] Skipped: title and content are required.");
    return false;
  }

  const adminEmail = resolveAdminEmail();
  if (!adminEmail) {
    console.warn(
      "[Notification] Skipped: set ADMIN_EMAIL (or RESEND_FROM_EMAIL) to receive owner notifications."
    );
    return false;
  }

  try {
    return await sendOwnerNotificationEmail(adminEmail, title, content);
  } catch (error) {
    console.warn("[Notification] Failed to send owner notification email:", error);
    return false;
  }
}
