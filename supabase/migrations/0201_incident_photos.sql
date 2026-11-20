-- T043: incident photos and storage bucket (data-model.md incident_photos,
-- contracts/database.md "Storage").
create table public.incident_photos (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  storage_path text not null unique check (storage_path ~ '^incidents/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  created_at timestamptz not null default now()
);

create index incident_photos_incident_idx on public.incident_photos (incident_id);

-- At most 4 photos per incident (FR-015).
create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.incident_photos where incident_id = new.incident_id) >= 4 then
    raise exception 'An incident can have at most 4 photos' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger incident_photos_limit before insert on public.incident_photos
  for each row execute function public.enforce_photo_limit();

alter table public.incident_photos enable row level security;

-- Same visibility as the incident itself (RLS on incidents applies inside the subquery).
create policy "photos: read with incident" on public.incident_photos
  for select to anon, authenticated
  using (exists (select 1 from public.incidents i where i.id = incident_id));

revoke all on public.incident_photos from anon, authenticated;
grant select on public.incident_photos to anon, authenticated;

-- Private bucket: uploads only through signed URLs from /api/uploads (service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-photos', 'incident-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Readers may sign URLs for photos of incidents they can see; never for pending uploads.
create policy "incident photos: read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'incident-photos'
    and exists (
      select 1 from public.incident_photos p
      where p.storage_path = storage.objects.name
    )
  );
