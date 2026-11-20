-- T010: extensions and enums (data-model.md "Enums").
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('citizen', 'moderator', 'responder', 'admin');
create type public.category_group as enum ('natural', 'human_induced', 'facility', 'community');
create type public.severity as enum ('critical', 'high', 'moderate', 'low');
create type public.incident_status as enum ('pending', 'verified', 'resolved', 'rejected');
create type public.sos_type as enum ('medical', 'trapped_flood', 'fire', 'other');
create type public.sos_state as enum ('new', 'acknowledged', 'responding', 'closed');
create type public.facility_type as enum (
  'evacuation_center', 'hospital', 'police_station', 'fire_station', 'rescue_station', 'relief_center'
);
create type public.facility_status as enum ('open', 'full', 'closed', 'unknown');

-- Philippine service area (lat 4.5 to 21.5, lng 116 to 127), shared by every location check.
create or replace function public.in_service_area(p extensions.geography)
returns boolean
language sql
immutable
set search_path = public, extensions
as $$
  select p is null or (
    st_y(p::geometry) between 4.5 and 21.5
    and st_x(p::geometry) between 116 and 127
  );
$$;
