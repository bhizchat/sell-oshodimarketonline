-- Allows sx_billing_reminders.reminder_type to also store 'card_failed'
-- rows, sent to "Pay with Card" shops whose auto-debit failed (Paystack's
-- invoice.payment_failed webhook event) — see
-- src/app/api/paystack/webhook/route.ts. Reuses the same table/dedup
-- mechanism as the "Pay with Transfer" 7day/3day/expiry reminders (see
-- sx-transfer-reminders-schema.sql), keyed on
-- (shop_id, reminder_type, billing_cycle_at) so Paystack's automatic
-- retries of the same failed invoice don't send the email more than once
-- per billing cycle.
--
-- Safe to run multiple times (idempotent). Run this after
-- sx-transfer-reminders-schema.sql.

alter table public.sx_billing_reminders
  drop constraint if exists sx_billing_reminders_reminder_type_check;

alter table public.sx_billing_reminders
  add constraint sx_billing_reminders_reminder_type_check
  check (reminder_type in ('7day', '3day', 'expiry', 'card_failed'));
