-- Email one-time-code (OTP) second step for password login — see
-- src/app/api/auth/login/route.ts and src/app/api/auth/otp/*.
--
-- One row per in-flight login. The browser only holds a random token in an
-- httpOnly cookie; the DB stores sha256(token) and an HMAC of the 6-digit
-- code, so a leaked table can't be used to sign in. Only the service-role
-- admin client touches this table (RLS is on with NO policies, so the
-- anon/authenticated roles are denied everything).
--
-- Safe to run multiple times (idempotent). Rows are single-use and expire
-- after 10 minutes; the login route purges stale rows opportunistically.

create table if not exists public.sx_login_challenges (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text not null,
  code_hash     text not null,
  expires_at    timestamptz not null,
  attempts      integer not null default 0,
  send_count    integer not null default 1,
  last_sent_at  timestamptz not null default now(),
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists sx_login_challenges_user_id_idx
  on public.sx_login_challenges (user_id);

create index if not exists sx_login_challenges_expires_at_idx
  on public.sx_login_challenges (expires_at);

alter table public.sx_login_challenges enable row level security;
