-- Pivot from per-photo ratings to per-dog ratings.
-- BRIEF section 9 originally specced photo-level ratings aggregated to a
-- dog. UX pivot: photos use likes (already in place), the five-stat
-- system applies directly to the dog as a whole. Better matches the
-- Pokemon framing — Bork/Zoom/etc. describe the creature, not a single
-- snapshot of it.

-- Drop the previous photo_ratings era safely whether or not it ever
-- existed locally.
do $$ begin
  if exists (select 1 from pg_class where relname = 'photo_ratings' and relnamespace = 'public'::regnamespace) then
    drop trigger if exists photo_ratings_recompute on public.photo_ratings;
  end if;
end $$;
drop function if exists public.photo_ratings_after_change();
drop table if exists public.photo_ratings;

-- Defensive: dog_stat enum may or may not already exist depending on
-- which prior migrations ran. Create it if missing.
do $$ begin
  create type dog_stat as enum ('bork', 'zoom', 'floof', 'chill', 'guard');
exception
  when duplicate_object then null;
end $$;

-- Stat aggregate columns on dogs. Same situation as the enum — were
-- originally added in the photo_ratings migration; if that didn't run
-- locally we add them here.
alter table public.dogs
  add column if not exists stat_bork numeric(3,2),
  add column if not exists stat_zoom numeric(3,2),
  add column if not exists stat_floof numeric(3,2),
  add column if not exists stat_chill numeric(3,2),
  add column if not exists stat_guard numeric(3,2),
  add column if not exists stats_rating_count     int not null default 0,
  add column if not exists stats_photo_count      int not null default 0,
  add column if not exists stats_last_computed_at timestamptz,
  add column if not exists specialty_stat         dog_stat;

create table public.dog_ratings (
  dog_id     uuid not null references public.dogs (id) on delete cascade,
  voter_id   uuid not null references public.users (id) on delete cascade,
  stat       dog_stat not null,
  score      int  not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (dog_id, voter_id, stat)
);

create index dog_ratings_dog_idx   on public.dog_ratings (dog_id);
create index dog_ratings_voter_idx on public.dog_ratings (voter_id, created_at desc);

alter table public.dog_ratings enable row level security;

create policy "dog ratings public read"
  on public.dog_ratings for select using (true);
create policy "dog ratings insert own"
  on public.dog_ratings for insert with check (voter_id = auth.uid());
create policy "dog ratings update own"
  on public.dog_ratings for update using (voter_id = auth.uid()) with check (voter_id = auth.uid());
create policy "dog ratings delete own"
  on public.dog_ratings for delete using (voter_id = auth.uid());

-- recompute_dog_stats: now reads from dog_ratings directly.
-- Weighted average per stat. Role weight 1.5x for feeders/admins. No
-- recency decay (dogs are persistent characters, not photos). Excludes
-- ratings from accounts < 7 days old.
-- stats_photo_count is repurposed as the count of distinct voters so the
-- dog-profile threshold logic stays meaningful.
create or replace function public.recompute_dog_stats(target_dog uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_ratings int;
  voter_count   int;
  best_stat     dog_stat;
begin
  select count(*), count(distinct r.voter_id)
    into total_ratings, voter_count
    from public.dog_ratings r
    join public.users u on u.id = r.voter_id
   where r.dog_id = target_dog
     and extract(epoch from (now() - u.created_at)) >= 7 * 86400;

  with weighted as (
    select
      r.stat,
      r.score::numeric,
      case when u.role in ('feeder', 'app_admin') then 1.5 else 1.0 end as role_w
    from public.dog_ratings r
    join public.users u on u.id = r.voter_id
    where r.dog_id = target_dog
      and extract(epoch from (now() - u.created_at)) >= 7 * 86400
  ),
  agg as (
    select
      stat,
      round(
        (sum(score * role_w) / nullif(sum(role_w), 0))::numeric,
        2
      ) as avg_score
    from weighted
    group by stat
  )
  update public.dogs c
     set stat_bork = (select avg_score from agg where stat = 'bork'),
         stat_zoom = (select avg_score from agg where stat = 'zoom'),
         stat_floof = (select avg_score from agg where stat = 'floof'),
         stat_chill = (select avg_score from agg where stat = 'chill'),
         stat_guard = (select avg_score from agg where stat = 'guard'),
         stats_rating_count     = total_ratings,
         stats_photo_count      = voter_count,
         stats_last_computed_at = now()
   where c.id = target_dog;

  select stat into best_stat
    from (
      select 'bork'::dog_stat as stat, c.stat_bork as score from public.dogs c where c.id = target_dog
      union all select 'zoom', stat_zoom from public.dogs where id = target_dog
      union all select 'floof', stat_floof from public.dogs where id = target_dog
      union all select 'chill', stat_chill from public.dogs where id = target_dog
      union all select 'guard', stat_guard from public.dogs where id = target_dog
    ) s
   where s.score is not null
   order by s.score desc, s.stat asc
   limit 1;
  update public.dogs set specialty_stat = best_stat where id = target_dog;
end;
$$;

create or replace function public.dog_ratings_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_dog_stats(coalesce(new.dog_id, old.dog_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists dog_ratings_recompute on public.dog_ratings;
create trigger dog_ratings_recompute
  after insert or update or delete on public.dog_ratings
  for each row execute function public.dog_ratings_after_change();

-- Wipe any cached aggregates from the photo-rating era so new dog-rating
-- inserts are the source of truth.
update public.dogs
   set stat_bork = null,
       stat_zoom = null,
       stat_floof = null,
       stat_chill = null,
       stat_guard = null,
       stats_rating_count = 0,
       stats_photo_count  = 0,
       stats_last_computed_at = null,
       specialty_stat = null;
