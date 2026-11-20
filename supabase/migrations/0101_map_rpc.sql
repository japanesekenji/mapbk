-- T030: map loading functions (contracts/database.md incidents_in_bbox, incident_summary,
-- facilities_in_bbox). Security invoker: they run with the caller's grants and RLS.

create or replace function public.incidents_in_bbox(
  min_lng float8,
  min_lat float8,
  max_lng float8,
  max_lat float8,
  since timestamptz default null,
  category_ids text[] default null,
  statuses public.incident_status[] default null
)
returns setof public.incidents_public
language sql
stable
set search_path = public, extensions
as $$
  with env as (select st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography as g)
  select v.*
  from public.incidents i
  join public.incidents_public v on v.id = i.id
  cross join env
  where (i.location && env.g or (i.area is not null and i.area && env.g))
    and (since is null or i.reported_at >= since)
    and (category_ids is null or i.category_id = any (category_ids))
    and i.status = any (coalesce(statuses, array['pending', 'verified', 'resolved']::public.incident_status[]))
    and i.status <> 'rejected'
  order by i.reported_at desc
  limit 1000;
$$;

-- Active (pending or verified) incident counts by severity for the summary panel (FR-011).
create or replace function public.incident_summary(
  min_lng float8,
  min_lat float8,
  max_lng float8,
  max_lat float8,
  since timestamptz default null
)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'total', count(*),
    'critical', count(*) filter (where severity = 'critical'),
    'high', count(*) filter (where severity = 'high'),
    'moderate', count(*) filter (where severity = 'moderate'),
    'low', count(*) filter (where severity = 'low')
  )
  from public.incidents i
  where i.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and i.status in ('pending', 'verified')
    and (since is null or i.reported_at >= since);
$$;

create or replace function public.facilities_in_bbox(
  min_lng float8,
  min_lat float8,
  max_lng float8,
  max_lat float8,
  types public.facility_type[] default null
)
returns table (
  id uuid,
  name text,
  type public.facility_type,
  lat float8,
  lng float8,
  address text,
  contact_phone text,
  capacity int,
  status public.facility_status,
  status_updated_at timestamptz,
  is_stale boolean
)
language sql
stable
set search_path = public, extensions
as $$
  select f.id, f.name, f.type,
         st_y(f.location::geometry), st_x(f.location::geometry),
         f.address, f.contact_phone, f.capacity, f.status, f.status_updated_at,
         (f.status_updated_at is null or f.status_updated_at < now() - interval '24 hours')
  from public.facilities f
  where f.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (types is null or f.type = any (types))
  order by f.name
  limit 500;
$$;

grant execute on function public.incidents_in_bbox(float8, float8, float8, float8, timestamptz, text[], public.incident_status[]) to anon, authenticated;
grant execute on function public.incident_summary(float8, float8, float8, float8, timestamptz) to anon, authenticated;
grant execute on function public.facilities_in_bbox(float8, float8, float8, float8, public.facility_type[]) to anon, authenticated;
