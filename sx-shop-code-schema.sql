-- Adds a short, human-readable "shop_code" to sx_shops (e.g. "OMO-0001",
-- "OMO-0002", ...) so shop owners/staff never have to look at the raw
-- uuid `id` column. Codes are assigned serially in creation order via a
-- dedicated sequence, both for existing rows (backfill below) and future
-- inserts (trigger below) — so numbering never has gaps or gets reused.
--
-- Safe to run multiple times (idempotent). Run this in the Supabase SQL
-- Editor after sx-shops-schema.sql.

create sequence if not exists public.sx_shop_code_seq;

alter table public.sx_shops
  add column if not exists shop_code text unique;

-- Assign the next sequence value as a shop's shop_code on insert, unless
-- one was already provided.
create or replace function public.sx_set_shop_code()
returns trigger
language plpgsql
as $$
begin
  if new.shop_code is null then
    new.shop_code := 'OMO-' || lpad(nextval('public.sx_shop_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists sx_shops_set_shop_code on public.sx_shops;
create trigger sx_shops_set_shop_code
before insert on public.sx_shops
for each row
execute function public.sx_set_shop_code();

-- Backfill any existing shops (created before this migration) in
-- creation order, drawing from the same sequence so future inserts
-- continue numbering where the backfill left off.
do $$
declare
  r record;
  next_seq bigint;
begin
  for r in
    select id from public.sx_shops where shop_code is null order by created_at asc
  loop
    next_seq := nextval('public.sx_shop_code_seq');
    update public.sx_shops
    set shop_code = 'OMO-' || lpad(next_seq::text, 4, '0')
    where id = r.id;
  end loop;
end $$;

-- Expose shop_code through the public-safe view too (it's not sensitive —
-- it's meant to be shown/shared, unlike the internal uuid).
-- CREATE OR REPLACE VIEW can't reorder/insert columns among existing
-- ones (only append at the end), and shop_code needs to sit right after
-- id, so drop and recreate instead of replacing in place.
drop view if exists public.sx_shops_public;
create view public.sx_shops_public as
select
  id,
  shop_code,
  shop_name,
  category,
  market_platform,
  location,
  tagline,
  phone,
  whatsapp,
  logo_url,
  banner_url,
  created_at
from public.sx_shops;

grant select on public.sx_shops_public to anon, authenticated;
