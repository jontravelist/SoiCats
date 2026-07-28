-- Defensive: create the dog_stat enum if it wasn't already. The dog_ratings
-- migration normally adds it; this guard makes the migration runnable
-- regardless of order or whether earlier migrations were skipped.
do $$ begin
  create type dog_stat as enum ('bork', 'zoom', 'floof', 'chill', 'guard');
exception
  when duplicate_object then null;
end $$;

-- Wave 5 of v1.1: stat champions (per district, per stat).
--
-- Each district has five champion slots (Borkiest, Zoomiest, Floofiest,
-- Chilliest, Best Guard). Computed nightly. When a dog takes a title from
-- another, held_since rolls and we mark the change in stat_champion_history
-- (placeholder — drop in once we wire pg_net for push notifications).
--
-- Welfare exclusion (BRIEF section 10.6): dogs with injured/missing/
-- deceased status, or with a verified unresolved welfare flag, are not
-- eligible for champion titles.

create table public.stat_champions (
  district_id      uuid not null references public.districts (id) on delete cascade,
  stat             dog_stat not null,
  dog_id           uuid references public.dogs (id) on delete set null,
  score            numeric(3,2),
  held_since       timestamptz,
  last_computed_at timestamptz not null default now(),
  primary key (district_id, stat)
);

create index stat_champions_dog_idx on public.stat_champions (dog_id);

alter table public.stat_champions enable row level security;
create policy "stat champions public read"
  on public.stat_champions for select using (true);
create policy "stat champions admin write"
  on public.stat_champions for all using (public.is_admin()) with check (public.is_admin());

-- recompute_stat_champions: for every (district, stat) combination, pick
-- the dog with the highest stat value (welfare-eligible) and upsert into
-- stat_champions. Detects title changes (different dog than previous
-- holder) — currently just bumps held_since; future work will fan out
-- pushes via pg_net.
--
-- Tie-break: highest stats_rating_count first, then earliest discovered_at
-- (long-tenured dogs edge out newcomers on a tie).
create or replace function public.recompute_stat_champions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  prev_cat uuid;
  changed  int := 0;
begin
  for rec in
    with stat_unpivot as (
      select
        c.id   as dog_id,
        c.district_id,
        c.discovered_at,
        c.stats_rating_count,
        s.stat,
        s.score
      from public.dogs c
      cross join lateral (values
        ('bork'::dog_stat, c.stat_bork),
        ('zoom'::dog_stat, c.stat_zoom),
        ('floof'::dog_stat, c.stat_floof),
        ('chill'::dog_stat, c.stat_chill),
        ('guard'::dog_stat, c.stat_guard)
      ) s(stat, score)
      where c.district_id is not null
        and c.status not in ('injured', 'missing', 'deceased')
        and s.score is not null
        and c.stats_rating_count >= 3
        and not exists (
          select 1 from public.dog_health_flags f
           where f.dog_id = c.id
             and f.status = 'verified'
             and f.flag_type in ('injured', 'missing', 'deceased')
             and f.resolved_at is null
        )
    ),
    ranked as (
      select
        district_id, stat, dog_id, score, stats_rating_count, discovered_at,
        row_number() over (
          partition by district_id, stat
          order by score desc, stats_rating_count desc, discovered_at asc
        ) as rnk
      from stat_unpivot
    )
    select * from ranked where rnk = 1
  loop
    select dog_id into prev_cat
      from public.stat_champions
     where district_id = rec.district_id and stat = rec.stat;

    insert into public.stat_champions (district_id, stat, dog_id, score, held_since, last_computed_at)
    values (rec.district_id, rec.stat, rec.dog_id, rec.score, now(), now())
    on conflict (district_id, stat) do update
       set dog_id = excluded.dog_id,
           score  = excluded.score,
           held_since = case
             when public.stat_champions.dog_id is distinct from excluded.dog_id then now()
             else public.stat_champions.held_since
           end,
           last_computed_at = now();

    if prev_cat is null or prev_cat <> rec.dog_id then
      changed := changed + 1;
    end if;
  end loop;

  return changed;
end;
$$;

-- district_stat_champions: 5-row champion list for a district.
create or replace function public.district_stat_champions(target_district uuid)
returns table (
  stat       dog_stat,
  dog_id     uuid,
  dog_name   text,
  score      numeric,
  thumbnail  text,
  held_since timestamptz
)
language sql
stable
as $$
  select
    sc.stat,
    sc.dog_id,
    c.name,
    sc.score,
    (select s.photo_url from public.sightings s
       where s.dog_id = c.id and s.status = 'confirmed'
       order by s.created_at desc limit 1),
    sc.held_since
  from public.stat_champions sc
  left join public.dogs c on c.id = sc.dog_id
  where sc.district_id = target_district
  order by sc.stat;
$$;

-- stat_champion_top5: per-stat top 5 dogs in a district. Powers the
-- 'Borkiest 5 in Watthana' scroll.
create or replace function public.stat_champion_top5(
  target_district uuid,
  target_stat     dog_stat,
  max_rows        int default 5
)
returns table (
  rank      int,
  dog_id    uuid,
  dog_name  text,
  score     numeric,
  thumbnail text
)
language sql
stable
as $$
  with eligible as (
    select c.id, c.name,
      case target_stat
        when 'bork' then c.stat_bork
        when 'zoom' then c.stat_zoom
        when 'floof' then c.stat_floof
        when 'chill' then c.stat_chill
        when 'guard' then c.stat_guard
      end as score,
      c.stats_rating_count, c.discovered_at
    from public.dogs c
    where c.district_id = target_district
      and c.status not in ('injured', 'missing', 'deceased')
      and c.stats_rating_count >= 3
      and not exists (
        select 1 from public.dog_health_flags f
         where f.dog_id = c.id
           and f.status = 'verified'
           and f.flag_type in ('injured', 'missing', 'deceased')
           and f.resolved_at is null
      )
  )
  select
    row_number() over (order by score desc, stats_rating_count desc, discovered_at asc)::int,
    e.id,
    e.name,
    e.score,
    (select s.photo_url from public.sightings s
       where s.dog_id = e.id and s.status = 'confirmed'
       order by s.created_at desc limit 1)
  from eligible e
  where score is not null
  order by score desc, stats_rating_count desc, discovered_at asc
  limit max_rows;
$$;

-- pg_cron schedule (hosted Supabase only):
-- select cron.schedule('stat-champions-nightly', '0 16 * * *',
--   $$ select public.recompute_stat_champions(); $$);
