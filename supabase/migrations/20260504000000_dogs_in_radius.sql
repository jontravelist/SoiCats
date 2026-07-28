-- dogs_in_radius: like nearby_dogs, but also returns the lng/lat of each dog's
-- territory centroid so the Map tab can pin markers at the right spot.
-- Uses a generous default radius so the map doesn't look empty.

create or replace function public.dogs_in_radius(
  lng       double precision,
  lat       double precision,
  radius_m  int default 50000,
  max_rows  int default 500
)
returns table (
  id              uuid,
  name            text,
  primary_color   text,
  pattern         text,
  status          dog_status,
  distance_m      double precision,
  last_seen_at    timestamptz,
  thumbnail_url   text,
  centroid_lng    double precision,
  centroid_lat    double precision
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
    st_x(c.territory_centroid::geometry) as centroid_lng,
    st_y(c.territory_centroid::geometry) as centroid_lat
  from public.dogs c
  where st_dwithin(c.territory_centroid, (select g from origin), radius_m)
    and c.status in ('active', 'injured', 'missing')
  order by distance_m asc
  limit max_rows;
$$;
