-- Wave 1 of v1.1: districts.
--
-- Adds a districts table (curated Bangkok districts + a 'Greater Bangkok'
-- catch-all), district_id columns on cats and sightings, triggers that
-- auto-assign district_id at insert/update via PostGIS ST_Contains, and a
-- seed of approximate polygons for the 15 curated districts in BRIEF
-- section 10.1.
--
-- The polygons are bounding-box approximations. Replace with real OSM
-- admin-level-8 polygons once those are sourced; the find_district logic
-- will pick the smallest (most specific) curated match first, so the
-- shape can change later without code changes.

create table public.districts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  name_th      text,
  slug         text not null unique,
  boundary     geography(Polygon, 4326) not null,
  is_curated   boolean not null default true,
  created_at   timestamptz not null default now()
);

create index districts_boundary_idx on public.districts using gist (boundary);
create index districts_curated_idx on public.districts (is_curated) where is_curated;

alter table public.districts enable row level security;

create policy "districts public read"
  on public.districts for select using (true);
create policy "districts admin write"
  on public.districts for all using (public.is_admin()) with check (public.is_admin());

-- Add district_id to cats and sightings (nullable + indexed).
alter table public.cats
  add column district_id uuid references public.districts (id);
create index cats_district_idx on public.cats (district_id);

alter table public.sightings
  add column district_id uuid references public.districts (id);
create index sightings_district_created_idx on public.sightings (district_id, created_at desc);
create index sightings_district_likes_idx on public.sightings (district_id, like_count desc);

-- Add the like_count column too while we're here — needed by Wave 3 / 4
-- (Hall of Fame + weekly leaderboards). Defaults zero, populated by trigger
-- in a later wave.
alter table public.sightings
  add column if not exists like_count int not null default 0;

-- find_district_for_point: prefer the smallest curated polygon containing the
-- point (handles overlapping polygons sensibly). Falls back to NULL when
-- nothing matches; the trigger then drops to Greater Bangkok.
create or replace function public.find_district_for_point(
  lng double precision,
  lat double precision
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
    from public.districts d
   where d.is_curated
     and st_contains(d.boundary::geometry, st_setsrid(st_makepoint(lng, lat), 4326))
   order by st_area(d.boundary::geometry) asc
   limit 1;
$$;

create or replace function public.greater_bangkok_district_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.districts where slug = 'greater-bangkok' limit 1;
$$;

-- Triggers populate district_id whenever the related geometry changes.
-- We always overwrite (don't trust client-supplied district_id) — simpler
-- than RLS-gating the column.
create or replace function public.assign_sighting_district()
returns trigger
language plpgsql
as $$
declare
  matched uuid;
begin
  if new.location is null then
    return new;
  end if;
  matched := public.find_district_for_point(
    st_x(new.location::geometry),
    st_y(new.location::geometry)
  );
  if matched is null then
    matched := public.greater_bangkok_district_id();
  end if;
  new.district_id := matched;
  return new;
end;
$$;

drop trigger if exists sighting_assign_district on public.sightings;
create trigger sighting_assign_district
  before insert or update of location on public.sightings
  for each row execute function public.assign_sighting_district();

create or replace function public.assign_cat_district()
returns trigger
language plpgsql
as $$
declare
  matched uuid;
begin
  if new.territory_centroid is null then
    return new;
  end if;
  matched := public.find_district_for_point(
    st_x(new.territory_centroid::geometry),
    st_y(new.territory_centroid::geometry)
  );
  if matched is null then
    matched := public.greater_bangkok_district_id();
  end if;
  new.district_id := matched;
  return new;
end;
$$;

drop trigger if exists cat_assign_district on public.cats;
create trigger cat_assign_district
  before insert or update of territory_centroid on public.cats
  for each row execute function public.assign_cat_district();

-- Seed: Greater Bangkok catch-all (huge bounding box around the city).
insert into public.districts (slug, name, name_th, boundary, is_curated)
values (
  'greater-bangkok', 'Greater Bangkok', 'กรุงเทพมหานคร',
  st_geographyfromtext('SRID=4326;POLYGON((99.500 12.500, 101.500 12.500, 101.500 14.500, 99.500 14.500, 99.500 12.500))'),
  false
)
on conflict (slug) do nothing;

-- Seed: curated districts.
-- Polygons are bounding-box approximations covering the named neighbourhoods.
-- TODO: replace with OSM admin-level-8 polygons before launch.
insert into public.districts (slug, name, name_th, boundary, is_curated) values
  ('watthana',     'Watthana',      'วัฒนา',          st_geographyfromtext('SRID=4326;POLYGON((100.555 13.715, 100.595 13.715, 100.595 13.755, 100.555 13.755, 100.555 13.715))'), true),
  ('khlong-toei',  'Khlong Toei',   'คลองเตย',        st_geographyfromtext('SRID=4326;POLYGON((100.555 13.685, 100.595 13.685, 100.595 13.725, 100.555 13.725, 100.555 13.685))'), true),
  ('pathum-wan',   'Pathum Wan',    'ปทุมวัน',         st_geographyfromtext('SRID=4326;POLYGON((100.520 13.735, 100.555 13.735, 100.555 13.760, 100.520 13.760, 100.520 13.735))'), true),
  ('bang-rak',     'Bang Rak',      'บางรัก',         st_geographyfromtext('SRID=4326;POLYGON((100.510 13.715, 100.535 13.715, 100.535 13.740, 100.510 13.740, 100.510 13.715))'), true),
  ('ratchathewi',  'Ratchathewi',   'ราชเทวี',        st_geographyfromtext('SRID=4326;POLYGON((100.520 13.755, 100.545 13.755, 100.545 13.775, 100.520 13.775, 100.520 13.755))'), true),
  ('phaya-thai',   'Phaya Thai',    'พญาไท',          st_geographyfromtext('SRID=4326;POLYGON((100.530 13.770, 100.555 13.770, 100.555 13.800, 100.530 13.800, 100.530 13.770))'), true),
  ('chatuchak',    'Chatuchak',     'จตุจักร',        st_geographyfromtext('SRID=4326;POLYGON((100.540 13.795, 100.580 13.795, 100.580 13.840, 100.540 13.840, 100.540 13.795))'), true),
  ('huai-khwang',  'Huai Khwang',   'ห้วยขวาง',       st_geographyfromtext('SRID=4326;POLYGON((100.570 13.760, 100.605 13.760, 100.605 13.795, 100.570 13.795, 100.570 13.760))'), true),
  ('bang-sue',     'Bang Sue',      'บางซื่อ',         st_geographyfromtext('SRID=4326;POLYGON((100.510 13.795, 100.545 13.795, 100.545 13.825, 100.510 13.825, 100.510 13.795))'), true),
  ('phra-nakhon',  'Phra Nakhon',   'พระนคร',         st_geographyfromtext('SRID=4326;POLYGON((100.490 13.745, 100.510 13.745, 100.510 13.775, 100.490 13.775, 100.490 13.745))'), true),
  ('sathon',       'Sathon',        'สาทร',           st_geographyfromtext('SRID=4326;POLYGON((100.515 13.690, 100.540 13.690, 100.540 13.720, 100.515 13.720, 100.515 13.690))'), true),
  ('yan-nawa',     'Yan Nawa',      'ยานนาวา',         st_geographyfromtext('SRID=4326;POLYGON((100.520 13.685, 100.545 13.685, 100.545 13.710, 100.520 13.710, 100.520 13.685))'), true),
  ('khlong-san',   'Khlong San',    'คลองสาน',         st_geographyfromtext('SRID=4326;POLYGON((100.495 13.725, 100.520 13.725, 100.520 13.750, 100.495 13.750, 100.495 13.725))'), true),
  ('bangkok-noi',  'Bangkok Noi',   'บางกอกน้อย',      st_geographyfromtext('SRID=4326;POLYGON((100.470 13.755, 100.495 13.755, 100.495 13.785, 100.470 13.785, 100.470 13.755))'), true),
  ('suan-luang',   'Suan Luang',    'สวนหลวง',         st_geographyfromtext('SRID=4326;POLYGON((100.605 13.715, 100.640 13.715, 100.640 13.755, 100.605 13.755, 100.605 13.715))'), true)
on conflict (slug) do nothing;

-- Backfill existing rows. The triggers handle future inserts/updates.
update public.sightings s
   set district_id = coalesce(
     public.find_district_for_point(st_x(s.location::geometry), st_y(s.location::geometry)),
     public.greater_bangkok_district_id()
   )
 where district_id is null;

update public.cats c
   set district_id = coalesce(
     public.find_district_for_point(st_x(c.territory_centroid::geometry), st_y(c.territory_centroid::geometry)),
     public.greater_bangkok_district_id()
   )
 where district_id is null;
