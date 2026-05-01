-- Soi Cats: welfare layer (flags, feed logs, clinic updates)

create table public.cat_health_flags (
  id              uuid primary key default gen_random_uuid(),
  cat_id          uuid not null references public.cats (id) on delete cascade,
  flagged_by      uuid not null references public.users (id) on delete cascade,
  flag_type       flag_type not null,
  description     text,
  photo_url       text,
  status          flag_status not null default 'open',
  verified_at     timestamptz,
  verified_by     uuid references public.users (id),
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index flags_cat_idx on public.cat_health_flags (cat_id);
create index flags_status_idx on public.cat_health_flags (status);

create table public.feed_logs (
  id            uuid primary key default gen_random_uuid(),
  cat_id        uuid not null references public.cats (id) on delete cascade,
  feeder_id     uuid not null references public.users (id) on delete cascade,
  fed_at        timestamptz not null default now(),
  location      geography(Point, 4326),
  notes         text,
  photo_url     text,
  created_at    timestamptz not null default now()
);

create index feed_logs_cat_fed_idx on public.feed_logs (cat_id, fed_at desc);
create index feed_logs_feeder_idx on public.feed_logs (feeder_id);

create table public.clinic_updates (
  id              uuid primary key default gen_random_uuid(),
  cat_id          uuid not null references public.cats (id) on delete cascade,
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  update_type     clinic_update_type not null,
  notes           text,
  performed_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index clinic_updates_cat_idx on public.clinic_updates (cat_id, performed_at desc);

-- When a clinic update lands, propagate the relevant status to cats.
-- This is the only way cats.tnr_status / vaccination_status / last_vaccination_at change
-- (RLS denies direct updates by non-admins).
create or replace function public.apply_clinic_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.update_type = 'sterilisation' then
    update public.cats
       set tnr_status = case
             when tnr_status = 'ear_tipped' then 'sterilised'::tnr_status
             else 'sterilised'::tnr_status
           end,
           tnr_confirmed_at = new.performed_at,
           tnr_confirmed_by_clinic = new.clinic_id
     where id = new.cat_id;
  elsif new.update_type = 'ear_tip' then
    update public.cats
       set tnr_status = case
             when tnr_status = 'sterilised' then tnr_status
             else 'ear_tipped'::tnr_status
           end,
           tnr_confirmed_at = coalesce(tnr_confirmed_at, new.performed_at),
           tnr_confirmed_by_clinic = coalesce(tnr_confirmed_by_clinic, new.clinic_id)
     where id = new.cat_id;
  elsif new.update_type = 'vaccination' then
    update public.cats
       set vaccination_status = 'fully_vaccinated'::vaccination_status,
           last_vaccination_at = new.performed_at
     where id = new.cat_id;
  end if;
  return new;
end;
$$;

create trigger clinic_updates_apply
  after insert on public.clinic_updates
  for each row execute function public.apply_clinic_update();
