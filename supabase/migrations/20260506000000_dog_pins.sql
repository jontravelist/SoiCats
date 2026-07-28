-- Recent sighting pins for the territory map on a dog profile.
-- Returns lng/lat as plain doubles so the client doesn't need to parse PostGIS.

create or replace function public.dog_recent_sighting_pins(
  target_dog uuid,
  max_rows   int default 10
)
returns table (
  sighting_id uuid,
  lng         double precision,
  lat         double precision,
  created_at  timestamptz,
  photo_url   text
)
language sql
stable
as $$
  select
    s.id,
    st_x(s.location::geometry),
    st_y(s.location::geometry),
    s.created_at,
    s.photo_url
  from public.sightings s
  where s.dog_id = target_dog
    and s.status = 'confirmed'
  order by s.created_at desc
  limit max_rows;
$$;
