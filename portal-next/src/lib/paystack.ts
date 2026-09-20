import crypto from 'crypto';

// Thin server-only wrapper around the Paystack REST API. Never import
// this from a Client Component — it reads PAYSTACK_SECRET_KEY, which
// must never reach the browser.
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// One-time refundable charge used to capture a reusable card
// authorization when a shop starts its free trial via card. Refunded
// immediately after the trial subscription is scheduled (see
// /api/paystack/verify) — it exists purely to verify the card works and
// save its authorization code, never kept as real revenue.
export const CARD_VERIFICATION_AMOUNT_KOBO = 5000; // ₦50

// Real subscription amount — this is what both billing methods actually
// cost once a shop's free trial ends (or immediately, for a shop that has
// already used its trial and is paying again). Kept here only for
// reference/UI copy — the source of truth for what Paystack actually
// auto-debits on renewal is the Plan itself (PAYSTACK_PLAN_CODE), created
// once via the Paystack Plan API.
export const SUBSCRIPTION_AMOUNT_KOBO = 1_000_000; // ₦10,000

// Length of the one-time free trial offered to a shop the first time it
// sets up billing (card or transfer) — see /api/paystack/initialize and
// /verify. A shop is only ever trial-eligible once: after its first trial
// or payment, `sx_shops.subscription_status` never returns to 'none'.
export const TRIAL_DAYS = 30;

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error('PAYSTACK_SECRET_KEY is not configured.');

  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || `Paystack request to ${path} failed.`);
  }
  return json as T;
}

export type PaystackInitializeResponse = {
  data: { authorization_url: string; access_code: string; reference: string };
};

// Initializes the small card-verification transaction. `callback_url` is
// only used as a fallback for redirect-based checkout; the popup flow
// resolves via the client-side onSuccess callback + our own /verify call.
//
// `channels` restricts which payment methods Paystack's popup offers —
// used to force the "Pay with Transfer" flow (bank_transfer only) for
// the real ₦10,000 transfer-based subscription payment, as opposed to
// the default card-only ₦50 verification charge. Omit it to let Paystack
// show whatever channels are enabled on the dashboard.
export function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
  channels?: string[];
}) {
  return paystackFetch<PaystackInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      currency: 'NGN',
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      ...(params.channels ? { channels: params.channels } : {}),
    }),
  });
}

export type PaystackVerifyResponse = {
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    id: number;
    amount: number;
    customer: { customer_code: string; email: string };
    authorization: { authorization_code: string; reusable: boolean };
  };
};

export function verifyTransaction(reference: string) {
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  });
}

// Refunds the small verification charge — it was only ever meant to
// capture a reusable card authorization, not to be kept as real revenue.
// Paystack processes refunds asynchronously; we fire this and don't
// block the user's checkout flow on its completion.
export function refundTransaction(transactionId: number | string) {
  return paystackFetch('/refund', {
    method: 'POST',
    body: JSON.stringify({ transaction: transactionId }),
  });
}

export type PaystackSubscriptionResponse = {
  data: { subscription_code: string; email_token: string };
};

// Schedules the real recurring subscription to begin at `startDate`
// (end of the free trial) using the authorization captured above, so no
// further customer action is needed once the trial ends.
export function createSubscription(params: {
  customerCode: string;
  authorizationCode: string;
  startDate: Date;
}) {
  return paystackFetch<PaystackSubscriptionResponse>('/subscription', {
    method: 'POST',
    body: JSON.stringify({
      customer: params.customerCode,
      plan: process.env.PAYSTACK_PLAN_CODE,
      authorization: params.authorizationCode,
      start_date: params.startDate.toISOString(),
    }),
  });
}

// Cancels a recurring subscription so no further charges happen. Requires
// both the subscription code AND its email_token (returned once, at
// creation time by createSubscription above) — Paystack rejects the
// request without it. This stops FUTURE billing only; it does not revoke
// access already paid for for the current period (see
// sx-subscription-cancel-schema.sql for how that's handled).
export function disableSubscription(params: { subscriptionCode: string; emailToken: string }) {
  return paystackFetch<{ message: string }>('/subscription/disable', {
    method: 'POST',
    body: JSON.stringify({ code: params.subscriptionCode, token: params.emailToken }),
  });
}

// Verifies the `x-paystack-signature` header on incoming webhook
// requests: HMAC-SHA512 of the raw request body, keyed with the secret
// key. Paystack recommends this check so arbitrary requests can't be
// spoofed to fake a successful payment.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return false;
  const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  return hash === signature;
}
