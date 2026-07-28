-- Adds a sex enum + column to dogs. Defaults to 'unknown' so existing rows
-- keep working without backfill. Safe to run on a populated DB.

create type dog_sex as enum ('male', 'female', 'unknown');

alter table public.dogs
  add column sex dog_sex not null default 'unknown';
