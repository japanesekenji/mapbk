-- T081: role assignment (contracts/database.md set_user_role, FR-005).

create or replace function public.set_user_role(user_id uuid, new_role public.app_role)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if user_id = auth.uid() and new_role <> 'admin' then
    raise exception 'cannot_demote_self' using errcode = 'P0001';
  end if;
  update public.profiles set role = new_role where id = user_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('id', user_id, 'role', new_role);
end;
$$;

-- Admin user list with emails (auth.users is not exposed to clients).
create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, role public.app_role, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.app_role() is distinct from 'admin' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.role, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.role, p.display_name;
end;
$$;

revoke all on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
