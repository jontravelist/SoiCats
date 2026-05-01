-- Soi Cats: storage buckets and policies.
-- Note: when running locally with the Supabase CLI, these buckets are created here.
-- Hosted projects can also create them via the dashboard.

insert into storage.buckets (id, name, public)
values
  ('sighting-photos', 'sighting-photos', true),
  ('avatars',         'avatars',         true),
  ('stickers',        'stickers',        true),
  ('flag-photos',     'flag-photos',     true)
on conflict (id) do nothing;

-- sighting-photos: any signed-in user can write to a path beginning with their uid.
create policy "sighting-photos public read"
  on storage.objects for select
  using (bucket_id = 'sighting-photos');

create policy "sighting-photos owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'sighting-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sighting-photos owner update"
  on storage.objects for update
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "sighting-photos owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: same per-user folder convention.
create policy "avatars public read"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "avatars owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- stickers: read-only to clients; writes only via service role.
create policy "stickers public read"
  on storage.objects for select using (bucket_id = 'stickers');

-- flag-photos: same per-user folder convention.
create policy "flag-photos public read"
  on storage.objects for select using (bucket_id = 'flag-photos');

create policy "flag-photos owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'flag-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
