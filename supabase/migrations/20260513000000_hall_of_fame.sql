-- Wave 3 of v1.1: Hall of Fame on dog profiles + denormalised like_count.
--
-- The like_count column was added in Wave 1 (districts) so the index
-- (district_id, like_count desc) could be created. Now we wire up:
--   - Trigger on public.likes that increments/decrements
--     sightings.like_count.
--   - Backfill of existing likes.
--   - dog_top_photos RPC powering the per-dog Hall of Fame.

create or replace function public.sighting_likes_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.sightings
       set like_count = like_count + 1
     where id = new.sighting_id;
  elsif tg_op = 'DELETE' then
    update public.sightings
       set like_count = greatest(0, like_count - 1)
     where id = old.sighting_id;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_update_count on public.likes;
create trigger likes_update_count
  after insert or delete on public.likes
  for each row execute function public.sighting_likes_after_change();

-- Backfill: in case any rows landed before the trigger / column existed.
update public.sightings s
   set like_count = (select count(*) from public.likes l where l.sighting_id = s.id);

-- dog_top_photos: top N photos for a dog by all-time like count.
-- Per BRIEF section 10.3 this is a forever leaderboard, no weekly reset.
-- Welfare-flagged dogs still show their Hall of Fame on their own profile
-- (the global leaderboard exclusion is for district / city-wide boards).
create or replace function public.dog_top_photos(
  target_dog uuid,
  max_rows   int default 3
)
returns table (
  sighting_id         uuid,
  photo_url           text,
  caption             text,
  like_count          int,
  created_at          timestamptz,
  photographer_id     uuid,
  photographer_handle text
)
language sql
stable
as $$
  select
    s.id,
    s.photo_url,
    s.caption,
    s.like_count,
    s.created_at,
    s.photographer_id,
    u.handle
  from public.sightings s
  left join public.users u on u.id = s.photographer_id
  where s.dog_id = target_dog
    and s.status = 'confirmed'
    and s.like_count > 0
  order by s.like_count desc, s.created_at desc
  limit max_rows;
$$;
