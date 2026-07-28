-- Soi Dogs: RPC helpers used by the mobile app.

-- nearby_dogs: dogs whose territory centroid is within `radius_m` of (lng, lat),
-- limited to active/injured/missing and seen in the last 90 days.
-- Returns thumbnail (most recent confirmed sighting photo) for the picker UI.
create or replace function public.nearby_dogs(
  lng       double precision,
  lat       double precision,
  radius_m  int default 150,
  max_rows  int default 8
)
returns table (
  id              uuid,
  name            text,
  name_th         text,
  primary_color   text,
  pattern         text,
  status          dog_status,
  distance_m      double precision,
  last_seen_at    timestamptz,
  thumbnail_url   text,
  photo_count     bigint
)
language sql
stable
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select
    c.id,
    c.name,
    c.name_th,
    c.primary_color,
    c.pattern,
    c.status,
    st_distance(c.territory_centroid, (select g from origin)) as distance_m,
    c.last_seen_at,
    (
      select s.photo_url from public.sightings s
       where s.dog_id = c.id and s.status = 'confirmed'
       order by s.created_at desc limit 1
    ) as thumbnail_url,
    (
      select count(*) from public.sightings s
       where s.dog_id = c.id and s.status = 'confirmed'
    ) as photo_count
  from public.dogs c
  where st_dwithin(c.territory_centroid, (select g from origin), radius_m)
    and c.status in ('active', 'injured', 'missing')
    and c.last_seen_at > now() - interval '90 days'
  order by distance_m asc
  limit max_rows;
$$;

-- nearby_feed: confirmed sightings within `radius_m`, ordered newest first.
create or replace function public.nearby_feed(
  lng       double precision,
  lat       double precision,
  radius_m  int default 5000,
  max_rows  int default 50,
  before    timestamptz default null
)
returns table (
  sighting_id     uuid,
  dog_id          uuid,
  dog_name        text,
  photographer_id uuid,
  photographer_handle text,
  photo_url       text,
  caption         text,
  distance_m      double precision,
  created_at      timestamptz,
  like_count      bigint,
  comment_count   bigint
)
language sql
stable
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select
    s.id,
    s.dog_id,
    c.name,
    s.photographer_id,
    u.handle,
    s.photo_url,
    s.caption,
    st_distance(s.location, (select g from origin)) as distance_m,
    s.created_at,
    (select count(*) from public.likes l where l.sighting_id = s.id) as like_count,
    (select count(*) from public.comments cm where cm.sighting_id = s.id) as comment_count
  from public.sightings s
  left join public.dogs  c on c.id = s.dog_id
  left join public.users u on u.id = s.photographer_id
  where s.status = 'confirmed'
    and st_dwithin(s.location, (select g from origin), radius_m)
    and (before is null or s.created_at < before)
  order by s.created_at desc
  limit max_rows;
$$;

-- following_feed: sightings of dogs the user has favourited or photographed.
create or replace function public.following_feed(
  max_rows  int default 50,
  before    timestamptz default null
)
returns table (
  sighting_id     uuid,
  dog_id          uuid,
  dog_name        text,
  photographer_id uuid,
  photographer_handle text,
  photo_url       text,
  caption         text,
  created_at      timestamptz,
  like_count      bigint,
  comment_count   bigint
)
language sql
stable
as $$
  with my_dogs as (
    select dog_id from public.user_favourite_dogs where user_id = auth.uid()
    union
    select dog_id from public.sightings where photographer_id = auth.uid() and dog_id is not null
  )
  select
    s.id,
    s.dog_id,
    c.name,
    s.photographer_id,
    u.handle,
    s.photo_url,
    s.caption,
    s.created_at,
    (select count(*) from public.likes l where l.sighting_id = s.id) as like_count,
    (select count(*) from public.comments cm where cm.sighting_id = s.id) as comment_count
  from public.sightings s
  join my_dogs m on m.dog_id = s.dog_id
  left join public.dogs  c on c.id = s.dog_id
  left join public.users u on u.id = s.photographer_id
  where s.status = 'confirmed'
    and (before is null or s.created_at < before)
  order by s.created_at desc
  limit max_rows;
$$;

-- duplicate_candidates: dogs within 80m with same primary_color + pattern.
-- Used by the "wait, could this be one of these?" interstitial when creating a new dog.
create or replace function public.duplicate_candidates(
  lng           double precision,
  lat           double precision,
  primary_color text,
  pattern       text
)
returns table (
  id            uuid,
  name          text,
  distance_m    double precision,
  thumbnail_url text
)
language sql
stable
as $$
  with origin as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select
    c.id,
    c.name,
    st_distance(c.territory_centroid, (select g from origin)),
    (
      select s.photo_url from public.sightings s
       where s.dog_id = c.id and s.status = 'confirmed'
       order by s.created_at desc limit 1
    )
  from public.dogs c
  where st_dwithin(c.territory_centroid, (select g from origin), 80)
    and c.primary_color = duplicate_candidates.primary_color
    and c.pattern       = duplicate_candidates.pattern
    and c.status in ('active', 'injured', 'missing')
  order by st_distance(c.territory_centroid, (select g from origin));
$$;

-- points_today: sum of points awarded to the calling user since midnight UTC.
-- Used by the daily-cap check in the award-points edge function.
create or replace function public.points_today(target_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(points), 0)::int
    from public.points_log
   where user_id = target_user
     and created_at >= date_trunc('day', now());
$$;
