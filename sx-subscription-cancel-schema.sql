-- Adds the ability for a card-paying shop owner to cancel their
-- recurring subscription from the Payments & Billing page.
--
-- cancel_at_period_end: set true the moment the owner clicks "Cancel
-- Subscription" (or Paystack itself reports the subscription as
-- disabled/not-renewing via webhook). We deliberately do NOT immediately
-- flip subscription_status to 'canceled' here — the shop keeps full
-- access for the rest of the period they already paid for (trial_ends_at
-- / next_billing_at), matching the UI's existing promise ("You can
-- cancel anytime before <date> to avoid being charged"). hasActiveAccess()
-- in lib/shop.ts already naturally revokes access once that date passes,
-- since it checks accessUntil regardless of subscription_status.
--
-- paystack_email_token: Paystack's subscription/disable endpoint requires
-- both the subscription_code AND the email_token that was returned when
-- the subscription was first created (see /api/paystack/verify) — it's
-- not optional, so it must be stored at creation time to be able to
-- cancel later.
--
-- Safe to run multiple times (idempotent). Run this in the Supabase SQL
-- Editor after sx-subscription-transfer-schema.sql.

alter table public.sx_shops
  add column if not exists paystack_email_token text,
  add column if not exists cancel_at_period_end boolean not null default false;
