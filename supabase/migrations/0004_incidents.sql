-- T013: incidents, public view and access rules (data-model.md incidents, "Access summary").
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories (id),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 1 and 1000),
  location extensions.geography(Point, 4326) not null check (public.in_service_area(location)),
  area extensions.geography(Polygon, 4326),
  location_accuracy_m int check (location_accuracy_m is null or location_accuracy_m >= 0),
  place_name text check (place_name is null or char_length(place_name) <= 120),
  severity public.severity not null,
  status public.incident_status not null default 'pending',
  reporter_id uuid not null references public.profiles (id),
  corroboration_count int not null default 0 check (corroboration_count >= 0),
  reported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_location_gix on public.incidents using gist (location);
create index incidents_status_reported_idx on public.incidents (status, reported_at desc);
create index incidents_category_idx on public.incidents (category_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger incidents_touch before update on public.incidents
  for each row execute function public.touch_updated_at();

alter table public.incidents enable row level security;

-- Everyone sees non-rejected incidents; moderators and admins see all; reporters see their own.
create policy "incidents: read" on public.incidents
  for select to anon, authenticated
  using (
    status <> 'rejected'
    or public.app_role() in ('moderator', 'admin')
    or reporter_id = auth.uid()
  );

-- Inserts and status changes go through route handlers (service role) and RPC functions.
-- reporter_id is not granted, so reporter identity never leaves the database directly.
revoke all on public.incidents from anon, authenticated;
grant select (
  id, category_id, title, description, location, area, location_accuracy_m, place_name,
  severity, status, corroboration_count, reported_at, updated_at
) on public.incidents to anon, authenticated;

-- Public shape used by the map and list. Runs as the view owner, so it filters rejected rows
-- itself and exposes the reporter's name only when the reporter opted in (FR-020).
create view public.incidents_public as
select
  i.id,
  i.category_id,
  c."group" as category_group,
  c.label as category_label,
  i.title,
  i.description,
  st_y(i.location::extensions.geometry) as lat,
  st_x(i.location::extensions.geometry) as lng,
  case when i.area is null then null else extensions.st_asgeojson(i.area)::jsonb end as area_geojson,
  i.place_name,
  i.severity,
  i.status,
  i.corroboration_count,
  i.reported_at,
  i.updated_at,
  case when p.show_name then p.display_name end as reporter_name
from public.incidents i
join public.categories c on c.id = i.category_id
left join public.profiles p on p.id = i.reporter_id
where i.status <> 'rejected';

grant select on public.incidents_public to anon, authenticated;
