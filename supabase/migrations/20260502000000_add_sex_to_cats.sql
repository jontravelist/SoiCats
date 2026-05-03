-- Adds a sex enum + column to cats. Defaults to 'unknown' so existing rows
-- keep working without backfill. Safe to run on a populated DB.

create type cat_sex as enum ('male', 'female', 'unknown');

alter table public.cats
  add column sex cat_sex not null default 'unknown';
