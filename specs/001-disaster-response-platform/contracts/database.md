# Contract: Supabase Database Interface

What the browser calls directly through `supabase-js` with the anon key (Visitor) or a user
session. Tables are described in [data-model.md](../data-model.md); this file lists the callable
surface: views, RPC functions, storage and Realtime channels. All functions are `security
definer` only where noted, and every one checks `app_role()` itself.

## Helper

| Function | Returns | Notes |
|---|---|---|
| `app_role()` | `app_role` or null | caller's role from `profiles`; null for Visitors. `security definer`, `stable`. Used by RLS policies. |

## Views

### incidents_public

Non-rejected incidents for public map and list. Columns: `id, category_id, group, title,
description, lat, lng, area_geojson, place_name, severity, status, corroboration_count,
reported_at, updated_at, reporter_name` (`reporter_name` is null unless the reporter's
`show_name` is true). Readable by everyone.

## RPC functions

### incidents_in_bbox

Viewport loading for the map (FR-006, FR-009).

| Param | Type | Notes |
|---|---|---|
| `min_lng, min_lat, max_lng, max_lat` | float8 | visible bounds |
| `since` | timestamptz | from time range (1 h, 24 h, 7 d, 30 d) |
| `category_ids` | text[] null | enabled layers; null = all |
| `statuses` | incident_status[] null | null = `pending, verified, resolved` |

Returns rows of `incidents_public`, max 1,000, newest first. Rejected rows never returned.

### incident_summary

Severity counts for the right panel (FR-011). Params: same bounds and `since`. Returns
`{ total, critical, high, moderate, low }` for non-rejected, non-resolved incidents.

### list_incidents

Incident list (FR-041). Params: `q text null` (matches title, description, place), `statuses
incident_status[] null`, `category_ids text[] null`, `since timestamptz null`, `page int` (from 1),
`page_size int` (default 11, max 50). Returns `{ rows: incidents_public[], total int }`, sorted by
`reported_at desc`.

### incident_detail

Params: `incident_id uuid`. Returns the `incidents_public` row plus `photos` (signed URLs),
`history` (status changes with moderator display names), and `my_corroboration boolean`.
Moderators and admins also get rejected incidents and the reporter id.

### toggle_corroboration

Params: `incident_id uuid`. Signed-in only. Inserts or deletes the caller's corroboration.
Returns `{ corroborated boolean, corroboration_count int }`. Errors: `auth_required`,
`own_report` (caller is the reporter), `not_found` (rejected or missing incident).

### set_incident_status

Params: `incident_id uuid`, `expected_status incident_status`, `new_status incident_status`,
`new_severity severity null`, `note text null`. Moderator or admin only (`security definer`).
Checks the allowed transitions in [data-model.md](../data-model.md#incident-status-moderator-or-admin-only-via-set_incident_status),
writes `incident_status_changes`, returns the updated row. Errors: `forbidden`,
`invalid_transition`, `status_conflict` (current status differs from `expected_status`; includes
`current_status`).

### moderation_queue

Moderator or admin only. Returns pending incidents, oldest first, with photo URLs and
corroboration counts (FR-029).

### facilities_near

Params: `lat float8, lng float8, radius_km float8` (default 25, max 200), `types facility_type[]
null`, `limit int` (default 20). Public. Returns facilities with `distance_km`, ordered by true
geographic distance (`ST_DWithin` + `ST_Distance` on `geography`), plus `is_stale` (status older
than 24 h).

### facilities_in_bbox

Params: bounds and `types`. Public. Map layer for facilities.

### set_facility_status

Params: `facility_id uuid, status facility_status`. Moderator or admin only. Sets
`status_updated_at = now()` and `status_updated_by`.

### sos_in_bbox / sos_list

Responder or admin only. `sos_in_bbox(bounds, states sos_state[] null)` for the map;
`sos_list(states, page, page_size)` newest first. Every other role gets `forbidden` and no rows
(FR-032).

### set_sos_state

Params: `sos_id uuid, new_state sos_state`. Responder or admin only. Enforces
`new → acknowledged → responding → closed` (and `new → closed`); `acknowledged` sets
`assigned_to` to the caller. Errors: `forbidden`, `invalid_transition`.

### set_user_role

Params: `user_id uuid, role app_role`. Admin only (FR-005).

## Storage

| Bucket | Write | Read |
|---|---|---|
| `incident-photos` | signed upload URLs from `/api/uploads` only; MIME `image/jpeg, image/png, image/webp, image/heic`; max 10 MB | signed URLs from `incident_detail`; photos of rejected incidents only for moderators and admins |

## Realtime channels

| Channel | Table | Who receives | Use |
|---|---|---|---|
| `incidents-changes` | `incidents` insert and update | everyone (RLS limits rows to non-rejected for non-moderators) | refresh map, list and detail within 1 min (FR-012, SC-007) |
| `sos-changes` | `sos_requests` insert and update | responders and admins only (RLS) | in-app alert for new SOS (FR-033, SC-003) |

Realtime `postgres_changes` applies the table's RLS select policy per subscriber, so the SOS
policy above is the single point that keeps SOS data away from other roles.
