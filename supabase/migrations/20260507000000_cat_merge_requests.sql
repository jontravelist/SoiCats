-- Cheap version of duplicate-cat handling: any user can request a merge,
-- admin approves via Studio (or via approve_cat_merge() called from a
-- future admin UI). Approval reassigns every related row to the target
-- cat and deletes the source. cat_merge_requests itself is the audit log.

create type cat_merge_status as enum ('open', 'approved', 'rejected');

create table public.cat_merge_requests (
  id              uuid primary key default gen_random_uuid(),
  source_cat_id   uuid not null references public.cats (id) on delete cascade,
  target_cat_id   uuid not null references public.cats (id) on delete cascade,
  requested_by    uuid not null references public.users (id) on delete cascade,
  reason          text not null check (length(reason) between 1 and 1000),
  status          cat_merge_status not null default 'open',
  resolved_at     timestamptz,
  resolved_by     uuid references public.users (id),
  created_at      timestamptz not null default now(),
  -- Belt and braces: don't allow self-merge, don't double-stack open requests.
  check (source_cat_id <> target_cat_id)
);

create unique index cat_merge_requests_open_unique
  on public.cat_merge_requests (source_cat_id, target_cat_id)
  where status = 'open';

create index cat_merge_requests_status_idx on public.cat_merge_requests (status, created_at desc);
create index cat_merge_requests_source_idx on public.cat_merge_requests (source_cat_id);

alter table public.cat_merge_requests enable row level security;

create policy "merge requests public read"
  on public.cat_merge_requests for select using (true);

create policy "merge requests insert by anyone signed in"
  on public.cat_merge_requests for insert
  with check (requested_by = auth.uid());

create policy "merge requests admin update"
  on public.cat_merge_requests for update using (public.is_admin()) with check (public.is_admin());

-- approve_cat_merge: reassign every related row from source to target, then
-- delete source. Idempotent — running on an already-approved request is a no-op.
-- Admin-only (security definer + role check).
create or replace function public.approve_cat_merge(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req      record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select * into req from public.cat_merge_requests where id = request_id;
  if not found then
    raise exception 'merge request not found';
  end if;
  if req.status <> 'open' then
    return;
  end if;

  -- Reassign sightings (and let the territory trigger recalc on the next post).
  update public.sightings
     set cat_id = req.target_cat_id
   where cat_id = req.source_cat_id;

  -- Reassign flags. Open and verified ones survive; the photographer/flagger
  -- doesn't lose any points already awarded.
  update public.cat_health_flags
     set cat_id = req.target_cat_id
   where cat_id = req.source_cat_id;

  update public.feed_logs
     set cat_id = req.target_cat_id
   where cat_id = req.source_cat_id;

  update public.clinic_updates
     set cat_id = req.target_cat_id
   where cat_id = req.source_cat_id;

  update public.identification_votes
     set proposed_cat_id = req.target_cat_id
   where proposed_cat_id = req.source_cat_id;

  -- Favourites: avoid duplicate-key collisions by skipping rows already
  -- favouriting the target.
  delete from public.user_favourite_cats
   where cat_id = req.source_cat_id
     and user_id in (
       select user_id from public.user_favourite_cats where cat_id = req.target_cat_id
     );
  update public.user_favourite_cats
     set cat_id = req.target_cat_id
   where cat_id = req.source_cat_id;

  -- Recalculate the target's territory now that it has new sightings.
  perform public.recalculate_territory(req.target_cat_id);

  -- Drop the source cat (cascade tidies any leftover refs).
  delete from public.cats where id = req.source_cat_id;

  update public.cat_merge_requests
     set status = 'approved',
         resolved_at = now(),
         resolved_by = auth.uid()
   where id = request_id;
end;
$$;

create or replace function public.reject_cat_merge(request_id uuid, _reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.cat_merge_requests
     set status = 'rejected',
         resolved_at = now(),
         resolved_by = auth.uid()
   where id = request_id and status = 'open';
end;
$$;
