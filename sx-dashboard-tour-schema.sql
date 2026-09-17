-- Tracks whether a shop owner has completed (or skipped) the one-time
-- "Getting Started" onboarding tour shown right after their first
-- successful payment lands them on /dashboard.
--
-- Safe to run multiple times (idempotent). Run this in the Supabase SQL
-- Editor after sx-subscription-cancel-schema.sql.

alter table public.sx_shops
  add column if not exists has_seen_dashboard_tour boolean not null default false;
