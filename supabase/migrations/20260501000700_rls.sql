-- Soi Cats: Row Level Security
-- Public read for community-app tables; writes restricted to owners or admins.

alter table public.users                 enable row level security;
alter table public.cats                  enable row level security;
alter table public.clinics               enable row level security;
alter table public.sightings             enable row level security;
alter table public.comments              enable row level security;
alter table public.likes                 enable row level security;
alter table public.user_favourite_cats   enable row level security;
alter table public.identification_votes  enable row level security;
alter table public.cat_health_flags      enable row level security;
alter table public.feed_logs             enable row level security;
alter table public.clinic_updates        enable row level security;
alter table public.sticker_packs         enable row level security;
alter table public.stickers              enable row level security;
alter table public.user_stickers         enable row level security;
alter table public.points_log            enable row level security;
alter table public.device_tokens         enable row level security;
alter table public.notification_settings enable row level security;

-- ─── users ──────────────────────────────────────────────────────────────────
create policy "users readable to all"
  on public.users for select using (true);

create policy "users update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- prevent users from self-promoting; role and points are server-managed
    and role = (select role from public.users where id = auth.uid())
    and points = (select points from public.users where id = auth.uid())
  );

create policy "admin full users"
  on public.users for all using (public.is_admin()) with check (public.is_admin());

-- ─── cats ───────────────────────────────────────────────────────────────────
create policy "cats public read"
  on public.cats for select using (true);

create policy "cats insert by signed-in users"
  on public.cats for insert
  with check (auth.uid() is not null);

-- Users can update non-welfare fields on cats they discovered.
-- Welfare fields (tnr_status, vaccination_status, last_vaccination_at, tnr_confirmed_*)
-- can only change via clinic_updates trigger (security definer) or admin.
create policy "cats update by discoverer (non-welfare)"
  on public.cats for update
  using (discovered_by_user_id = auth.uid())
  with check (
    discovered_by_user_id = auth.uid()
    and tnr_status              = (select tnr_status              from public.cats c where c.id = cats.id)
    and tnr_confirmed_at        is not distinct from (select tnr_confirmed_at        from public.cats c where c.id = cats.id)
    and tnr_confirmed_by_clinic is not distinct from (select tnr_confirmed_by_clinic from public.cats c where c.id = cats.id)
    and vaccination_status      = (select vaccination_status      from public.cats c where c.id = cats.id)
    and last_vaccination_at     is not distinct from (select last_vaccination_at     from public.cats c where c.id = cats.id)
  );

create policy "cats admin update"
  on public.cats for update using (public.is_admin()) with check (public.is_admin());

-- ─── clinics ────────────────────────────────────────────────────────────────
create policy "clinics public read"
  on public.clinics for select using (true);

create policy "clinics admin write"
  on public.clinics for all using (public.is_admin()) with check (public.is_admin());

-- ─── sightings ──────────────────────────────────────────────────────────────
create policy "sightings public read"
  on public.sightings for select using (true);

create policy "sightings insert own"
  on public.sightings for insert
  with check (photographer_id = auth.uid());

create policy "sightings update own (caption only)"
  on public.sightings for update
  using (photographer_id = auth.uid())
  with check (
    photographer_id = auth.uid()
    -- prevent rewriting points or status from client
    and points_awarded = (select points_awarded from public.sightings s where s.id = sightings.id)
    and status         = (select status         from public.sightings s where s.id = sightings.id)
  );

create policy "sightings delete own"
  on public.sightings for delete using (photographer_id = auth.uid());

create policy "sightings admin all"
  on public.sightings for all using (public.is_admin()) with check (public.is_admin());

-- ─── comments ───────────────────────────────────────────────────────────────
create policy "comments public read"  on public.comments for select using (true);
create policy "comments insert own"   on public.comments for insert with check (user_id = auth.uid());
create policy "comments delete own"   on public.comments for delete using (user_id = auth.uid() or public.is_admin());

-- ─── likes ──────────────────────────────────────────────────────────────────
create policy "likes public read"  on public.likes for select using (true);
create policy "likes insert own"   on public.likes for insert with check (user_id = auth.uid());
create policy "likes delete own"   on public.likes for delete using (user_id = auth.uid());

-- ─── favourites ─────────────────────────────────────────────────────────────
create policy "favourites public read"  on public.user_favourite_cats for select using (true);
create policy "favourites insert own"   on public.user_favourite_cats for insert with check (user_id = auth.uid());
create policy "favourites delete own"   on public.user_favourite_cats for delete using (user_id = auth.uid());

-- ─── identification votes ──────────────────────────────────────────────────
create policy "id votes public read"  on public.identification_votes for select using (true);
create policy "id votes insert own"   on public.identification_votes for insert with check (voter_id = auth.uid());
create policy "id votes delete own"   on public.identification_votes for delete using (voter_id = auth.uid());

-- ─── flags ──────────────────────────────────────────────────────────────────
create policy "flags public read"  on public.cat_health_flags for select using (true);
create policy "flags insert own"   on public.cat_health_flags for insert with check (flagged_by = auth.uid());
create policy "flags admin update" on public.cat_health_flags for update using (public.is_admin()) with check (public.is_admin());

-- ─── feed logs ──────────────────────────────────────────────────────────────
create policy "feed logs public read" on public.feed_logs for select using (true);
create policy "feed logs insert by feeder"
  on public.feed_logs for insert
  with check (
    feeder_id = auth.uid()
    and exists (
      select 1 from public.users
      where id = auth.uid() and role in ('feeder', 'app_admin')
    )
  );

-- ─── clinic updates ─────────────────────────────────────────────────────────
create policy "clinic updates public read" on public.clinic_updates for select using (true);
create policy "clinic updates insert by clinic admin"
  on public.clinic_updates for insert
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('clinic_admin', 'app_admin')
    )
  );

-- ─── stickers + packs ───────────────────────────────────────────────────────
create policy "sticker packs public read" on public.sticker_packs for select using (true);
create policy "stickers public read"      on public.stickers      for select using (true);
create policy "sticker packs admin"       on public.sticker_packs for all using (public.is_admin()) with check (public.is_admin());
create policy "stickers admin"            on public.stickers      for all using (public.is_admin()) with check (public.is_admin());

create policy "user stickers read own"
  on public.user_stickers for select using (user_id = auth.uid() or public.is_admin());

-- ─── points log ─────────────────────────────────────────────────────────────
-- Read-only to the user; writes only via service role (Edge Functions).
create policy "points log read own"
  on public.points_log for select using (user_id = auth.uid() or public.is_admin());

-- ─── device tokens / notification settings ─────────────────────────────────
create policy "device tokens own"
  on public.device_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notif settings own"
  on public.notification_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
