-- Adds support for "Pay with Bank Transfer" as a second checkout method
-- alongside the existing card-verification + auto-renewing subscription
-- flow (see sx-payments-schema.sql).
--
-- Billing model recap:
--   'card'     -> shop pays a refundable ₦50 to verify their card, gets a
--                 30-day free trial, then Paystack auto-debits ₦10,000/mo
--                 forever via a Paystack subscription (see /api/paystack
--                 /initialize + /verify with the existing card flow).
--   'transfer' -> shop pays the REAL ₦10,000 up front via Paystack's
--                 "Pay with Transfer" channel (a temporary bank account
--                 Paystack generates per-transaction). There is no
--                 reusable authorization from a transfer, so there is
--                 NOTHING to auto-debit next month — access is granted
--                 for exactly 30 days from payment, and the shop must
--                 manually pay again before next_billing_at to keep
--                 access. (Email reminders for this are a follow-up, not
--                 part of this migration.)
--
-- billing_method records which of the two paths a shop is currently on,
-- so the dashboard/payments-billing page can show the right renewal UI
-- and so hasActiveAccess() can enforce the 30-day expiry for transfer
-- payers (card payers are kept current by Paystack's own auto-debit +
-- webhook, so this expiry check is a no-op for them as long as billing
-- keeps succeeding).
--
-- Safe to run multiple times (idempotent). Run this in the Supabase SQL
-- Editor after sx-payments-schema.sql.

alter table public.sx_shops
  add column if not exists billing_method text;

alter table public.sx_shops drop constraint if exists sx_shops_billing_method_check;
alter table public.sx_shops
  add constraint sx_shops_billing_method_check
  check (billing_method is null or billing_method in ('card', 'transfer'));

alter table public.sx_payments drop constraint if exists sx_payments_purpose_check;
alter table public.sx_payments
  add constraint sx_payments_purpose_check
  check (purpose in ('card_verification', 'subscription_charge', 'subscription_transfer', 'manual'));
