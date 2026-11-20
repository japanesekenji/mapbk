-- T089 security review: Supabase grants INSERT/UPDATE/DELETE on new public objects to anon
-- and authenticated by default. Writes through these views fail today only because they join
-- several tables; revoke them so a later simplification cannot open a write path.
revoke all on public.incidents_public from anon, authenticated;
grant select on public.incidents_public to anon, authenticated;

revoke all on public.sos_responder_view from anon, authenticated;
grant select on public.sos_responder_view to authenticated;

-- Trigger and helper functions are not meant to be called over the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_photo_limit() from public, anon, authenticated;
revoke all on function public.corroboration_guard() from public, anon, authenticated;
revoke all on function public.corroboration_count_sync() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.require_role(public.app_role[]) from public, anon;
