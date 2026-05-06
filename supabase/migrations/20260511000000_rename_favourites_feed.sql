-- Rename internal RPC to match the UI: 'Favourites' tab is what users see.
-- The function does the same thing — sightings of cats the caller has
-- favourited. Old name kept as a thin alias for one release in case any
-- stray cached client tries to call it.

create or replace function public.favourites_feed(
  max_rows  int default 50,
  before    timestamptz default null
)
returns table (
  sighting_id     uuid,
  cat_id          uuid,
  cat_name        text,
  photographer_id uuid,
  photographer_handle text,
  photo_url       text,
  caption         text,
  created_at      timestamptz,
  like_count      bigint,
  comment_count   bigint
)
language sql
stable
as $$
  with my_cats as (
    select cat_id from public.user_favourite_cats where user_id = auth.uid()
    union
    select cat_id from public.sightings where photographer_id = auth.uid() and cat_id is not null
  )
  select
    s.id,
    s.cat_id,
    c.name,
    s.photographer_id,
    u.handle,
    s.photo_url,
    s.caption,
    s.created_at,
    (select count(*) from public.likes l where l.sighting_id = s.id),
    (select count(*) from public.comments cm where cm.sighting_id = s.id)
  from public.sightings s
  join my_cats m on m.cat_id = s.cat_id
  left join public.cats  c on c.id = s.cat_id
  left join public.users u on u.id = s.photographer_id
  where s.status = 'confirmed'
    and (before is null or s.created_at < before)
  order by s.created_at desc
  limit max_rows;
$$;

-- Old name kept for one release as an alias.
create or replace function public.following_feed(
  max_rows  int default 50,
  before    timestamptz default null
)
returns table (
  sighting_id     uuid,
  cat_id          uuid,
  cat_name        text,
  photographer_id uuid,
  photographer_handle text,
  photo_url       text,
  caption         text,
  created_at      timestamptz,
  like_count      bigint,
  comment_count   bigint
)
language sql
stable
as $$
  select * from public.favourites_feed(max_rows, before);
$$;
