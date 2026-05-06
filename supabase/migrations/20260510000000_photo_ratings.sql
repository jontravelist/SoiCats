-- Wave 2 of v1.1: cat stat ratings (Chonk / Spice / Floof / Slink / Vibes).
--
-- Each rating lives on a (sighting, voter, stat) triple. After every change
-- we recompute the parent cat's weighted aggregate and store it on the cat
-- row, so reads are cheap and the radar chart is a single column lookup.
-- Per BRIEF section 9.3:
--   weight = recency * role
--   recency in [1.0, 2.0] decaying over 90 days
--   role = 1.5 for feeders/admins, 1.0 otherwise
--   votes from accounts < 7 days old are excluded from cat-level averages

create type cat_stat as enum ('chonk', 'spice', 'floof', 'slink', 'vibes');

create table public.photo_ratings (
  sighting_id  uuid not null references public.sightings (id) on delete cascade,
  voter_id     uuid not null references public.users (id) on delete cascade,
  stat         cat_stat not null,
  score        int not null check (score between 1 and 5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (sighting_id, voter_id, stat)
);

create index photo_ratings_sighting_idx on public.photo_ratings (sighting_id);
create index photo_ratings_voter_idx on public.photo_ratings (voter_id, created_at desc);

alter table public.photo_ratings enable row level security;

create policy "photo ratings public read"
  on public.photo_ratings for select using (true);

-- Insert: must be the voter, must not be the photographer (no self-rating).
create policy "photo ratings insert own (not self)"
  on public.photo_ratings for insert
  with check (
    voter_id = auth.uid()
    and not exists (
      select 1 from public.sightings
      where id = sighting_id
        and photographer_id = auth.uid()
    )
  );

create policy "photo ratings update own"
  on public.photo_ratings for update
  using (voter_id = auth.uid())
  with check (voter_id = auth.uid());

create policy "photo ratings delete own"
  on public.photo_ratings for delete using (voter_id = auth.uid());

-- Aggregate columns on cats. NULL means 'no qualifying ratings yet'.
alter table public.cats
  add column stat_chonk numeric(3,2),
  add column stat_spice numeric(3,2),
  add column stat_floof numeric(3,2),
  add column stat_slink numeric(3,2),
  add column stat_vibes numeric(3,2),
  add column stats_rating_count int not null default 0,
  add column stats_photo_count  int not null default 0,
  add column stats_last_computed_at timestamptz,
  add column specialty_stat cat_stat;

create index cats_specialty_idx on public.cats (district_id, specialty_stat);

-- recompute_cat_stats: weighted average per stat across all confirmed
-- photos of this cat, with recency + role weights, excluding ratings
-- from accounts < 7 days old.
create or replace function public.recompute_cat_stats(target_cat uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_ratings int;
  distinct_photos int;
  best_stat cat_stat;
begin
  -- Counts (across qualifying ratings only).
  select count(*), count(distinct r.sighting_id)
    into total_ratings, distinct_photos
  from public.photo_ratings r
  join public.sightings s on s.id = r.sighting_id
  join public.users u     on u.id = r.voter_id
  where s.cat_id = target_cat
    and s.status = 'confirmed'
    and extract(epoch from (now() - u.created_at)) >= 7 * 86400;

  -- Weighted averages per stat.
  with weighted as (
    select
      r.stat,
      r.score::numeric,
      1.0 + greatest(
        0,
        (90.0 - extract(epoch from (now() - s.created_at)) / 86400.0) / 90.0
      ) as recency_w,
      case when u.role in ('feeder', 'app_admin') then 1.5 else 1.0 end as role_w
    from public.photo_ratings r
    join public.sightings s on s.id = r.sighting_id
    join public.users u     on u.id = r.voter_id
    where s.cat_id = target_cat
      and s.status = 'confirmed'
      and extract(epoch from (now() - u.created_at)) >= 7 * 86400
  ),
  agg as (
    select
      stat,
      round(
        (sum(score * recency_w * role_w) / nullif(sum(recency_w * role_w), 0))::numeric,
        2
      ) as avg_score
    from weighted
    group by stat
  )
  update public.cats c
     set stat_chonk = (select avg_score from agg where stat = 'chonk'),
         stat_spice = (select avg_score from agg where stat = 'spice'),
         stat_floof = (select avg_score from agg where stat = 'floof'),
         stat_slink = (select avg_score from agg where stat = 'slink'),
         stat_vibes = (select avg_score from agg where stat = 'vibes'),
         stats_rating_count    = total_ratings,
         stats_photo_count     = distinct_photos,
         stats_last_computed_at = now()
   where c.id = target_cat;

  -- Specialty = highest non-null stat (ties broken by stat enum order).
  select stat into best_stat
    from (
      select 'chonk'::cat_stat as stat, c.stat_chonk as score from public.cats c where c.id = target_cat
      union all select 'spice', stat_spice from public.cats where id = target_cat
      union all select 'floof', stat_floof from public.cats where id = target_cat
      union all select 'slink', stat_slink from public.cats where id = target_cat
      union all select 'vibes', stat_vibes from public.cats where id = target_cat
    ) s
   where s.score is not null
   order by s.score desc, s.stat asc
   limit 1;

  update public.cats set specialty_stat = best_stat where id = target_cat;
end;
$$;

-- Recompute the parent cat's stats on every change.
-- Synchronous for MVP scale; if hot-row contention shows up later, swap for
-- a debounced job-queue pattern (per BRIEF section 22).
create or replace function public.photo_ratings_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_cat uuid;
begin
  select cat_id into target_cat
    from public.sightings
    where id = coalesce(new.sighting_id, old.sighting_id);
  if target_cat is not null then
    perform public.recompute_cat_stats(target_cat);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists photo_ratings_recompute on public.photo_ratings;
create trigger photo_ratings_recompute
  after insert or update or delete on public.photo_ratings
  for each row execute function public.photo_ratings_after_change();
