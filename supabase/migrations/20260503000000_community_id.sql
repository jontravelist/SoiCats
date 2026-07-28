-- Community identification: queue RPC + auto-resolve trigger.

-- pending_identifications: sightings the caller has neither posted nor voted
-- on yet, returned with the same nearby-dog suggestions the photographer saw.
create or replace function public.pending_identifications(
  lng       double precision default null,
  lat       double precision default null,
  radius_m  int default 50000,
  max_rows  int default 30
)
returns table (
  sighting_id         uuid,
  photo_url           text,
  caption             text,
  created_at          timestamptz,
  distance_m          double precision,
  photographer_handle text,
  sighting_lng        double precision,
  sighting_lat        double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with origin as (
    select case when lng is not null and lat is not null
      then st_setsrid(st_makepoint(lng, lat), 4326)::geography
    end as g
  )
  select
    s.id,
    s.photo_url,
    s.caption,
    s.created_at,
    case when (select g from origin) is not null
      then st_distance(s.location, (select g from origin))
    end as distance_m,
    u.handle,
    st_x(s.location::geometry),
    st_y(s.location::geometry)
  from public.sightings s
  left join public.users u on u.id = s.photographer_id
  where s.status = 'pending_id'
    and s.dog_id is null
    and (auth.uid() is null or s.photographer_id <> auth.uid())
    and not exists (
      select 1 from public.identification_votes v
      where v.sighting_id = s.id
        and v.voter_id = auth.uid()
    )
    and ((select g from origin) is null
         or st_dwithin(s.location, (select g from origin), radius_m))
  order by s.created_at desc
  limit max_rows;
$$;

-- maybe_resolve_identification: pick a dog that crosses either threshold
-- (>= 3 votes from users with > 50 points, OR >= 1 vote from a verified
-- feeder / app admin) and confirm the sighting + award delayed +10 points.
-- BRIEF section 8.4.
create or replace function public.maybe_resolve_identification(target_sighting uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolution_dog_id uuid;
  photographer      uuid;
begin
  select v.proposed_dog_id
    into resolution_dog_id
  from public.identification_votes v
  join public.users u on u.id = v.voter_id
  where v.sighting_id = target_sighting
    and v.proposed_dog_id is not null
  group by v.proposed_dog_id
  having count(*) filter (where u.points > 50) >= 3
      or count(*) filter (where u.role in ('feeder', 'app_admin')) >= 1
  order by count(*) desc
  limit 1;

  if resolution_dog_id is null then
    return;
  end if;

  update public.sightings
     set dog_id = resolution_dog_id,
         status = 'confirmed'
   where id = target_sighting
     and status = 'pending_id'
  returning photographer_id into photographer;

  -- Delayed photo-of-existing-dog points (BRIEF section 9).
  if photographer is not null then
    insert into public.points_log (user_id, action_type, points, related_entity_id, related_entity_type)
    values (photographer, 'help_identify_resolved', 10, target_sighting, 'sighting');
  end if;
end;
$$;

create or replace function public.identification_votes_after_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.maybe_resolve_identification(new.sighting_id);
  return new;
end;
$$;

drop trigger if exists identification_votes_resolve on public.identification_votes;
create trigger identification_votes_resolve
  after insert on public.identification_votes
  for each row execute function public.identification_votes_after_insert();

-- pending_identification_count: cheap counter for the discovery badge.
create or replace function public.pending_identification_count(
  lng       double precision default null,
  lat       double precision default null,
  radius_m  int default 50000
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  with origin as (
    select case when lng is not null and lat is not null
      then st_setsrid(st_makepoint(lng, lat), 4326)::geography
    end as g
  )
  select count(*)::int
    from public.sightings s
   where s.status = 'pending_id'
     and s.dog_id is null
     and (auth.uid() is null or s.photographer_id <> auth.uid())
     and not exists (
       select 1 from public.identification_votes v
       where v.sighting_id = s.id and v.voter_id = auth.uid()
     )
     and ((select g from origin) is null
          or st_dwithin(s.location, (select g from origin), radius_m));
$$;
