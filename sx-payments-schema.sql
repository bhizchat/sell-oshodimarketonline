-- Adds Paystack subscription/billing state to sx_shops and a new
-- sx_payments table logging every Paystack transaction, linked back to
-- the shop's shop_code (e.g. "OMO-0001") so payments can always be
-- traced to a specific shop.
--
-- Billing model: a shop's card is captured via a small refundable
-- verification charge (see /api/paystack/initialize + /verify), then a
-- Paystack subscription is created with a future start_date (trial end),
-- so the real ₦10,000/month charge only happens after the free trial.
--
-- subscription_status lifecycle:
--   'none'      -> shop has never started checkout
--   'trialing'  -> card verified, subscription scheduled, trial active
--   'active'    -> at least one real recurring charge has succeeded
--   'past_due'  -> a recurring charge failed
--   'canceled'  -> subscription was disabled/canceled
--
-- Safe to run multiple times (idempotent). Run this in the Supabase SQL
-- Editor after sx-shop-code-schema.sql.

alter table public.sx_shops
  add column if not exists subscription_status text not null default 'none',
  add column if not exists paystack_customer_code text,
  add column if not exists paystack_authorization_code text,
  add column if not exists paystack_subscription_code text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists next_billing_at timestamptz;

alter table public.sx_shops drop constraint if exists sx_shops_subscription_status_check;
alter table public.sx_shops
  add constraint sx_shops_subscription_status_check
  check (subscription_status in ('none', 'trialing', 'active', 'past_due', 'canceled'));

create table if not exists public.sx_payments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.sx_shops(id) on delete cascade,
  shop_code text,
  user_id uuid references auth.users(id) on delete set null,
  reference text not null unique,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'pending',
  purpose text not null default 'card_verification',
  paystack_transaction_id text,
  authorization_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sx_payments drop constraint if exists sx_payments_status_check;
alter table public.sx_payments
  add constraint sx_payments_status_check
  check (status in ('pending', 'success', 'failed', 'refunded'));

alter table public.sx_payments drop constraint if exists sx_payments_purpose_check;
alter table public.sx_payments
  add constraint sx_payments_purpose_check
  check (purpose in ('card_verification', 'subscription_charge', 'manual'));

create index if not exists sx_payments_shop_id_idx on public.sx_payments (shop_id);

alter table public.sx_payments enable row level security;

-- Owners can view their own shop's payment history. All writes happen
-- server-side via the Supabase service-role key (webhook/verify routes),
-- which bypasses RLS entirely — so no insert/update policy is defined
-- here on purpose.
drop policy if exists "Owners can view their own shop payments" on public.sx_payments;
create policy "Owners can view their own shop payments"
on public.sx_payments
for select
to authenticated
using (
  exists (
    select 1 from public.sx_shops s
    where s.id = shop_id and s.owner_id = auth.uid()
  )
);
