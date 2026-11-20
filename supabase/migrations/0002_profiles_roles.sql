-- T011: profiles, role helper and RLS (data-model.md profiles).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  phone text check (phone is null or phone ~ '^(\+[1-9][0-9]{7,14}|09[0-9]{9})$'),
  role public.app_role not null default 'citizen',
  show_name boolean not null default false,
  created_at timestamptz not null default now()
);

-- Caller's role, or null for Visitors. Used by RLS policies and RPC functions.
create or replace function public.app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1),
      'Resident'
    ), 60),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.app_role() = 'admin');

create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Users edit only their own name, phone and visibility. Role changes go through set_user_role.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, phone, show_name) on public.profiles to authenticated;
