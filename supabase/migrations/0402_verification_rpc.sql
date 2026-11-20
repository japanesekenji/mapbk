-- T069: verification functions (contracts/database.md toggle_corroboration,
-- set_incident_status, moderation_queue, incident_detail). Errors carry their code in the
-- message so the client can branch on it: auth_required, own_report, not_found, forbidden,
-- invalid_transition, status_conflict.

create or replace function public.toggle_corroboration(incident_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inc record;
  now_on boolean;
begin
  if uid is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;
  select i.id, i.reporter_id, i.status into inc from public.incidents i where i.id = toggle_corroboration.incident_id;
  if inc.id is null or inc.status = 'rejected' then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if inc.reporter_id = uid then
    raise exception 'own_report' using errcode = 'P0001';
  end if;

  delete from public.corroborations c where c.incident_id = inc.id and c.user_id = uid;
  if found then
    now_on := false;
  else
    insert into public.corroborations (incident_id, user_id) values (inc.id, uid);
    now_on := true;
  end if;

  return jsonb_build_object(
    'corroborated', now_on,
    'corroboration_count', (select corroboration_count from public.incidents where id = inc.id)
  );
end;
$$;

create or replace function public.set_incident_status(
  incident_id uuid,
  expected_status public.incident_status,
  new_status public.incident_status,
  new_severity public.severity default null,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur record;
  sev public.severity;
begin
  if public.app_role() is null or public.app_role() not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select i.id, i.status, i.severity into cur
  from public.incidents i where i.id = set_incident_status.incident_id for update;
  if cur.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  -- Another moderator changed it first (spec edge case): report the current value.
  if cur.status <> expected_status then
    raise exception 'status_conflict' using errcode = 'P0001', detail = cur.status::text;
  end if;

  sev := coalesce(new_severity, cur.severity);
  if new_status = cur.status and sev = cur.severity then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if new_status <> cur.status and not (
    (cur.status = 'pending' and new_status in ('verified', 'rejected'))
    or (cur.status = 'verified' and new_status in ('resolved', 'rejected'))
    or (cur.status = 'resolved' and new_status = 'verified')
    or (cur.status = 'rejected' and new_status = 'pending')
  ) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.incidents set status = new_status, severity = sev where id = cur.id;

  insert into public.incident_status_changes
    (incident_id, from_status, to_status, from_severity, to_severity, changed_by, note)
  values (
    cur.id, cur.status, new_status,
    case when sev <> cur.severity then cur.severity end,
    case when sev <> cur.severity then sev end,
    auth.uid(), nullif(trim(note), '')
  );

  return jsonb_build_object('id', cur.id, 'status', new_status, 'severity', sev);
end;
$$;

create or replace function public.moderation_queue()
returns table (
  id uuid,
  title text,
  description text,
  category_id text,
  category_label text,
  place_name text,
  lat float8,
  lng float8,
  severity public.severity,
  status public.incident_status,
  corroboration_count int,
  reported_at timestamptz,
  reporter_name text,
  photo_paths text[]
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if public.app_role() is null or public.app_role() not in ('moderator', 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select i.id, i.title, i.description, i.category_id, c.label, i.place_name,
           st_y(i.location::geometry), st_x(i.location::geometry),
           i.severity, i.status, i.corroboration_count, i.reported_at, p.display_name,
           coalesce((select array_agg(ph.storage_path order by ph.created_at)
                     from public.incident_photos ph where ph.incident_id = i.id), '{}')
    from public.incidents i
    join public.categories c on c.id = i.category_id
    join public.profiles p on p.id = i.reporter_id
    where i.status = 'pending'
    order by i.reported_at asc
    limit 200;
end;
$$;

create or replace function public.incident_detail(incident_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  -- coalesce: app_role() is null for Visitors, and NOT NULL would skip the rejected check.
  staff boolean := coalesce(public.app_role() in ('moderator', 'admin'), false);
  inc record;
begin
  select i.*, c.label as category_label, c."group" as category_group,
         p.display_name as reporter_display_name, p.show_name
  into inc
  from public.incidents i
  join public.categories c on c.id = i.category_id
  join public.profiles p on p.id = i.reporter_id
  where i.id = incident_detail.incident_id;

  if inc.id is null or (inc.status = 'rejected' and not staff and inc.reporter_id is distinct from auth.uid()) then
    return null;
  end if;

  return jsonb_build_object(
    'id', inc.id,
    'category_id', inc.category_id,
    'category_label', inc.category_label,
    'category_group', inc.category_group,
    'title', inc.title,
    'description', inc.description,
    'lat', st_y(inc.location::geometry),
    'lng', st_x(inc.location::geometry),
    'area_geojson', case when inc.area is null then null else st_asgeojson(inc.area)::jsonb end,
    'location_accuracy_m', inc.location_accuracy_m,
    'place_name', inc.place_name,
    'severity', inc.severity,
    'status', inc.status,
    'corroboration_count', inc.corroboration_count,
    'reported_at', inc.reported_at,
    'updated_at', inc.updated_at,
    'reporter_name', case when inc.show_name or staff then inc.reporter_display_name end,
    'is_own_report', inc.reporter_id = auth.uid(),
    'my_corroboration', exists (
      select 1 from public.corroborations c where c.incident_id = inc.id and c.user_id = auth.uid()
    ),
    'photo_paths', coalesce((
      select jsonb_agg(ph.storage_path order by ph.created_at)
      from public.incident_photos ph where ph.incident_id = inc.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from_status', h.from_status, 'to_status', h.to_status,
        'from_severity', h.from_severity, 'to_severity', h.to_severity,
        'note', h.note, 'changed_at', h.changed_at, 'changed_by_name', m.display_name
      ) order by h.changed_at desc)
      from public.incident_status_changes h
      join public.profiles m on m.id = h.changed_by
      where h.incident_id = inc.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Which of these incidents the caller has corroborated (for the map card).
create or replace function public.my_corroborations(incident_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.incident_id from public.corroborations c
  where c.user_id = auth.uid() and c.incident_id = any (incident_ids);
$$;

revoke all on function public.toggle_corroboration(uuid) from public;
revoke all on function public.set_incident_status(uuid, public.incident_status, public.incident_status, public.severity, text) from public, anon;
revoke all on function public.moderation_queue() from public, anon;
grant execute on function public.toggle_corroboration(uuid) to anon, authenticated;
grant execute on function public.set_incident_status(uuid, public.incident_status, public.incident_status, public.severity, text) to authenticated;
grant execute on function public.moderation_queue() to authenticated;
grant execute on function public.incident_detail(uuid) to anon, authenticated;
grant execute on function public.my_corroborations(uuid[]) to authenticated;
