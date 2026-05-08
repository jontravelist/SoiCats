-- Pivot from per-photo ratings to per-cat ratings.
-- BRIEF section 9 originally specced photo-level ratings aggregated to a
-- cat. UX pivot: photos use likes (already in place), the five-stat
-- system applies directly to the cat as a whole. Better matches the
-- Pokemon framing — Chonk/Spice/etc. describe the creature, not a single
-- snapshot of it.

drop trigger if exists photo_ratings_recompute on public.photo_ratings;
drop function if exists public.photo_ratings_after_change();
drop table if exists public.photo_ratings;

create table public.cat_ratings (
  cat_id     uuid not null references public.cats (id) on delete cascade,
  voter_id   uuid not null references public.users (id) on delete cascade,
  stat       cat_stat not null,
  score      int  not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cat_id, voter_id, stat)
);

create index cat_ratings_cat_idx   on public.cat_ratings (cat_id);
create index cat_ratings_voter_idx on public.cat_ratings (voter_id, created_at desc);

alter table public.cat_ratings enable row level security;

create policy "cat ratings public read"
  on public.cat_ratings for select using (true);
create policy "cat ratings insert own"
  on public.cat_ratings for insert with check (voter_id = auth.uid());
create policy "cat ratings update own"
  on public.cat_ratings for update using (voter_id = auth.uid()) with check (voter_id = auth.uid());
create policy "cat ratings delete own"
  on public.cat_ratings for delete using (voter_id = auth.uid());

-- recompute_cat_stats: now reads from cat_ratings directly.
-- Weighted average per stat. Role weight 1.5x for feeders/admins. No
-- recency decay (cats are persistent characters, not photos). Excludes
-- ratings from accounts < 7 days old.
-- stats_photo_count is repurposed as the count of distinct voters so the
-- cat-profile threshold logic stays meaningful.
create or replace function public.recompute_cat_stats(target_cat uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_ratings int;
  voter_count   int;
  best_stat     cat_stat;
begin
  select count(*), count(distinct r.voter_id)
    into total_ratings, voter_count
    from public.cat_ratings r
    join public.users u on u.id = r.voter_id
   where r.cat_id = target_cat
     and extract(epoch from (now() - u.created_at)) >= 7 * 86400;

  with weighted as (
    select
      r.stat,
      r.score::numeric,
      case when u.role in ('feeder', 'app_admin') then 1.5 else 1.0 end as role_w
    from public.cat_ratings r
    join public.users u on u.id = r.voter_id
    where r.cat_id = target_cat
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
  update public.cats c
     set stat_chonk = (select avg_score from agg where stat = 'chonk'),
         stat_spice = (select avg_score from agg where stat = 'spice'),
         stat_floof = (select avg_score from agg where stat = 'floof'),
         stat_slink = (select avg_score from agg where stat = 'slink'),
         stat_vibes = (select avg_score from agg where stat = 'vibes'),
         stats_rating_count     = total_ratings,
         stats_photo_count      = voter_count,
         stats_last_computed_at = now()
   where c.id = target_cat;

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

create or replace function public.cat_ratings_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_cat_stats(coalesce(new.cat_id, old.cat_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists cat_ratings_recompute on public.cat_ratings;
create trigger cat_ratings_recompute
  after insert or update or delete on public.cat_ratings
  for each row execute function public.cat_ratings_after_change();

-- Wipe any cached aggregates from the photo-rating era so new cat-rating
-- inserts are the source of truth.
update public.cats
   set stat_chonk = null,
       stat_spice = null,
       stat_floof = null,
       stat_slink = null,
       stat_vibes = null,
       stats_rating_count = 0,
       stats_photo_count  = 0,
       stats_last_computed_at = null,
       specialty_stat = null;
