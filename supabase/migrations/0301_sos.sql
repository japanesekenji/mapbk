-- T055: SOS requests (data-model.md sos_requests). Visible to responders and admins only
-- (constitution II, FR-032). Inserts happen only in POST /api/sos with the service role.
create table public.sos_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id) on delete set null,
  sender_kind text not null check (sender_kind in ('user', 'visitor')),
  contact_phone text not null check (contact_phone ~ '^(\+[1-9][0-9]{7,14}|09[0-9]{9})$'),
  type public.sos_type not null,
  location extensions.geography(Point, 4326) check (public.in_service_area(location)),
  location_accuracy_m int check (location_accuracy_m is null or location_accuracy_m >= 0),
  landmark text check (landmark is null or char_length(landmark) between 1 and 200),
  people_count int not null check (people_count between 1 and 50),
  notes text check (notes is null or char_length(notes) <= 500),
  state public.sos_state not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  tracking_token_hash text not null check (char_length(tracking_token_hash) = 64),
  device_id text not null check (char_length(device_id) <= 200),
  created_at timestamptz not null default now(),
  state_updated_at timestamptz not null default now(),
  constraint sos_location_or_landmark check (location is not null or landmark is not null),
  constraint sos_sender_matches_kind check ((sender_kind = 'user') = (sender_id is not null))
);

create index sos_requests_location_gix on public.sos_requests using gist (location);
create index sos_requests_state_created_idx on public.sos_requests (state, created_at desc);

alter table public.sos_requests enable row level security;

create policy "sos: responders and admins read" on public.sos_requests
  for select to authenticated
  using (public.app_role() in ('responder', 'admin'));

-- No insert, update or delete grants for anon or authenticated: writes go through the route
-- handler (insert) and set_sos_state (update), both of which check the caller.
revoke all on public.sos_requests from anon, authenticated;
grant select on public.sos_requests to authenticated;

-- Realtime delivers rows only to subscribers who pass the select policy above.
alter publication supabase_realtime add table public.sos_requests;
