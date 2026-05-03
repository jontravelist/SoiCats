-- Welfare layer (BRIEF Phase 1.5):
--  - auto-verify flags inserted by feeders/admins, or any flag that has
--    corroboration from another open flag of the same type on the same cat
--  - award the original flagger +30 points on verification
--  - cats_needing_help RPC for the 'Needs help' pinned section on the Feed

create or replace function public.maybe_auto_verify_flag(target_flag uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  flag           record;
  flagger_role   user_role;
  corroborating  int;
  should_verify  boolean := false;
  next_status    cat_status;
begin
  select * into flag from public.cat_health_flags where id = target_flag;
  if not found or flag.status <> 'open' then
    return;
  end if;

  select role into flagger_role from public.users where id = flag.flagged_by;

  if flagger_role in ('feeder', 'app_admin') then
    should_verify := true;
  else
    select count(*) into corroborating
      from public.cat_health_flags
     where cat_id = flag.cat_id
       and flag_type = flag.flag_type
       and id <> flag.id
       and status in ('open', 'verified');
    if corroborating >= 1 then
      should_verify := true;
    end if;
  end if;

  if not should_verify then
    return;
  end if;

  next_status := case flag.flag_type
    when 'deceased' then 'deceased'::cat_status
    when 'missing'  then 'missing'::cat_status
    else                 'injured'::cat_status
  end;

  update public.cat_health_flags
     set status = 'verified', verified_at = now()
   where id = flag.id;
  update public.cats
     set status = next_status
   where id = flag.cat_id;

  -- Bonus to the flagger (BRIEF section 9). The points_log trigger updates
  -- the user's total + auto-unlocks any sticker tier.
  insert into public.points_log (user_id, action_type, points, related_entity_id, related_entity_type)
  values (flag.flagged_by, 'flag_verified', 30, flag.id, 'cat_health_flag');

  -- If there were corroborating open flags, verify them and pay them out too.
  -- We do this in a CTE so we only insert points-log rows for newly verified
  -- flags, not anything that was already verified.
  with promoted as (
    update public.cat_health_flags
       set status = 'verified', verified_at = now()
     where cat_id = flag.cat_id
       and flag_type = flag.flag_type
       and id <> flag.id
       and status = 'open'
    returning id, flagged_by
  )
  insert into public.points_log (user_id, action_type, points, related_entity_id, related_entity_type)
  select flagged_by, 'flag_verified', 30, id, 'cat_health_flag' from promoted;
end;
$$;

create or replace function public.cat_health_flags_after_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.maybe_auto_verify_flag(new.id);
  return new;
end;
$$;

drop trigger if exists cat_health_flags_auto_verify on public.cat_health_flags;
create trigger cat_health_flags_auto_verify
  after insert on public.cat_health_flags
  for each row execute function public.cat_health_flags_after_insert();

-- Cats with a currently-verified, unresolved flag — what powers the
-- 'Needs help' pinned section. Returns the most recent verified flag per cat.
create or replace function public.cats_needing_help(
  lng       double precision default null,
  lat       double precision default null,
  radius_m  int default 50000,
  max_rows  int default 20
)
returns table (
  cat_id        uuid,
  cat_name      text,
  flag_id       uuid,
  flag_type     flag_type,
  flagged_at    timestamptz,
  description   text,
  thumbnail_url text,
  distance_m    double precision,
  centroid_lng  double precision,
  centroid_lat  double precision
)
language sql
stable
as $$
  with origin as (
    select case when lng is not null and lat is not null
      then st_setsrid(st_makepoint(lng, lat), 4326)::geography
    end as g
  ),
  latest_flag as (
    select distinct on (f.cat_id)
      f.id, f.cat_id, f.flag_type, f.created_at, f.description
    from public.cat_health_flags f
    where f.status = 'verified'
      and f.resolved_at is null
    order by f.cat_id, f.created_at desc
  )
  select
    c.id,
    c.name,
    lf.id,
    lf.flag_type,
    lf.created_at,
    lf.description,
    (
      select s.photo_url from public.sightings s
       where s.cat_id = c.id and s.status = 'confirmed'
       order by s.created_at desc limit 1
    ),
    case when (select g from origin) is not null
      then st_distance(c.territory_centroid, (select g from origin))
    end,
    st_x(c.territory_centroid::geometry),
    st_y(c.territory_centroid::geometry)
  from latest_flag lf
  join public.cats c on c.id = lf.cat_id
  where (select g from origin) is null
     or st_dwithin(c.territory_centroid, (select g from origin), radius_m)
  order by lf.created_at desc
  limit max_rows;
$$;

-- For the cat profile: latest open/verified flag (so we can show 'Reported
-- injured' or similar without a separate request).
create or replace function public.latest_flag_for_cat(target_cat uuid)
returns table (
  id          uuid,
  flag_type   flag_type,
  status      flag_status,
  description text,
  created_at  timestamptz
)
language sql
stable
as $$
  select id, flag_type, status, description, created_at
    from public.cat_health_flags
   where cat_id = target_cat
     and resolved_at is null
   order by created_at desc
   limit 1;
$$;
