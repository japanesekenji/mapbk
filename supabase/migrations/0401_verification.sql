-- T068: corroborations and status history (data-model.md corroborations,
-- incident_status_changes). Writes go through toggle_corroboration and set_incident_status.

create table public.corroborations (
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (incident_id, user_id)
);

create index corroborations_user_idx on public.corroborations (user_id);

-- Reporters cannot corroborate their own report (FR-023).
create or replace function public.corroboration_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.incidents where id = new.incident_id and reporter_id = new.user_id) then
    raise exception 'own_report' using errcode = 'P0001', hint = 'own_report';
  end if;
  return new;
end;
$$;

create trigger corroborations_guard before insert on public.corroborations
  for each row execute function public.corroboration_guard();

-- Keep incidents.corroboration_count in step (+1 / -1 on top of the seeded baseline).
create or replace function public.corroboration_count_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.incidents set corroboration_count = corroboration_count + 1 where id = new.incident_id;
  elsif tg_op = 'DELETE' then
    update public.incidents set corroboration_count = greatest(corroboration_count - 1, 0) where id = old.incident_id;
  end if;
  return null;
end;
$$;

create trigger corroborations_count after insert or delete on public.corroborations
  for each row execute function public.corroboration_count_sync();

alter table public.corroborations enable row level security;

create policy "corroborations: read own or staff" on public.corroborations
  for select to authenticated
  using (user_id = auth.uid() or public.app_role() in ('moderator', 'responder', 'admin'));

revoke all on public.corroborations from anon, authenticated;
grant select on public.corroborations to authenticated;

create table public.incident_status_changes (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  from_status public.incident_status not null,
  to_status public.incident_status not null,
  from_severity public.severity,
  to_severity public.severity,
  changed_by uuid not null references public.profiles (id),
  note text check (note is null or char_length(note) <= 500),
  changed_at timestamptz not null default now()
);

create index incident_status_changes_incident_idx on public.incident_status_changes (incident_id, changed_at desc);

alter table public.incident_status_changes enable row level security;

-- History is readable wherever the incident is (incident RLS applies in the subquery).
create policy "status changes: read with incident" on public.incident_status_changes
  for select to anon, authenticated
  using (exists (select 1 from public.incidents i where i.id = incident_id));

revoke all on public.incident_status_changes from anon, authenticated;
grant select on public.incident_status_changes to anon, authenticated;
