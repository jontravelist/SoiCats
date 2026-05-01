-- Soi Cats: RPC helpers used by Edge Functions.

-- recent_close_sighting: true if `photographer` posted another sighting of
-- `target_cat` within `radius_m` since `since`, excluding `exclude_id`.
-- Used by the award-points farming check.
create or replace function public.recent_close_sighting(
  photographer uuid,
  target_cat   uuid,
  exclude_id   uuid,
  radius_m     int,
  since        timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with anchor as (
    select location from public.sightings where id = exclude_id
  )
  select exists (
    select 1
      from public.sightings s, anchor a
     where s.photographer_id = photographer
       and s.cat_id = target_cat
       and s.id <> exclude_id
       and s.created_at >= since
       and st_dwithin(s.location, a.location, radius_m)
  );
$$;
