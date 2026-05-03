-- Recent sighting pins for the territory map on a cat profile.
-- Returns lng/lat as plain doubles so the client doesn't need to parse PostGIS.

create or replace function public.cat_recent_sighting_pins(
  target_cat uuid,
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
  where s.cat_id = target_cat
    and s.status = 'confirmed'
  order by s.created_at desc
  limit max_rows;
$$;
