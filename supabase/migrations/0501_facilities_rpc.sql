-- T075: nearest facilities by true geographic distance and status updates
-- (contracts/database.md facilities_near, set_facility_status).

create or replace function public.facilities_near(
  lat float8,
  lng float8,
  radius_km float8 default 25,
  types public.facility_type[] default null,
  max_results int default 20
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
  is_stale boolean,
  distance_km float8
)
language sql
stable
set search_path = public, extensions
as $$
  with here as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g
  )
  select f.id, f.name, f.type,
         st_y(f.location::geometry), st_x(f.location::geometry),
         f.address, f.contact_phone, f.capacity, f.status, f.status_updated_at,
         (f.status_updated_at is null or f.status_updated_at < now() - interval '24 hours'),
         round((st_distance(f.location, here.g) / 1000.0)::numeric, 2)::float8
  from public.facilities f, here
  -- ST_DWithin on geography is a true circle in meters (constitution IV), not a bounding box.
  where st_dwithin(f.location, here.g, least(greatest(radius_km, 0.1), 200) * 1000)
    and (types is null or f.type = any (types))
  order by f.location <-> here.g
  limit least(greatest(max_results, 1), 100);
$$;

create or replace function public.set_facility_status(facility_id uuid, new_status public.facility_status)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() is null or public.app_role() not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.facilities
  set status = new_status, status_updated_at = now(), status_updated_by = auth.uid()
  where id = facility_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('id', facility_id, 'status', new_status, 'status_updated_at', now());
end;
$$;

grant execute on function public.facilities_near(float8, float8, float8, public.facility_type[], int) to anon, authenticated;
revoke all on function public.set_facility_status(uuid, public.facility_status) from public, anon;
grant execute on function public.set_facility_status(uuid, public.facility_status) to authenticated;
