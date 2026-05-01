-- Soi Cats: sightings, comments, likes, favourites

create table public.sightings (
  id                  uuid primary key default gen_random_uuid(),
  cat_id              uuid references public.cats (id) on delete set null,
  photographer_id     uuid not null references public.users (id) on delete cascade,
  photo_url           text not null,
  photo_hash          text,
  photo_embedding     vector(512),
  model_version       text,
  location            geography(Point, 4326) not null,
  location_accuracy_m int,
  caption             text,
  points_awarded      int not null default 0,
  status              sighting_status not null default 'confirmed',
  created_at          timestamptz not null default now()
);

create index sightings_location_idx on public.sightings using gist (location);
create index sightings_cat_created_idx on public.sightings (cat_id, created_at desc);
create index sightings_photographer_created_idx on public.sightings (photographer_id, created_at desc);
create index sightings_status_idx on public.sightings (status);
create index sightings_created_idx on public.sightings (created_at desc);

create table public.comments (
  id            uuid primary key default gen_random_uuid(),
  sighting_id   uuid not null references public.sightings (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  body          text not null check (length(body) between 1 and 1000),
  created_at    timestamptz not null default now()
);

create index comments_sighting_created_idx on public.comments (sighting_id, created_at);

create table public.likes (
  sighting_id   uuid not null references public.sightings (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (sighting_id, user_id)
);

create index likes_user_idx on public.likes (user_id);

create table public.user_favourite_cats (
  user_id       uuid not null references public.users (id) on delete cascade,
  cat_id        uuid not null references public.cats (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, cat_id)
);

create index favourites_cat_idx on public.user_favourite_cats (cat_id);

create table public.identification_votes (
  sighting_id     uuid not null references public.sightings (id) on delete cascade,
  voter_id        uuid not null references public.users (id) on delete cascade,
  proposed_cat_id uuid references public.cats (id) on delete set null,
  proposed_new    boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (sighting_id, voter_id),
  check (proposed_cat_id is not null or proposed_new = true)
);

create index id_votes_sighting_idx on public.identification_votes (sighting_id);

-- Recalculate territory centroid from the last 10 sightings of a cat.
-- Called by trigger on confirmed sightings and by recalculate-territory edge function.
create or replace function public.recalculate_territory(target_cat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_centroid geography(Point, 4326);
  most_recent  timestamptz;
begin
  with recent as (
    select location, created_at
    from public.sightings
    where cat_id = target_cat_id
      and status = 'confirmed'
    order by created_at desc
    limit 10
  )
  select
    st_centroid(st_collect(location::geometry))::geography,
    max(created_at)
  into new_centroid, most_recent
  from recent;

  if new_centroid is not null then
    update public.cats
       set territory_centroid = new_centroid,
           last_seen_at = greatest(last_seen_at, most_recent)
     where id = target_cat_id;
  end if;
end;
$$;

create or replace function public.sightings_after_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'confirmed' and new.cat_id is not null then
    perform public.recalculate_territory(new.cat_id);
  end if;
  return new;
end;
$$;

create trigger sightings_recalc_territory
  after insert or update of cat_id, status on public.sightings
  for each row execute function public.sightings_after_insert();
