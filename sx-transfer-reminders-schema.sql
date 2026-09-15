-- Tracks which "Pay with Transfer" renewal reminder emails have already
-- been sent for each shop's current billing cycle, so the daily cron job
-- at /api/cron/transfer-reminders never sends the same reminder twice.
--
-- Only transfer-paying shops need this (see sx-subscription-transfer
-- -schema.sql) — card payers auto-renew via Paystack's own auto-debit +
-- webhook, so they never need a "please pay manually" reminder.
--
-- One row per (shop, billing cycle, reminder type). billing_cycle_at is
-- a copy of sx_shops.next_billing_at at the moment the reminder was sent
-- — since next_billing_at moves forward by 30 days every time a shop
-- pays again, keying on it (rather than just shop_id + reminder_type)
-- naturally allows the same reminder type to fire again next cycle.
--
-- Server-only table (written by the cron job's service-role client) —
-- RLS is enabled with no policies, so it's fully inaccessible to
-- anon/authenticated clients and reachable only via the service role key.
--
-- Safe to run multiple times (idempotent). Run this in the Supabase SQL
-- Editor after sx-subscription-transfer-schema.sql.

create table if not exists public.sx_billing_reminders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.sx_shops(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('7day', '3day', 'expiry')),
  billing_cycle_at timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (shop_id, reminder_type, billing_cycle_at)
);

alter table public.sx_billing_reminders enable row level security;

create index if not exists sx_billing_reminders_shop_id_idx
  on public.sx_billing_reminders (shop_id);
