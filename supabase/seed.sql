-- Soi Dogs seed data: sticker packs, a few Bangkok demo dogs.
-- Safe to run multiple times.

-- ── Sticker packs ───────────────────────────────────────────────────────────
insert into public.sticker_packs (id, name, artist_name, unlock_threshold, release_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Soi Starter',           'Artist TBD', 100,   now()),
  ('22222222-2222-2222-2222-222222222222', 'Neighbourhood Regular', 'Artist TBD', 500,   now()),
  ('33333333-3333-3333-3333-333333333333', 'Dog Whisperer',         'Artist TBD', 1500,  now()),
  ('44444444-4444-4444-4444-444444444444', 'Soi Legend',            'Artist TBD', 5000,  now())
on conflict (id) do nothing;

-- Placeholder stickers per pack (real artwork uploaded later via admin tooling).
insert into public.stickers (pack_id, name, image_url, sort_order)
select p.id, p.name || ' #' || g, '/stickers/placeholder.png', g
  from public.sticker_packs p
  cross join generate_series(1, case p.name
    when 'Soi Starter'           then 6
    when 'Neighbourhood Regular' then 8
    when 'Dog Whisperer'         then 10
    when 'Soi Legend'            then 12
  end) g
on conflict do nothing;

-- ── Demo dogs around Sukhumvit / Thonglor ──────────────────────────────────
-- Centroids only; real sightings would create these via the mobile flow.
insert into public.dogs (id, name, name_th, primary_color, pattern, territory_centroid, age_guess)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Khao Niao', 'ข้าวเหนียว', 'white',  'solid',    st_setsrid(st_makepoint(100.5697, 13.7384), 4326)::geography, 'adult'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Mango',     'มะม่วง',     'ginger', 'sable',    st_setsrid(st_makepoint(100.5701, 13.7390), 4326)::geography, 'young'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Som Tam',   'ส้มตำ',      'grey',   'brindle',  st_setsrid(st_makepoint(100.5712, 13.7401), 4326)::geography, 'adult'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Tom Yum',   'ต้มยำ',      'black',  'black_tan',st_setsrid(st_makepoint(100.5688, 13.7372), 4326)::geography, 'senior'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Pad Thai',  'ผัดไทย',     'brown',  'patched',  st_setsrid(st_makepoint(100.5750, 13.7350), 4326)::geography, 'puppy')
on conflict (id) do nothing;
