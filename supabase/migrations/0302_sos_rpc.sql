-- T056: responder SOS functions (contracts/database.md sos_in_bbox, sos_list, set_sos_state).

create or replace function public.require_role(allowed public.app_role[])
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.app_role() is null or not (public.app_role() = any (allowed)) then
    raise exception 'forbidden' using errcode = '42501', hint = 'forbidden';
  end if;
end;
$$;

-- Row shape returned to responders. Contact details are included; responders need them.
create or replace view public.sos_responder_view
with (security_invoker = true)
as
select
  s.id,
  s.sender_kind,
  case when s.sender_kind = 'user' then p.display_name end as sender_name,
  s.contact_phone,
  s.type,
  st_y(s.location::extensions.geometry) as lat,
  st_x(s.location::extensions.geometry) as lng,
  s.location_accuracy_m,
  s.landmark,
  s.people_count,
  s.notes,
  s.state,
  s.assigned_to,
  a.display_name as assigned_name,
  s.created_at,
  s.state_updated_at
from public.sos_requests s
left join public.profiles p on p.id = s.sender_id
left join public.profiles a on a.id = s.assigned_to;

grant select on public.sos_responder_view to authenticated;

create or replace function public.sos_in_bbox(
  min_lng float8,
  min_lat float8,
  max_lng float8,
  max_lat float8,
  states public.sos_state[] default null
)
returns setof public.sos_responder_view
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform public.require_role(array['responder', 'admin']::public.app_role[]);
  return query
    select v.*
    from public.sos_responder_view v
    join public.sos_requests s on s.id = v.id
    where s.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
      and s.state = any (coalesce(states, array['new', 'acknowledged', 'responding']::public.sos_state[]))
    order by s.created_at desc
    limit 500;
end;
$$;

create or replace function public.sos_list(
  states public.sos_state[] default null,
  page int default 1,
  page_size int default 50
)
returns setof public.sos_responder_view
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.require_role(array['responder', 'admin']::public.app_role[]);
  return query
    select v.*
    from public.sos_responder_view v
    where v.state = any (coalesce(states, array['new', 'acknowledged', 'responding', 'closed']::public.sos_state[]))
    order by v.created_at desc
    limit least(greatest(page_size, 1), 100)
    offset (greatest(page, 1) - 1) * least(greatest(page_size, 1), 100);
end;
$$;

-- new -> acknowledged -> responding -> closed, plus new -> closed (data-model.md "SOS state").
create or replace function public.set_sos_state(sos_id uuid, new_state public.sos_state)
returns public.sos_responder_view
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.sos_state;
  result public.sos_responder_view;
begin
  perform public.require_role(array['responder', 'admin']::public.app_role[]);
  select state into cur from public.sos_requests where id = sos_id for update;
  if cur is null then
    raise exception 'not_found' using errcode = 'P0002', hint = 'not_found';
  end if;
  if not (
    (cur = 'new' and new_state in ('acknowledged', 'closed'))
    or (cur = 'acknowledged' and new_state in ('responding', 'closed'))
    or (cur = 'responding' and new_state = 'closed')
  ) then
    raise exception 'invalid_transition' using errcode = '22023', hint = 'invalid_transition';
  end if;

  update public.sos_requests
  set state = new_state,
      state_updated_at = now(),
      assigned_to = case when new_state = 'acknowledged' then auth.uid() else assigned_to end
  where id = sos_id;

  select * into result from public.sos_responder_view where id = sos_id;
  return result;
end;
$$;

revoke all on function public.sos_in_bbox(float8, float8, float8, float8, public.sos_state[]) from public, anon;
revoke all on function public.sos_list(public.sos_state[], int, int) from public, anon;
revoke all on function public.set_sos_state(uuid, public.sos_state) from public, anon;
grant execute on function public.sos_in_bbox(float8, float8, float8, float8, public.sos_state[]) to authenticated;
grant execute on function public.sos_list(public.sos_state[], int, int) to authenticated;
grant execute on function public.set_sos_state(uuid, public.sos_state) to authenticated;
