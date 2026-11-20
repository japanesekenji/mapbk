# Implementation Plan: Bakunawa Disaster Response Platform (MVP)

**Branch**: `001-disaster-response-platform` | **Date**: 2026-11-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-disaster-response-platform/spec.md`

## Summary

Bakunawa is a mobile-first web app where residents view hazards and facilities on a map, report
incidents with GPS and photos, corroborate reports, and send SOS requests; moderators verify
incidents and responders handle SOS. The demo architecture is a single Next.js (TypeScript) app
deployed on Vercel, backed by a hosted Supabase project: Postgres with PostGIS for true-distance
geo queries, Supabase Auth for accounts, Storage for photos, and Realtime for live status and SOS
alerts. Access control is enforced in the database with Row Level Security; a few Next.js route
handlers cover server-only work (visitor SOS, rate limits, geocoding proxy, CSV import). Decisions
and alternatives are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict) on Node.js 22 LTS; SQL (PostgreSQL 15+ with PostGIS 3)

**Primary Dependencies**: Next.js (App Router, 15 or newer), React, Tailwind CSS, MapLibre GL JS,
`@supabase/supabase-js` and `@supabase/ssr`, `zod` (input validation), `browser-image-compression`,
`papaparse` (facility CSV import)

**Storage**: Supabase Postgres + PostGIS (`geography` columns, GiST indexes); Supabase Storage
bucket `incident-photos`

**Testing**: Vitest (unit and RLS policy tests against the dev Supabase project), Playwright
(critical-path browser tests); `npm test` runs both

**Target Platform**: Mobile and desktop browsers (last 2 versions of Chrome, Safari, Firefox,
Edge; Android Chrome first); hosted on Vercel + Supabase

**Project Type**: Web application (single full-stack Next.js project)

**Performance Goals**: map markers for the visible area in under 3 s on slow 3G (SC-004); new SOS
visible to responders within 30 s (SC-003); status changes visible within 1 min (SC-007)

**Constraints**: 360 px minimum width; report and SOS flows at most 3 screens; photos compressed
client-side, max 10 MB raw; HTTPS outside local dev; SOS never exposed to non-responders;
local Node tooling runs in Docker because Windows Application Control on the dev PC blocks
unsigned native binaries (research R13)

**Scale/Scope**: demo scale: hundreds of incidents, about 25 facilities, 5 roles, under 100
concurrent users; 7 screens (map, incident list, incident detail, report, SOS, facilities,
profile/settings) plus moderator queue and responder SOS view

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|---|---|---|---|
| I. Transparent Verification Status | One status per incident; Pending default; only moderators change it; corroborations separate; history logged | Pass | Pass: `incident_status` enum, `set_incident_status` RPC (moderator/admin only) writes `incident_status_changes`; `corroborations` table with unique (incident, user) ([data-model.md](./data-model.md)) |
| II. Privacy and Restricted SOS | SOS visible only to Responder/Admin; reporter identity hidden by default; server-side checks | Pass | Pass: RLS on `sos_requests` (responder/admin select; no anon insert); `incidents_public` view omits reporter unless `show_name`; Realtime honors RLS ([contracts/database.md](./contracts/database.md)) |
| III. Mobile-First, Low-Bandwidth | 360 px; report/SOS in 3 screens or fewer; compressed photos; viewport loading | Pass | Pass: `incidents_in_bbox` RPC, client compression, bottom-tab mobile layout from handoff |
| IV. Minimal MVP Scope | Six features only; fixed schema; true distance; managed services | Pass | Pass: fixed tables, PostGIS `geography` + `ST_DWithin`; Supabase + Vercel managed |
| V. Tested Critical Paths | Tests for report, SOS, status change, SOS access; one command | Pass | Pass: test files listed below; `npm test` |
| Security and Data | HTTPS, no committed secrets, rate limits, validation, 10 MB images, WGS84, UTC stored / PHT shown, facility status + time | Pass | Pass: `rate_limit_events`, zod schemas, storage MIME/size rules, `timestamptz`, `facilities.status_updated_at` |
| Workflow | Spec Kit flow, demo-ready main, seed data per role | Pass | Pass: `supabase/seed.sql`, quickstart |

No violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-disaster-response-platform/
├── plan.md              # This file
├── research.md          # Phase 0: stack and architecture decisions
├── data-model.md        # Phase 1: tables, enums, state machines, RLS summary
├── quickstart.md        # Phase 1: setup and validation scenarios
├── contracts/
│   ├── http-api.md      # Next.js route handlers
│   └── database.md      # Supabase RPC functions, views, RLS and Realtime channels
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
bakunawa/
├── docker-compose.yml          # app (Node 22 dev server) and e2e (Playwright) containers
├── Dockerfile.dev
├── .env.example                # Supabase URL, anon key, service-role key, DB URL
├── package.json
├── next.config.ts
├── supabase/
│   ├── migrations/             # schema, PostGIS, enums, RLS, RPC functions, storage policies
│   └── seed.sql                # categories, incidents, facilities, SOS samples, role accounts
├── public/
│   └── brand/                  # bakunawa-mark.png, bakunawa-logo-full.png (from design handoff)
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                 # Map (desktop 1a / mobile map)
│   │   │   ├── incidents/page.tsx       # Incident list (1b / mobile list)
│   │   │   ├── incidents/[id]/page.tsx  # Incident detail + history
│   │   │   ├── facilities/page.tsx      # Nearest facilities
│   │   │   ├── report/page.tsx          # Report a hazard
│   │   │   ├── sos/page.tsx             # SOS request + tracking
│   │   │   └── profile/page.tsx         # Sign in, role, name visibility
│   │   ├── moderate/page.tsx            # Moderator queue
│   │   ├── respond/page.tsx             # Responder SOS map + list
│   │   ├── admin/page.tsx               # Roles, facilities, CSV import
│   │   └── api/
│   │       ├── sos/route.ts             # POST create (visitor or user)
│   │       ├── sos/[id]/route.ts        # GET state by tracking token
│   │       ├── reports/route.ts         # POST create incident (rate-limited)
│   │       ├── uploads/route.ts         # POST signed photo upload URL
│   │       ├── geocode/route.ts         # GET place search proxy
│   │       └── facilities/import/route.ts # POST CSV import (admin)
│   ├── components/
│   │   ├── map/          # MapView, layer panel, pins, clusters, detail card, bottom sheet
│   │   ├── incidents/    # list table, cards, status chip, verification bar, filters
│   │   ├── report/       # category grid, location picker, photo picker
│   │   ├── sos/          # type chips, people stepper, confirm dialog
│   │   ├── layout/       # desktop header, mobile tab bar
│   │   └── icons/        # Icon.tsx from design handoff
│   ├── lib/
│   │   ├── supabase/     # browser, server and service-role clients
│   │   ├── validation/   # zod schemas shared by forms and route handlers
│   │   ├── rate-limit.ts
│   │   ├── geo.ts        # PH service-area check, bbox helpers, directions URL
│   │   └── time.ts       # UTC to Philippine Time formatting
│   └── styles/
│       └── tokens.css    # design tokens from handoff
└── tests/
    ├── unit/             # validation, geo, time, rate-limit
    ├── db/               # RLS and RPC tests per role (sos-access, status-change)
    └── e2e/              # report.spec.ts, sos.spec.ts, moderate.spec.ts, sos-access.spec.ts
```

**Structure Decision**: a single Next.js project at `bakunawa/` with database code in
`bakunawa/supabase/`. A separate backend is not needed because Supabase provides the data, auth,
storage and realtime services, and route handlers cover server-only logic.

## Architecture

```text
Browser (phone / desktop)
  │  Next.js pages + MapLibre
  │
  ├──► Supabase (anon or user session)
  │      • RPC: incidents_in_bbox, facilities_near, incident_detail, toggle_corroboration,
  │             set_incident_status, set_sos_state, set_facility_status, set_user_role
  │      • Realtime: incidents, sos_requests (RLS-filtered)
  │      • Storage: incident-photos (signed upload, public read of approved photos)
  │
  └──► Next.js route handlers (Vercel, service-role key on server only)
         • /api/reports, /api/sos, /api/sos/[id], /api/uploads  → validate, rate-limit, insert
         • /api/geocode → Nominatim (PH only, cached)
         • /api/facilities/import → CSV to facilities (admin)
```

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Windows Application Control blocks Node native binaries on the dev PC | Dev server and tests will not start on the host | Run tooling in Docker (research R13); verify in the first setup task |
| Supabase free project pauses when idle | Demo shows empty data | Open the dashboard before the demo; keep seed script re-runnable |
| Nominatim rate limit or outage | Place search fails | Cache, debounce, and fall back to panning the map manually |
| GPS unavailable indoors | Report/SOS location missing | Manual pin and landmark text (FR-030, US3 scenario 7) |

## Complexity Tracking

No constitution violations to justify.
