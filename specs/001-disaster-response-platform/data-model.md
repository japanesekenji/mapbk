# Data Model: Bakunawa Disaster Response Platform (MVP)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Database: Supabase Postgres with PostGIS. All timestamps are `timestamptz` stored in UTC and shown
in Philippine Time (UTC+8). All locations are WGS84 (`SRID 4326`) using the `geography` type, so
distances are in meters on the earth's surface.

## Enums

| Enum | Values |
|---|---|
| `app_role` | `citizen`, `moderator`, `responder`, `admin` (Visitor = no session) |
| `category_group` | `natural`, `human_induced`, `facility`, `community` |
| `severity` | `critical`, `high`, `moderate`, `low` |
| `incident_status` | `pending`, `verified`, `resolved`, `rejected` |
| `sos_type` | `medical`, `trapped_flood`, `fire`, `other` |
| `sos_state` | `new`, `acknowledged`, `responding`, `closed` |
| `facility_type` | `evacuation_center`, `hospital`, `police_station`, `fire_station`, `rescue_station`, `relief_center` |
| `facility_status` | `open`, `full`, `closed`, `unknown` |

## Tables

### profiles

One row per Supabase Auth user, created by a trigger on sign-up.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `display_name` | text | 1 to 60 chars |
| `phone` | text null | E.164 or PH mobile format (`09XXXXXXXXX`) |
| `role` | `app_role` | default `citizen`; changed only by `set_user_role` (admin) |
| `show_name` | boolean | default `false` (FR-020) |
| `created_at` | timestamptz | default `now()` |

### categories

Seeded, fixed list (FR-007). Read-only for everyone except admin.

| Field | Type | Rules |
|---|---|---|
| `id` | text PK | layer id from the design: `flood`, `earthquake`, `typhoon`, `landslide`, `volcano`, `tsunami`, `fire`, `chemical`, `structural`, `accident`, `security`, `closure`, `damaged`, `affected_area` |
| `group` | `category_group` | |
| `label` | text | display name |
| `icon` | text | icon name from the handoff `Icon.tsx` |
| `default_severity` | `severity` | applied to new reports (FR-018) |
| `sort_order` | int | |

Facilities and SOS are separate tables, so they are not rows here; the layer panel shows them as
their own layer groups.

### incidents

| Field | Type | Rules |
|---|---|---|
| `id` | uuid PK | |
| `category_id` | text FK → categories | required |
| `title` | text | 3 to 80 chars; defaults to category label + place |
| `description` | text | 1 to 1,000 chars (FR-015) |
| `location` | geography(Point) | required; inside the Philippine service area (lat 4.5 to 21.5, lng 116 to 127) |
| `area` | geography(Polygon) null | for affected areas (FR-014) |
| `location_accuracy_m` | int null | from GPS (FR-016) |
| `place_name` | text | reverse-geocoded or typed, e.g. "Brgy. Tatalon, Quezon City" |
| `severity` | `severity` | default from category |
| `status` | `incident_status` | default `pending` |
| `reporter_id` | uuid FK → profiles | required (reports need an account, FR-003) |
| `corroboration_count` | int | maintained by trigger on `corroborations` |
| `reported_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | bumped on any change |

Indexes: GiST on `location`; btree on `(status, reported_at desc)`, `category_id`.

### incident_photos

| Field | Type | Rules |
|---|---|---|
| `id` | uuid PK | |
| `incident_id` | uuid FK → incidents | on delete cascade |
| `storage_path` | text | path in bucket `incident-photos` |
| `created_at` | timestamptz | |

Rule: at most 4 rows per incident (trigger check). Bucket accepts `image/jpeg`, `image/png`,
`image/webp`, `image/heic` up to 10 MB.

### corroborations

| Field | Type | Rules |
|---|---|---|
| `incident_id` | uuid FK → incidents | |
| `user_id` | uuid FK → profiles | |
| `created_at` | timestamptz | |

PK `(incident_id, user_id)` enforces one per user (FR-023). A check trigger rejects a row where
`user_id` = the incident's `reporter_id`. "Corroborated" progress step shows at
`corroboration_count >= 3` (FR-024).

### incident_status_changes

Append-only history (FR-026, constitution I).

| Field | Type | Rules |
|---|---|---|
| `id` | bigint PK | identity |
| `incident_id` | uuid FK → incidents | |
| `from_status` | `incident_status` | |
| `to_status` | `incident_status` | |
| `from_severity` / `to_severity` | `severity` null | when severity also changed |
| `changed_by` | uuid FK → profiles | moderator or admin |
| `note` | text null | up to 500 chars |
| `changed_at` | timestamptz | |

### sos_requests

| Field | Type | Rules |
|---|---|---|
| `id` | uuid PK | |
| `sender_id` | uuid FK → profiles null | null for Visitor SOS |
| `sender_kind` | text | `user` or `visitor` (FR-030a) |
| `contact_phone` | text | required; PH mobile or E.164 |
| `type` | `sos_type` | required |
| `location` | geography(Point) null | null only if `landmark` given |
| `location_accuracy_m` | int null | |
| `landmark` | text null | required when `location` is null; up to 200 chars |
| `people_count` | int | 1 to 50 |
| `notes` | text null | up to 500 chars |
| `state` | `sos_state` | default `new` |
| `assigned_to` | uuid FK → profiles null | responder who acknowledged |
| `tracking_token_hash` | text | SHA-256 of the token returned to the sender |
| `device_id` | text | from a first-party cookie, for rate limiting |
| `created_at` / `state_updated_at` | timestamptz | |

Indexes: GiST on `location`; btree on `(state, created_at desc)`.

### facilities

| Field | Type | Rules |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | 2 to 120 chars |
| `type` | `facility_type` | required |
| `location` | geography(Point) | required, inside service area |
| `address` | text | |
| `contact_phone` | text null | |
| `capacity` | int null | for evacuation centers |
| `status` | `facility_status` | default `unknown` |
| `status_updated_at` | timestamptz null | set whenever status changes (FR-037) |
| `status_updated_by` | uuid FK → profiles null | |
| `created_at` | timestamptz | |

Index: GiST on `location`. "May be outdated" shows when `status_updated_at` is older than 24 h.

### rate_limit_events

| Field | Type | Rules |
|---|---|---|
| `id` | bigint PK | |
| `subject` | text | user id, or `device:<id>|ip:<sha256>` |
| `action` | text | `report`, `sos`, `upload` |
| `created_at` | timestamptz | |

Limits checked by route handlers: `report` 10 per hour, `sos` 3 per hour, `upload` 40 per hour.
Rows older than 24 h are deleted by a scheduled `pg_cron` job (or on insert).

## Relationships

```text
profiles 1──* incidents (reporter)
profiles 1──* corroborations *──1 incidents
incidents 1──* incident_photos
incidents 1──* incident_status_changes *──1 profiles (changed_by)
categories 1──* incidents
profiles 0..1──* sos_requests (sender, null for visitors)
profiles 0..1──* sos_requests (assigned_to)
profiles 0..1──* facilities (status_updated_by)
```

## State transitions

### Incident status (moderator or admin only, via `set_incident_status`)

```text
pending ──► verified ──► resolved
   │  ▲         │            │
   ▼  │         ▼            │
rejected ◄──────┘            │
                 verified ◄──┘   (reopen if the hazard flares up)
```

Allowed: `pending→verified`, `pending→rejected`, `verified→resolved`, `verified→rejected`,
`resolved→verified`, `rejected→pending`. Every transition writes `incident_status_changes`.
The call passes the expected current status; if another moderator changed it first, the call fails
with `status_conflict` and returns the current value (spec edge case).

Verification progress bar (display only): Reported (always) → Corroborated (count ≥ 3) →
Verified (status `verified` or `resolved`) → Resolved (status `resolved`).

### SOS state (responder or admin only, via `set_sos_state`)

```text
new ──► acknowledged ──► responding ──► closed
 └───────────────────────────────────────▲   (false alarm or duplicate)
```

`acknowledged` sets `assigned_to` to the caller. `closed` is final.

### Facility status (moderator or admin, via `set_facility_status`)

Any value to any value; each change sets `status_updated_at` and `status_updated_by`.

## Access summary (RLS)

| Table / view | Visitor | Citizen | Moderator | Responder | Admin |
|---|---|---|---|---|---|
| `incidents_public` view (non-rejected, reporter shown only if `show_name`) | read | read | read | read | read |
| `incidents` table | read non-rejected rows; `reporter_id` column not granted | same as Visitor, plus own rows | read all rows and columns | same as Visitor | read/write |
| `incident_photos` | read (non-rejected) | read; insert own | read | read | all |
| `corroborations` | count only | insert/delete own | read | read | all |
| `incident_status_changes` | read (non-rejected) | read | read; insert via RPC | read | all |
| `sos_requests` | none (own via token route) | none (own via token route) | **none** | read; update via RPC | all |
| `facilities` | read | read | read; status via RPC | read | all |
| `profiles` | none | own | own | own | all |
| `rate_limit_events` | none | none | none | none | read |

Column-level grants keep `reporter_id` out of reach for the `anon` and `authenticated` roles
while still letting Realtime deliver non-rejected incident rows to every subscriber; moderators
read `reporter_id` through `incident_detail` and `moderation_queue`.

Inserts into `incidents` and `sos_requests` go through route handlers with the service-role key
(validation and rate limits first); the anon and authenticated roles have no direct insert grant
on `sos_requests`.
