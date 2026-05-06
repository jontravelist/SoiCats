-- Fix: photos taken outside Bangkok were being tagged 'Greater Bangkok'
-- because the trigger fell back to that district unconditionally.
-- Now:
--   1. Tighten the Greater Bangkok polygon to roughly the Bangkok metro
--      area (13.50..14.00 lat, 100.30..100.90 lng) so points actually
--      get checked against it.
--   2. Trigger only assigns 'Greater Bangkok' when the point is inside
--      that polygon and no curated district matches; otherwise leaves
--      district_id NULL.
--
-- Result: cats photographed outside Bangkok show no district chip and
-- don't pollute Bangkok leaderboards.

update public.districts
   set boundary = st_geographyfromtext('SRID=4326;POLYGON((100.30 13.50, 100.90 13.50, 100.90 14.00, 100.30 14.00, 100.30 13.50))')
 where slug = 'greater-bangkok';

create or replace function public.assign_sighting_district()
returns trigger
language plpgsql
as $$
declare
  matched uuid;
  greater uuid;
  inside_greater boolean;
begin
  if new.location is null then
    return new;
  end if;
  matched := public.find_district_for_point(
    st_x(new.location::geometry),
    st_y(new.location::geometry)
  );
  if matched is null then
    greater := public.greater_bangkok_district_id();
    if greater is not null then
      select st_contains(d.boundary::geometry, new.location::geometry)
        into inside_greater
        from public.districts d
       where d.id = greater;
      if inside_greater then
        matched := greater;
      end if;
    end if;
  end if;
  new.district_id := matched;
  return new;
end;
$$;

create or replace function public.assign_cat_district()
returns trigger
language plpgsql
as $$
declare
  matched uuid;
  greater uuid;
  inside_greater boolean;
begin
  if new.territory_centroid is null then
    return new;
  end if;
  matched := public.find_district_for_point(
    st_x(new.territory_centroid::geometry),
    st_y(new.territory_centroid::geometry)
  );
  if matched is null then
    greater := public.greater_bangkok_district_id();
    if greater is not null then
      select st_contains(d.boundary::geometry, new.territory_centroid::geometry)
        into inside_greater
        from public.districts d
       where d.id = greater;
      if inside_greater then
        matched := greater;
      end if;
    end if;
  end if;
  new.district_id := matched;
  return new;
end;
$$;

-- Re-run on existing rows so the misassigned ones (anything currently
-- on greater-bangkok but actually outside the new tighter polygon) drop
-- their district_id back to NULL.
update public.sightings s
   set district_id = (
     case
       when public.find_district_for_point(st_x(s.location::geometry), st_y(s.location::geometry)) is not null
         then public.find_district_for_point(st_x(s.location::geometry), st_y(s.location::geometry))
       when exists (
         select 1 from public.districts d
          where d.id = public.greater_bangkok_district_id()
            and st_contains(d.boundary::geometry, s.location::geometry)
       )
         then public.greater_bangkok_district_id()
       else null
     end
   )
 where s.location is not null;

update public.cats c
   set district_id = (
     case
       when public.find_district_for_point(st_x(c.territory_centroid::geometry), st_y(c.territory_centroid::geometry)) is not null
         then public.find_district_for_point(st_x(c.territory_centroid::geometry), st_y(c.territory_centroid::geometry))
       when exists (
         select 1 from public.districts d
          where d.id = public.greater_bangkok_district_id()
            and st_contains(d.boundary::geometry, c.territory_centroid::geometry)
       )
         then public.greater_bangkok_district_id()
       else null
     end
   )
 where c.territory_centroid is not null;
