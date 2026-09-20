// Sends transactional emails via Resend's REST API (no SDK dependency —
// this is the same Resend account already used as Supabase Auth's custom
// SMTP provider, but this hits Resend's HTTP API directly since Supabase
// Auth's SMTP integration only covers its own built-in auth emails, not
// arbitrary app-triggered emails like billing reminders).
const RESEND_API_URL = 'https://api.resend.com/emails';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  if (!from) throw new Error('EMAIL_FROM is not configured.');

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend send failed (${response.status}): ${body}`);
  }
}

export type TransferReminderKind = '7day' | '3day' | 'expiry';

const SUBJECT_BY_KIND: Record<TransferReminderKind, string> = {
  '7day': 'Your Oshodi Market Online subscription renews in 7 days',
  '3day': 'Renewal due in 3 days — action needed',
  expiry: 'Your access has expired — renew now',
};

const HEADLINE_BY_KIND: Record<TransferReminderKind, string> = {
  '7day': 'Renewal reminder',
  '3day': 'Only 3 days left to renew',
  expiry: 'Your access has expired',
};

function bodyByKind(kind: TransferReminderKind, shopName: string, dueDateLabel: string): string {
  switch (kind) {
    case '7day':
      return `Your bank-transfer plan for <strong>${shopName}</strong> is due for renewal on <strong>${dueDateLabel}</strong>. To keep your shop dashboard, products and reviews accessible, please transfer &#8358;10,000 before then.`;
    case '3day':
      return `Your bank-transfer plan for <strong>${shopName}</strong> is due in just 3 days, on <strong>${dueDateLabel}</strong>. Please make your &#8358;10,000 transfer soon to avoid losing access.`;
    case 'expiry':
      return `Access for <strong>${shopName}</strong> expired today. Your dashboard, product listings and reviews are paused until you renew with a &#8358;10,000 transfer.`;
  }
}

// Renders the reminder email as a self-contained HTML string (no external
// stylesheet — most email clients strip <style> tags from the <head>, so
// everything is inlined) using the same light-purple brand palette as the
// rest of the portal (see components/brand-panel.tsx).
export function buildTransferReminderEmail(
  kind: TransferReminderKind,
  shopName: string,
  dueDateLabel: string,
  payUrl: string
): { subject: string; html: string } {
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #4B2E83;">Oshodi Market Online</span>
      </div>
      <h1 style="font-size: 1.2rem; font-weight: 800; color: #1d2734; margin: 0 0 12px;">${HEADLINE_BY_KIND[kind]}</h1>
      <p style="font-size: 0.9rem; line-height: 1.6; color: #4b4d57; margin: 0 0 24px;">${bodyByKind(kind, shopName, dueDateLabel)}</p>
      <a href="${payUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 10px; background: #6c5ce7; color: #ffffff; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Renew with Bank Transfer</a>
      <p style="font-size: 0.75rem; color: #a9aaad; margin-top: 32px;">If you've already made this transfer, you can ignore this email — access updates automatically once we confirm payment.</p>
    </div>
  `;

  return { subject: SUBJECT_BY_KIND[kind], html };
}
