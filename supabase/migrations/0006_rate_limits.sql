-- T015: rate limit events (data-model.md rate_limit_events). Written by route handlers only.
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  subject text not null check (char_length(subject) <= 200),
  action text not null check (action in ('report', 'sos', 'upload')),
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx
  on public.rate_limit_events (subject, action, created_at desc);

alter table public.rate_limit_events enable row level security;

create policy "rate limits: admin read" on public.rate_limit_events
  for select to authenticated using (public.app_role() = 'admin');

revoke all on public.rate_limit_events from anon, authenticated;
grant select on public.rate_limit_events to authenticated;

-- Counts recent events for a subject and records a new one when under the limit.
-- Returns 0 when allowed, otherwise the seconds until the oldest event leaves the window.
-- Called by route handlers with the service role. Rows older than 24 h are pruned here.
create or replace function public.rate_limit_hit(p_subject text, p_action text, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_oldest timestamptz;
begin
  delete from public.rate_limit_events where created_at < now() - interval '24 hours';

  select count(*), min(created_at) into v_count, v_oldest
  from public.rate_limit_events
  where subject = p_subject and action = p_action and created_at > now() - interval '1 hour';

  if v_count >= p_limit then
    return greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - now())))::int);
  end if;

  insert into public.rate_limit_events (subject, action) values (p_subject, p_action);
  return 0;
end;
$$;

revoke all on function public.rate_limit_hit(text, text, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, int) to service_role;
