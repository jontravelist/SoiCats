-- Soi Dogs: sightings, comments, likes, favourites

create table public.sightings (
  id                  uuid primary key default gen_random_uuid(),
  dog_id              uuid references public.dogs (id) on delete set null,
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
create index sightings_dog_created_idx on public.sightings (dog_id, created_at desc);
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

create table public.user_favourite_dogs (
  user_id       uuid not null references public.users (id) on delete cascade,
  dog_id        uuid not null references public.dogs (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, dog_id)
);

create index favourites_dog_idx on public.user_favourite_dogs (dog_id);

create table public.identification_votes (
  sighting_id     uuid not null references public.sightings (id) on delete cascade,
  voter_id        uuid not null references public.users (id) on delete cascade,
  proposed_dog_id uuid references public.dogs (id) on delete set null,
  proposed_new    boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (sighting_id, voter_id),
  check (proposed_dog_id is not null or proposed_new = true)
);

create index id_votes_sighting_idx on public.identification_votes (sighting_id);

-- Recalculate territory centroid from the last 10 sightings of a dog.
-- Called by trigger on confirmed sightings and by recalculate-territory edge function.
create or replace function public.recalculate_territory(target_dog_id uuid)
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
    where dog_id = target_dog_id
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
    update public.dogs
       set territory_centroid = new_centroid,
           last_seen_at = greatest(last_seen_at, most_recent)
     where id = target_dog_id;
  end if;
end;
$$;

create or replace function public.sightings_after_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'confirmed' and new.dog_id is not null then
    perform public.recalculate_territory(new.dog_id);
  end if;
  return new;
end;
$$;

create trigger sightings_recalc_territory
  after insert or update of dog_id, status on public.sightings
  for each row execute function public.sightings_after_insert();
