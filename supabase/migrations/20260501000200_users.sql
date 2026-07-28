-- Soi Dogs: users
-- Mirrors auth.users 1:1 via id. A trigger creates a row on signup.

create table public.users (
  id              uuid primary key references auth.users (id) on delete cascade,
  handle          text unique,
  display_name    text,
  avatar_url      text,
  role            user_role not null default 'user',
  points          int not null default 0,
  locale          text not null default 'en',
  home_location   geography(Point, 4326),
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now()
);

create index users_role_idx on public.users (role);

-- Auto-provision a public.users row when auth.users gets a row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, handle, display_name, avatar_url)
  values (
    new.id,
    -- temporary handle, user picks one in onboarding
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data ->> 'name', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the calling user an app admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'app_admin'
  );
$$;

create or replace function public.has_role(required user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = required
  );
$$;
