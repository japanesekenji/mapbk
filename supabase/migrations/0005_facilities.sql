-- T014: emergency facilities (data-model.md facilities).
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type public.facility_type not null,
  location extensions.geography(Point, 4326) not null check (public.in_service_area(location)),
  address text not null default '' check (char_length(address) <= 200),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),
  capacity int check (capacity is null or capacity >= 0),
  status public.facility_status not null default 'unknown',
  status_updated_at timestamptz,
  status_updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index facilities_location_gix on public.facilities using gist (location);

alter table public.facilities enable row level security;

create policy "facilities: public read" on public.facilities
  for select to anon, authenticated using (true);

create policy "facilities: admin write" on public.facilities
  for all to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

revoke all on public.facilities from anon, authenticated;
grant select on public.facilities to anon, authenticated;
grant insert, update, delete on public.facilities to authenticated;
