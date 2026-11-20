---
description: "Task list for Bakunawa Disaster Response Platform (MVP)"
---

# Tasks: Bakunawa Disaster Response Platform (MVP)

**Input**: Design documents from `/specs/001-disaster-response-platform/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/http-api.md](./contracts/http-api.md),
[contracts/database.md](./contracts/database.md), [quickstart.md](./quickstart.md)

**Tests**: Included only for the four critical paths the constitution (Principle V) requires:
report submission (US2), SOS send (US3), SOS access by role (US3), and status change (US4).

**Organization**: Tasks are grouped by user story so each story can be built and tested on its
own.

**Paths**: single Next.js project at the repository root `bakunawa/` (see plan.md Project
Structure). SQL lives in `supabase/`. All Node commands run inside the `app` container
(`docker compose run --rm app ...`), per research R13.

**Field citations**: constraints are defined once in [data-model.md](./data-model.md). Tasks cite
them as `data-model.md Entity.field`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: user story the task belongs to (US1 to US6)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: project skeleton, containers, tooling, design assets

- [X] T001 Create `Dockerfile.dev` (Node 22 base, working dir `/app`) and `docker-compose.yml` with services `app` (port 3000, source mounted, `node_modules` in a named volume, reads `.env.local`) and `e2e` (official Playwright image, shares the source mount) at the repository root
- [X] T002 Verify the Windows Application Control risk from research R13: run `docker compose run --rm app node -e "console.log(process.platform)"` and record the result (expected `linux`) in `README.md` under "Local development"
- [X] T003 Initialize the Next.js App Router project with TypeScript strict mode, Tailwind CSS and ESLint inside the container, producing `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx` at the repository root
- [X] T004 Add dependencies to `package.json`: `@supabase/supabase-js`, `@supabase/ssr`, `maplibre-gl`, `zod`, `browser-image-compression`, `papaparse`; dev: `vitest`, `@playwright/test`, `supabase` (CLI), `tsx`
- [X] T005 [P] Create `.env.example` listing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` with empty values, and add `.env.local` to `.gitignore`
- [X] T006 [P] Add npm scripts in `package.json`: `dev`, `build`, `lint`, `db:push` (applies `supabase/migrations` using `SUPABASE_DB_URL`), `db:seed` (runs `supabase/seed.sql`), `test:unit`, `test:db`, `test:e2e`, and `test` (runs all three in order)
- [X] T007 [P] Configure Vitest in `vitest.config.ts` with projects `unit` (`tests/unit/**`) and `db` (`tests/db/**`, loads `.env.local`), and Playwright in `playwright.config.ts` (`tests/e2e/**`, base URL `http://app:3000`, projects for desktop 1440×900 and mobile 390×844)
- [X] T008 [P] Copy design assets: `bakunawa-mark.png` and `bakunawa-logo-full.png` from `Ui Reference/UI Design/bakunawa-disaster-response-platform/project/design_handoff_bakunawa_web_app/assets/` to `public/brand/`, and `icons/Icon.tsx` plus `icons/sprite.svg` to `src/components/icons/`
- [X] T009 [P] Create `src/styles/tokens.css` with every color, radius, shadow and spacing token from the handoff README "Design Tokens" section as CSS variables, map them in the Tailwind theme, and load Bricolage Grotesque and Instrument Sans with `next/font/google` in `src/app/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: database core, auth, roles, shared libraries and layout that every story needs

**⚠️ CRITICAL**: no user story work starts until this phase is done

- [X] T010 Create `supabase/migrations/0001_extensions_enums.sql`: enable `postgis` and `pgcrypto`; create enums `app_role`, `category_group`, `severity`, `incident_status`, `sos_type`, `sos_state`, `facility_type`, `facility_status` per data-model.md Enums
- [X] T011 Create `supabase/migrations/0002_profiles_roles.sql`: table `profiles` with data-model.md profiles.id, profiles.display_name, profiles.phone, profiles.role, profiles.show_name, profiles.created_at; trigger creating a profile on `auth.users` insert; `security definer stable` function `app_role()` per contracts/database.md Helper; RLS so users read and update only their own row (role column excluded from self-update), admins read all
- [X] T012 Create `supabase/migrations/0003_categories.sql`: table `categories` with data-model.md categories.id, categories.group, categories.label, categories.icon, categories.default_severity, categories.sort_order; RLS public read, admin write
- [X] T013 Create `supabase/migrations/0004_incidents.sql`: table `incidents` with data-model.md incidents.id, incidents.category_id, incidents.title, incidents.description, incidents.location, incidents.area, incidents.location_accuracy_m, incidents.place_name, incidents.severity, incidents.status, incidents.reporter_id, incidents.corroboration_count, incidents.reported_at, incidents.updated_at, with check constraints for lengths and the service-area bounds on incidents.location; GiST and btree indexes; `updated_at` trigger; RLS and column grants per data-model.md "Access summary" (`reporter_id` not granted to `anon`/`authenticated`); view `incidents_public` per contracts/database.md
- [X] T014 Create `supabase/migrations/0005_facilities.sql`: table `facilities` with data-model.md facilities.id, facilities.name, facilities.type, facilities.location, facilities.address, facilities.contact_phone, facilities.capacity, facilities.status, facilities.status_updated_at, facilities.status_updated_by, facilities.created_at; GiST index; RLS public read, admin write
- [X] T015 Create `supabase/migrations/0006_rate_limits.sql`: table `rate_limit_events` with data-model.md rate_limit_events.id, rate_limit_events.subject, rate_limit_events.action, rate_limit_events.created_at; index on `(subject, action, created_at)`; RLS admin read only; cleanup of rows older than 24 h
- [X] T016 Create `supabase/migrations/0007_realtime.sql`: add `incidents` to the `supabase_realtime` publication
- [X] T017 Create `supabase/seed.sql` part 1: all category rows (ids, groups, labels, icons and default severities per data-model.md categories) and one auth user plus profile per role (citizen, second citizen, moderator, responder, admin) with test passwords; document the demo accounts in `README.md`
- [X] T018 [P] Create Supabase clients in `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts` (cookie session via `@supabase/ssr`) and `src/lib/supabase/service.ts` (service-role, server-only import guard)
- [X] T019 [P] Create `src/lib/geo.ts`: Philippine service-area check (lat 4.5 to 21.5, lng 116 to 127), bbox helpers, Google Maps directions URL builder (research R11)
- [X] T020 [P] Create `src/lib/time.ts`: format UTC timestamps in Philippine Time and relative times ("2 min ago")
- [X] T021 [P] Create `src/lib/validation/common.ts`: zod schemas for location, PH phone number (data-model.md profiles.phone), and the error envelope and codes from contracts/http-api.md "Common rules"
- [X] T022 [P] Create `src/lib/rate-limit.ts`: subject from user id, else `bk_device` cookie plus SHA-256 of IP; `checkAndRecord(action, limit)` counting the last hour in `rate_limit_events`; returns `retry_after_s` (research R7)
- [X] T023 Create `src/proxy.ts` (Next.js 16 renamed middleware to proxy): refresh the Supabase session and set the HttpOnly `bk_device` cookie on first visit
- [X] T024 [P] Create `src/components/layout/DesktopHeader.tsx` (logo, nav pills Map / Incident List / Settings, SOS Emergency and Report Hazard buttons, avatar) and `src/components/layout/MobileTabBar.tsx` (Map, Incidents, Report FAB, Facilities, Profile) per the handoff screens 1a and 1c
- [X] T025 Create the shared shell in `src/app/(public)/layout.tsx` switching between desktop header and mobile tab bar below 768 px, with loading, empty and error-with-retry components in `src/components/layout/States.tsx` (FR-046)
- [X] T026 Create `src/app/(public)/profile/page.tsx`: email and password sign-up and sign-in, sign-out, shows role, edits data-model.md profiles.display_name, profiles.phone and profiles.show_name
- [X] T027 [P] Create `src/components/incidents/StatusChip.tsx` (Pending, Verified, Resolved colors from the handoff; Pending labeled "Unverified", FR-027) and `src/components/incidents/SeverityDot.tsx`
- [X] T028 Write unit tests for `src/lib/geo.ts`, `src/lib/time.ts` and `src/lib/validation/common.ts` in `tests/unit/lib.test.ts`

**Checkpoint**: `npm run db:push` and `npm run db:seed` succeed; sign-in works for every seeded role.

---

## Phase 3: User Story 1 - View hazards and incidents on a map (Priority: P1) 🎯 MVP

**Goal**: map of incidents, affected areas and facilities with layers, time range, search,
selection and live updates.

**Independent Test**: quickstart V1 and V2 with seeded data.

- [ ] T029 [US1] Extend `supabase/seed.sql` with about 40 Metro Manila incidents across every category, severity and status (including 2 affected areas with data-model.md incidents.area polygons) and about 25 facilities of every data-model.md facilities.type with mixed facilities.status values and some facilities.status_updated_at older than 24 h
- [ ] T030 [US1] Create `supabase/migrations/0101_map_rpc.sql`: functions `incidents_in_bbox`, `incident_summary` and `facilities_in_bbox` per contracts/database.md (rejected rows never returned; max 1,000 rows)
- [ ] T031 [P] [US1] Create the basemap style in `src/components/map/style.ts` using OpenFreeMap vector tiles with land, water, park and road colors from the handoff (research R3)
- [ ] T032 [US1] Create `src/components/map/MapView.tsx`: MapLibre map centered on Metro Manila, refetches `incidents_in_bbox` and `facilities_in_bbox` on move end (debounced), clustered GeoJSON source (FR-013), polygon layer for affected areas (FR-014), zoom and locate-me controls
- [ ] T033 [P] [US1] Create `src/components/map/Pin.tsx`: teardrop pin per handoff (severity color, facility green, selected scale 1.2 with halo) using `layerIcon` from `src/components/icons/Icon.tsx`
- [ ] T034 [P] [US1] Create `src/components/map/LayerPanel.tsx`: four groups and rows from FR-007 with checkbox and count; SOS row shows a lock and is disabled unless the user's role is responder or admin
- [ ] T035 [P] [US1] Create `src/components/map/FilterBar.tsx`: place search input calling `/api/geocode`, time-range segments (1 h, 24 h, 7 d, 30 d), "Live · N min ago" indicator (FR-012)
- [ ] T036 [US1] Create `src/app/api/geocode/route.ts` per contracts/http-api.md "GET /api/geocode": Nominatim with `countrycodes=ph`, generic User-Agent, 1 request per second, 24-hour in-memory cache, `degraded` fallback (research R10)
- [ ] T037 [P] [US1] Create `src/components/map/IncidentCard.tsx` (desktop detail card) and `src/components/map/BottomSheet.tsx` (mobile): icon tile, title, place and time, StatusChip, description, verification progress bar per data-model.md "Verification progress bar", Corroborate button (read-only count for now) and Directions link
- [ ] T038 [P] [US1] Create `src/components/map/SummaryPanel.tsx`: active total and severity bars from `incident_summary`, "Recent reports" rows that select the marker on click (FR-011)
- [ ] T039 [US1] Assemble `src/app/(public)/page.tsx`: desktop three-column layout (LayerPanel, map column, SummaryPanel) and mobile layout (search pill, layer chips, SOS pill, locate FAB, BottomSheet) per handoff 1a and 1c, with layer, time-range and selection state from the handoff "State Management" section
- [ ] T040 [US1] Create `src/lib/realtime.ts` and wire it into `src/app/(public)/page.tsx`: subscribe to `incidents-changes` (contracts/database.md Realtime) to refresh markers and the summary, with a 60-second refetch fallback (research R9)

**Checkpoint**: US1 works alone on seeded data (quickstart V1, V2).

---

## Phase 4: User Story 2 - Report an incident (Priority: P1)

**Goal**: signed-in citizens submit reports with category, GPS location, description and up to 4
photos; reports start Pending.

**Independent Test**: quickstart V3, V4 and V14.

### Tests for User Story 2 (constitution V: report submission)

- [ ] T041 [P] [US2] Write Vitest tests for `POST /api/reports` validation and rate limiting in `tests/unit/reports-route.test.ts`: missing category, description over the data-model.md incidents.description limit, location outside the service area (`422`), 5 photo paths (`400`), 11th report in an hour (`429`)
- [ ] T042 [P] [US2] Write Playwright test `tests/e2e/report.spec.ts`: sign in as citizen, choose Flood, keep the pin, enter a description, attach 2 photos, submit; assert the report shows as Pending on the map, and a fifth photo is refused

### Implementation for User Story 2

- [ ] T043 [US2] Create `supabase/migrations/0201_incident_photos.sql`: table `incident_photos` with data-model.md incident_photos.id, incident_photos.incident_id, incident_photos.storage_path, incident_photos.created_at; trigger enforcing the 4-photo limit; storage bucket `incident-photos` with the MIME types and 10 MB limit per contracts/database.md Storage
- [ ] T044 [P] [US2] Create `src/lib/validation/report.ts`: zod schema for the `POST /api/reports` body per contracts/http-api.md, citing data-model.md incidents.category_id, incidents.description, incidents.location, incidents.location_accuracy_m, incidents.place_name
- [ ] T045 [US2] Create `src/app/api/uploads/route.ts` per contracts/http-api.md "POST /api/uploads": signed-in only, `upload` rate limit 40 per hour, rejects over 10 MB (`413`) and other types (`415`), returns a signed upload URL under `pending/<user>/`
- [ ] T046 [US2] Create `src/app/api/reports/route.ts` per contracts/http-api.md "POST /api/reports": signed-in only (`401`), `report` rate limit 10 per hour, validates with `src/lib/validation/report.ts`, inserts the incident with data-model.md incidents.status `pending`, incidents.severity from data-model.md categories.default_severity, incidents.title defaulted from category label and place, incidents.reporter_id from the session, then moves photos from `pending/` and inserts `incident_photos` rows
- [ ] T047 [P] [US2] Create `src/components/report/CategoryGrid.tsx` (Flood, Fire, Earthquake, Landslide, Accident, More expanding to all categories) per handoff mobile screen 3
- [ ] T048 [P] [US2] Create `src/components/report/LocationPicker.tsx`: GPS capture with accuracy display (FR-016), draggable pin on a mini map, reverse-geocoded place name, warning when accuracy is worse than ±100 m
- [ ] T049 [P] [US2] Create `src/components/report/PhotoPicker.tsx`: up to 4 photos, client compression to 1600 px and under about 600 KB with `browser-image-compression` (research R8), upload through `/api/uploads`
- [ ] T050 [US2] Create `src/app/(public)/report/page.tsx`: category, location, details and photos on one scrollable screen with a sticky Submit button (handoff screen 3); redirects Visitors to sign-in; keeps the draft in session storage on failure and offers retry (FR-019); field-level error messages
- [ ] T051 [US2] Link the desktop "Report Hazard" button and the mobile Report FAB to `/report`, and after success return to the map with the new incident selected

**Checkpoint**: US2 works with US1 (new report appears on the map) and its tests pass.

---

## Phase 5: User Story 3 - Send an emergency SOS (Priority: P1)

**Goal**: visitors and users send SOS requests; only responders and admins see and handle them.

**Independent Test**: quickstart V5, V6 and V7.

### Tests for User Story 3 (constitution V: SOS send and SOS access by role)

- [ ] T052 [P] [US3] Write Vitest database tests `tests/db/sos-access.test.ts`: as Visitor, citizen and moderator sessions, `select` on `sos_requests`, `sos_list` and `sos_in_bbox` return no rows or `forbidden`; as responder and admin they return the seeded requests; direct `insert` into `sos_requests` with the anon key is refused
- [ ] T053 [P] [US3] Write Vitest tests `tests/unit/sos-route.test.ts` for `POST /api/sos`: Visitor without phone (`400`), `confirmed` false (`400`), no location and no landmark (`400`), 4th SOS in an hour (`429`), success returns `id` and `tracking_token`; and `GET /api/sos/{id}` with a wrong token returns `404`
- [ ] T054 [P] [US3] Write Playwright test `tests/e2e/sos.spec.ts`: signed out, send a "Trapped by flood" SOS with 4 people and a phone; in a second browser context sign in as responder, assert it appears in `/respond` within 30 s marked "Visitor", set Acknowledged, and assert the sender's tracking view shows Acknowledged

### Implementation for User Story 3

- [ ] T055 [US3] Create `supabase/migrations/0301_sos.sql`: table `sos_requests` with data-model.md sos_requests.id, sos_requests.sender_id, sos_requests.sender_kind, sos_requests.contact_phone, sos_requests.type, sos_requests.location, sos_requests.location_accuracy_m, sos_requests.landmark, sos_requests.people_count, sos_requests.notes, sos_requests.state, sos_requests.assigned_to, sos_requests.tracking_token_hash, sos_requests.device_id, sos_requests.created_at, sos_requests.state_updated_at; check that location or landmark is present; indexes; RLS select for responder and admin only, no insert grant to `anon` or `authenticated`; add to the Realtime publication
- [ ] T056 [US3] Create `supabase/migrations/0302_sos_rpc.sql`: functions `sos_in_bbox`, `sos_list` and `set_sos_state` per contracts/database.md, enforcing the transitions in data-model.md "SOS state" and setting sos_requests.assigned_to on acknowledge
- [ ] T057 [US3] Extend `supabase/seed.sql` with 5 sample SOS requests in different data-model.md sos_requests.state values, both sender kinds
- [ ] T058 [P] [US3] Create `src/lib/validation/sos.ts`: zod schema for `POST /api/sos` per contracts/http-api.md, citing data-model.md sos_requests.type, sos_requests.location, sos_requests.landmark, sos_requests.people_count, sos_requests.notes, sos_requests.contact_phone
- [ ] T059 [US3] Create `src/app/api/sos/route.ts` per contracts/http-api.md "POST /api/sos": works with or without a session, `sos` rate limit 3 per hour per subject, sets sos_requests.sender_kind and sos_requests.sender_id, defaults contact phone from the profile, stores only the SHA-256 of a random 32-byte token in sos_requests.tracking_token_hash, returns the token once
- [ ] T060 [US3] Create `src/app/api/sos/[id]/route.ts` per contracts/http-api.md "GET /api/sos/{id}": compares the token hash in constant time, returns only id, type, state and state_updated_at, same `404` for unknown id and wrong token
- [ ] T061 [P] [US3] Create `src/components/sos/TypeChips.tsx`, `src/components/sos/PeopleStepper.tsx` and `src/components/sos/ConfirmSend.tsx` (explicit confirm dialog, FR-031) per handoff screen 4
- [ ] T062 [US3] Create `src/app/(public)/sos/page.tsx`: SOS screen per handoff screen 4 with live location card, manual pin or landmark fallback when location is denied, phone field for Visitors, the 911 note (FR-035); after send, stores `{id, tracking_token}` in local storage and shows a tracking view that polls `/api/sos/{id}` every 15 s
- [ ] T063 [US3] Create `src/app/respond/page.tsx`: responder-only page (redirect others) with SOS map (`sos_in_bbox`) and list (`sos_list`, newest first) showing sender kind, type, people, notes, phone, time; state buttons calling `set_sos_state`; in-app alert and sound on new rows from the `sos-changes` channel (FR-033)
- [ ] T064 [US3] Link the desktop "SOS Emergency" button and mobile SOS pill to `/sos`; show a "Respond" nav item only for responder and admin roles

**Checkpoint**: SOS works for Visitors and users; access tests pass for every role.

---

## Phase 6: User Story 4 - Verify incidents (Priority: P2)

**Goal**: citizens corroborate; moderators verify, resolve or reject with full history.

**Independent Test**: quickstart V8, V9 and V10.

### Tests for User Story 4 (constitution V: status change)

- [ ] T065 [P] [US4] Write Vitest database tests `tests/db/status-change.test.ts`: citizen calling `set_incident_status` gets `forbidden`; moderator `pending → verified` succeeds and writes one `incident_status_changes` row; `pending → resolved` gets `invalid_transition`; a stale `expected_status` gets `status_conflict` with the current status; rejected incidents disappear from `incidents_public`
- [ ] T066 [P] [US4] Write Vitest database tests `tests/db/corroboration.test.ts`: one corroboration per user, toggle off decrements, reporter gets `own_report`, Visitor gets `auth_required`
- [ ] T067 [P] [US4] Write Playwright test `tests/e2e/moderate.spec.ts`: moderator opens `/moderate`, marks the oldest Pending incident Verified then Resolved; assert the chip, progress bar and history on `/incidents/[id]`

### Implementation for User Story 4

- [ ] T068 [US4] Create `supabase/migrations/0401_verification.sql`: tables `corroborations` (data-model.md corroborations.incident_id, corroborations.user_id, corroborations.created_at, PK on both ids, trigger rejecting the reporter, trigger maintaining incidents.corroboration_count) and `incident_status_changes` (data-model.md incident_status_changes.id, incident_status_changes.incident_id, incident_status_changes.from_status, incident_status_changes.to_status, incident_status_changes.from_severity, incident_status_changes.to_severity, incident_status_changes.changed_by, incident_status_changes.note, incident_status_changes.changed_at); RLS per data-model.md "Access summary"
- [ ] T069 [US4] Create `supabase/migrations/0402_verification_rpc.sql`: functions `toggle_corroboration`, `set_incident_status` (allowed transitions per data-model.md "Incident status", optimistic `expected_status` check), `moderation_queue` and `incident_detail` per contracts/database.md
- [ ] T070 [US4] Extend `supabase/seed.sql` with corroborations (some incidents at 3 or more) and status history rows for the seeded verified, resolved and rejected incidents
- [ ] T071 [US4] Make the Corroborate button in `src/components/map/IncidentCard.tsx` and `src/components/map/BottomSheet.tsx` call `toggle_corroboration` with optimistic count update, "Corroborated" state, sign-in prompt for Visitors, and hidden for the reporter
- [ ] T072 [US4] Create `src/app/(public)/incidents/[id]/page.tsx`: full incident detail from `incident_detail` with photos, verification progress, corroborate button and status history with moderator names and Philippine Time
- [ ] T073 [P] [US4] Create `src/components/incidents/ModerationControls.tsx`: status and severity selectors limited to allowed transitions, optional note, handles `status_conflict` by showing the current value and asking to confirm again
- [ ] T074 [US4] Create `src/app/moderate/page.tsx`: moderator and admin only; queue from `moderation_queue` (oldest first, photos, corroboration counts) with ModerationControls per row; also render ModerationControls on `src/app/(public)/incidents/[id]/page.tsx` for those roles

**Checkpoint**: verification works with tests passing; map and list reflect status changes live.

---

## Phase 7: User Story 5 - Find emergency facilities (Priority: P2)

**Goal**: nearest facilities with type filter, operating status, staleness and directions; admin
management and CSV import.

**Independent Test**: quickstart V11 and V12.

- [ ] T075 [US5] Create `supabase/migrations/0501_facilities_rpc.sql`: functions `facilities_near` (true distance with `ST_DWithin` and `ST_Distance` on geography, `is_stale` from data-model.md facilities.status_updated_at) and `set_facility_status` (sets data-model.md facilities.status, facilities.status_updated_at, facilities.status_updated_by) per contracts/database.md
- [ ] T076 [P] [US5] Create `src/components/facilities/FacilityRow.tsx`: name, type icon, distance in km, status chip (Open, Full, Closed, Unknown), last-updated time, "may be outdated" label, call and Directions actions
- [ ] T077 [US5] Create `src/app/(public)/facilities/page.tsx`: asks for location (fallback: map center), lists `facilities_near` nearest first, type filter chips, shows the facility on the map on tap
- [ ] T078 [P] [US5] Create `src/lib/validation/facility.ts`: zod schema for a facility row citing data-model.md facilities.name, facilities.type, facilities.location, facilities.address, facilities.contact_phone, facilities.capacity, facilities.status
- [ ] T079 [US5] Create `src/app/api/facilities/import/route.ts` per contracts/http-api.md "POST /api/facilities/import": admin only, CSV up to 2 MB parsed with `papaparse`, validates each row with `src/lib/validation/facility.ts`, returns inserted, skipped and per-row errors
- [ ] T080 [US5] Create `src/app/admin/page.tsx`: admin only; facility list with add and edit forms and status buttons (`set_facility_status`, also allowed for moderators), CSV upload calling the import route, and a user role table calling `set_user_role`
- [ ] T081 [US5] Create `supabase/migrations/0502_admin_rpc.sql`: function `set_user_role` per contracts/database.md, admin only, updating data-model.md profiles.role

**Checkpoint**: facilities work alone on seeded data.

---

## Phase 8: User Story 6 - Browse and monitor incidents (Priority: P3)

**Goal**: searchable, filterable, paginated incident list.

**Independent Test**: quickstart V13.

- [ ] T082 [US6] Create `supabase/migrations/0601_list_rpc.sql`: function `list_incidents` per contracts/database.md (search on title, description and place; status, category and time filters; pagination with total)
- [ ] T083 [P] [US6] Create `src/components/incidents/IncidentTable.tsx` (desktop grid columns per handoff 1b) and `src/components/incidents/IncidentCardMobile.tsx` (handoff mobile screen 2)
- [ ] T084 [P] [US6] Create `src/components/incidents/ListToolbar.tsx`: search, status segments (All, Verified, Pending, Resolved), category and time-range dropdowns, "Sort: Newest"
- [ ] T085 [US6] Create `src/app/(public)/incidents/page.tsx`: filters kept in the URL query, pagination with "Showing X–Y of Z", rows open `/incidents/[id]`, "No incidents match" empty state with a clear-filters action, live refresh from `src/lib/realtime.ts`

**Checkpoint**: all six stories work independently.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T086 [P] Write `README.md`: what Bakunawa is, stack summary linking research.md, Docker-based setup, demo accounts, demo script following quickstart.md
- [ ] T087 Accessibility pass on all pages in `src/app/`: 4.5:1 text contrast, focus states, labels on icon buttons, keyboard access to the layer panel and dialogs
- [ ] T088 Performance pass: check SC-004 with Chrome slow 3G throttling on a 390 px viewport; lazy-load MapLibre in `src/components/map/MapView.tsx`; serve compressed photo thumbnails
- [ ] T089 Security review of `src/app/api/` and `supabase/migrations/`: service-role key only in server files, every RPC checks `app_role()`, no SOS data in any public response, secrets absent from git history
- [ ] T090 Deploy to Vercel with the Supabase environment variables; run `npm test` against the deployed preview where applicable
- [ ] T091 Run every scenario in `specs/001-disaster-response-platform/quickstart.md` (V1 to V14) and record pass or fail in `specs/001-disaster-response-platform/checklists/demo-validation.md`

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup. Blocks every story.
- **US1 to US6 (Phases 3 to 8)**: after Foundational.
- **Polish (Phase 9)**: after the stories you plan to demo.

### Story dependencies

| Story | Depends on | Notes |
|---|---|---|
| US1 Map (P1) | Foundational | MVP |
| US2 Report (P1) | Foundational, US1 for its e2e test | Route and unit tests run alone; the Playwright test checks the new pin on the US1 map |
| US3 SOS (P1) | Foundational | Fully independent; touches the layer panel only through the role check in T034 |
| US4 Verify (P2) | Foundational | Corroborate button edits US1 files T037 (do after T037) |
| US5 Facilities (P2) | Foundational | Map layer for facilities comes from US1 T030 |
| US6 List (P3) | Foundational | Detail page T072 comes from US4; rows can link there once it exists |

### Within each story

Tests first (they should fail), then migrations, then RPC, then route handlers, then
components, then the page.

## Parallel Opportunities

- Setup: T005 to T009 together after T004.
- Foundational: T018 to T022, T024 and T027 together once T010 to T017 are applied.
- After Foundational, US1, US2, US3 and US5 can run in parallel by different people; they touch
  different migrations, routes and pages.

### Parallel example: User Story 3

```text
Task: "T052 SOS access database tests in tests/db/sos-access.test.ts"
Task: "T053 SOS route tests in tests/unit/sos-route.test.ts"
Task: "T054 SOS Playwright test in tests/e2e/sos.spec.ts"
Task: "T058 SOS zod schema in src/lib/validation/sos.ts"
Task: "T061 SOS components in src/components/sos/"
```

### Parallel example: User Story 1

```text
Task: "T031 basemap style in src/components/map/style.ts"
Task: "T033 Pin in src/components/map/Pin.tsx"
Task: "T034 LayerPanel in src/components/map/LayerPanel.tsx"
Task: "T035 FilterBar in src/components/map/FilterBar.tsx"
Task: "T037 IncidentCard and BottomSheet"
Task: "T038 SummaryPanel"
```

## Implementation Strategy

### MVP first

1. Phase 1 Setup, Phase 2 Foundational.
2. Phase 3 US1: the map with seeded data. Stop and validate with quickstart V1 and V2. This is
   already a demo.

### Demo build order (hackathon)

1. US1 Map, then US3 SOS (life-safety story, strongest demo moment), then US2 Report.
2. US4 Verify, then US5 Facilities.
3. US6 List, then Polish.

Each step leaves `main` runnable (constitution workflow rule).

### Team split after Foundational

- Developer A: US1, then US6
- Developer B: US3, then US4
- Developer C: US2, then US5

## Notes

- Commit after each task or logical group.
- Stop at any checkpoint to validate a story on its own.
- Keep the service-role key in server-only files (`src/lib/supabase/service.ts`, `src/app/api/`).
