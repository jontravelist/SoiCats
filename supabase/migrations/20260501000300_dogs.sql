-- Soi Dogs: dogs and clinics

create table public.clinics (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         text,
  location        geography(Point, 4326),
  contact_phone   text,
  contact_email   text,
  verified_at     timestamptz,
  verified_by     uuid references public.users (id),
  created_at      timestamptz not null default now()
);

create index clinics_location_idx on public.clinics using gist (location);

create table public.dogs (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  name_th                  text,
  discovered_by_user_id    uuid references public.users (id) on delete set null,
  discovered_at            timestamptz not null default now(),
  primary_color            text not null,
  pattern                  text not null,
  distinguishing_features  text,
  age_guess                dog_age_guess,
  territory_centroid       geography(Point, 4326) not null,
  last_seen_at             timestamptz not null default now(),
  status                   dog_status not null default 'active',
  tnr_status               tnr_status not null default 'unknown',
  tnr_confirmed_at         timestamptz,
  tnr_confirmed_by_clinic  uuid references public.clinics (id),
  vaccination_status       vaccination_status not null default 'unknown',
  last_vaccination_at      timestamptz,
  created_at               timestamptz not null default now()
);

create index dogs_territory_idx on public.dogs using gist (territory_centroid);
create index dogs_status_last_seen_idx on public.dogs (status, last_seen_at desc);
create index dogs_discovered_by_idx on public.dogs (discovered_by_user_id);
