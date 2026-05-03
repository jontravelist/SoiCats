-- Verified Feeder applications. Anyone with role='user' can apply once
-- (per status='open'); admins approve via the new /admin/feeder-applications
-- screen which bumps their role to 'feeder'.

create type feeder_application_status as enum ('open', 'approved', 'rejected');

create table public.feeder_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  area         text not null check (length(area) between 1 and 200),
  bio          text not null check (length(bio) between 1 and 1000),
  status       feeder_application_status not null default 'open',
  resolved_at  timestamptz,
  resolved_by  uuid references public.users (id),
  reject_reason text,
  created_at   timestamptz not null default now()
);

create unique index feeder_applications_one_open_per_user
  on public.feeder_applications (user_id)
  where status = 'open';
create index feeder_applications_status_idx
  on public.feeder_applications (status, created_at desc);

alter table public.feeder_applications enable row level security;

create policy "feeder apps read own or admin"
  on public.feeder_applications for select
  using (user_id = auth.uid() or public.is_admin());

create policy "feeder apps insert own"
  on public.feeder_applications for insert
  with check (user_id = auth.uid());

create policy "feeder apps admin update"
  on public.feeder_applications for update
  using (public.is_admin())
  with check (public.is_admin());

-- Approval flips the application to approved AND promotes the user's role.
-- Doing it here (server-side, atomically) avoids the client having to make
-- two writes that could land out of order under flaky network.
create or replace function public.approve_feeder_application(application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  app record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select * into app from public.feeder_applications where id = application_id;
  if not found or app.status <> 'open' then
    return;
  end if;

  update public.users
     set role = case
       -- Don't demote an existing admin to feeder.
       when role = 'app_admin' then role
       else 'feeder'::user_role
     end
   where id = app.user_id;

  update public.feeder_applications
     set status = 'approved',
         resolved_at = now(),
         resolved_by = auth.uid()
   where id = application_id;
end;
$$;

create or replace function public.reject_feeder_application(
  application_id uuid,
  why            text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.feeder_applications
     set status = 'rejected',
         resolved_at = now(),
         resolved_by = auth.uid(),
         reject_reason = why
   where id = application_id and status = 'open';
end;
$$;
