-- Wave 4 of v1.1: weekly district leaderboards (top 3 photos per district).
--
-- Adds the weekly_leaderboard_winners table, an RPC for the *current*
-- week's live top, an RPC for the frozen archive, and a security-definer
-- function that snapshots last week's top 3 per district + awards bonus
-- points.
--
-- The freeze function runs every Monday 00:00 ICT in production. Locally
-- you can invoke it manually:
--    select freeze_weekly_winners();
--
-- BRIEF section 10.6: photos are excluded from leaderboards if their cat
-- has a verified, unresolved injured/missing/deceased flag, or the cat's
-- own status is set to one of those.

create table public.weekly_leaderboard_winners (
  id              uuid primary key default gen_random_uuid(),
  week_start      date not null,
  district_id     uuid not null references public.districts (id) on delete cascade,
  rank            int  not null check (rank in (1, 2, 3)),
  sighting_id     uuid not null references public.sightings (id) on delete cascade,
  photographer_id uuid not null references public.users (id) on delete cascade,
  cat_id          uuid not null references public.cats (id) on delete cascade,
  like_count      int  not null,
  points_awarded  int  not null,
  created_at      timestamptz not null default now(),
  unique (week_start, district_id, rank)
);

create index weekly_winners_photographer_idx on public.weekly_leaderboard_winners (photographer_id, week_start desc);
create index weekly_winners_district_idx on public.weekly_leaderboard_winners (district_id, week_start desc);

alter table public.weekly_leaderboard_winners enable row level security;

create policy "winners public read"
  on public.weekly_leaderboard_winners for select using (true);
create policy "winners admin write"
  on public.weekly_leaderboard_winners for all using (public.is_admin()) with check (public.is_admin());

-- current_week_top_photos: live top N for an in-progress week. Resets at
-- Monday 00:00 ICT because we filter on s.created_at against this week's
-- start in Asia/Bangkok.
create or replace function public.current_week_top_photos(
  target_district uuid,
  max_rows        int default 3
)
returns table (
  rank                int,
  sighting_id         uuid,
  photo_url           text,
  caption             text,
  like_count          int,
  cat_id              uuid,
  cat_name            text,
  photographer_id     uuid,
  photographer_handle text,
  created_at          timestamptz
)
language sql
stable
as $$
  with bounds as (
    select date_trunc('week', timezone('Asia/Bangkok', now()))::timestamptz as week_start
  ),
  ranked as (
    select
      row_number() over (order by s.like_count desc, s.created_at asc)::int as rank,
      s.id,
      s.photo_url,
      s.caption,
      s.like_count,
      s.cat_id,
      c.name,
      s.photographer_id,
      u.handle,
      s.created_at
    from public.sightings s
    join public.cats c on c.id = s.cat_id
    left join public.users u on u.id = s.photographer_id
    where s.status = 'confirmed'
      and s.district_id = target_district
      and s.created_at >= (select week_start from bounds)
      and c.status not in ('injured', 'missing', 'deceased')
      and not exists (
        select 1 from public.cat_health_flags f
         where f.cat_id = s.cat_id
           and f.status = 'verified'
           and f.flag_type in ('injured', 'missing', 'deceased')
           and f.resolved_at is null
      )
  )
  select rank, id, photo_url, caption, like_count, cat_id, name, photographer_id, handle, created_at
    from ranked
   where rank <= max_rows;
$$;

-- frozen_weekly_winners: archive of past weeks for a district.
create or replace function public.frozen_weekly_winners(
  target_district uuid,
  max_weeks       int default 8
)
returns table (
  week_start          date,
  rank                int,
  sighting_id         uuid,
  photo_url           text,
  cat_id              uuid,
  cat_name            text,
  photographer_id     uuid,
  photographer_handle text,
  like_count          int
)
language sql
stable
as $$
  with last_weeks as (
    select distinct week_start
      from public.weekly_leaderboard_winners
     where district_id = target_district
     order by week_start desc
     limit max_weeks
  )
  select
    w.week_start,
    w.rank,
    w.sighting_id,
    s.photo_url,
    w.cat_id,
    c.name,
    w.photographer_id,
    u.handle,
    w.like_count
  from public.weekly_leaderboard_winners w
  join last_weeks lw on lw.week_start = w.week_start
  left join public.sightings s on s.id = w.sighting_id
  left join public.cats     c on c.id = w.cat_id
  left join public.users    u on u.id = w.photographer_id
  where w.district_id = target_district
  order by w.week_start desc, w.rank asc;
$$;

-- freeze_weekly_winners: snapshot last week's top 3 per district + award
-- bonus points (100/50/25). Idempotent — re-running is a no-op for any
-- (week, district, rank) already inserted.
create or replace function public.freeze_weekly_winners()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_start timestamptz;
  prev_end   timestamptz;
  pts        int;
  inserted   int := 0;
  rec        record;
begin
  prev_end   := date_trunc('week', timezone('Asia/Bangkok', now()))::timestamptz;
  prev_start := prev_end - interval '7 days';

  for rec in
    with ranked as (
      select
        s.district_id,
        s.id as sighting_id,
        s.photographer_id,
        s.cat_id,
        s.like_count,
        row_number() over (
          partition by s.district_id
          order by s.like_count desc, s.created_at asc
        ) as rnk
      from public.sightings s
      join public.cats c on c.id = s.cat_id
      where s.status = 'confirmed'
        and s.district_id is not null
        and s.created_at >= prev_start
        and s.created_at <  prev_end
        and c.status not in ('injured', 'missing', 'deceased')
        and not exists (
          select 1 from public.cat_health_flags f
           where f.cat_id = s.cat_id
             and f.status = 'verified'
             and f.flag_type in ('injured', 'missing', 'deceased')
             and f.resolved_at is null
        )
    )
    select * from ranked where rnk <= 3
  loop
    pts := case rec.rnk when 1 then 100 when 2 then 50 when 3 then 25 end;

    insert into public.weekly_leaderboard_winners (
      week_start, district_id, rank,
      sighting_id, photographer_id, cat_id,
      like_count, points_awarded
    ) values (
      prev_start::date, rec.district_id, rec.rnk,
      rec.sighting_id, rec.photographer_id, rec.cat_id,
      rec.like_count, pts
    )
    on conflict (week_start, district_id, rank) do nothing;

    if found then
      -- Bypass the daily cap (BRIEF section 12) — these are awarded for
      -- the previous week's accumulated activity.
      insert into public.points_log (
        user_id, action_type, points,
        related_entity_id, related_entity_type
      ) values (
        rec.photographer_id,
        'weekly_winner_' || rec.rnk,
        pts, rec.sighting_id, 'sighting'
      );
      inserted := inserted + 1;
    end if;
  end loop;

  return inserted;
end;
$$;

-- pg_cron schedule for hosted Supabase. Local dev doesn't have pg_cron;
-- call freeze_weekly_winners() manually to test.
--
-- select cron.schedule(
--   'weekly-winners',
--   '0 17 * * 0',   -- Sunday 17:00 UTC = Monday 00:00 ICT
--   $$ select public.freeze_weekly_winners(); $$
-- );
