-- Soi Cats: sticker packs, points log, device tokens

create table public.sticker_packs (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  artist_name         text not null,
  artist_credit_url   text,
  unlock_threshold    int not null,
  release_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create table public.stickers (
  id              uuid primary key default gen_random_uuid(),
  pack_id         uuid not null references public.sticker_packs (id) on delete cascade,
  name            text not null,
  image_url       text not null,
  sort_order      int not null default 0
);

create index stickers_pack_idx on public.stickers (pack_id, sort_order);

create table public.user_stickers (
  user_id       uuid not null references public.users (id) on delete cascade,
  sticker_id    uuid not null references public.stickers (id) on delete cascade,
  unlocked_at   timestamptz not null default now(),
  primary key (user_id, sticker_id)
);

create table public.points_log (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  action_type         text not null,
  points              int not null,
  related_entity_id   uuid,
  related_entity_type text,
  created_at          timestamptz not null default now()
);

create index points_log_user_created_idx on public.points_log (user_id, created_at desc);
create index points_log_action_idx on public.points_log (action_type, created_at desc);

-- Keep users.points in sync as the sum of points_log.
-- We never let clients write to users.points directly (RLS).
create or replace function public.points_log_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total int;
begin
  update public.users
     set points = points + new.points
   where id = new.user_id
   returning points into new_total;

  -- Auto-unlock stickers when crossing thresholds.
  insert into public.user_stickers (user_id, sticker_id)
  select new.user_id, s.id
    from public.stickers s
    join public.sticker_packs p on p.id = s.pack_id
   where p.unlock_threshold <= new_total
     and p.release_at <= now()
  on conflict do nothing;

  return new;
end;
$$;

create trigger points_log_apply
  after insert on public.points_log
  for each row execute function public.points_log_after_insert();

create table public.device_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  token         text not null unique,
  platform      text not null check (platform in ('ios', 'android')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index device_tokens_user_idx on public.device_tokens (user_id);

create table public.notification_settings (
  user_id              uuid primary key references public.users (id) on delete cascade,
  favourite_cat_photo  boolean not null default true,
  injured_or_missing   boolean not null default true,
  sticker_unlocked     boolean not null default true,
  comment_on_my_photo  boolean not null default false,
  identify_resolved    boolean not null default true
);
