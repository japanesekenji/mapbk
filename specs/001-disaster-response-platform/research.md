# Research: Bakunawa Disaster Response Platform (MVP)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-21

Goal set by the user: pick the best architecture and stack for a hackathon demo. The criteria
used for every decision below: fewest moving parts to a working demo, free tiers, server-side
access control (constitution II), true geographic distance (constitution IV), and the UI design
handoff's own recommendation (`Ui Reference/.../design_handoff_bakunawa_web_app/README.md`).

## R1. Overall architecture

- **Decision**: One Next.js web app (frontend plus server route handlers) on top of a hosted
  Supabase project (Postgres with PostGIS, Auth, Storage, Realtime). No separate backend service.
- **Rationale**: Supabase supplies the four backend pieces the spec needs (spatial database,
  accounts, photo storage, live updates) as managed services, so the team writes only the app and
  the SQL. Access rules live in the database as Row Level Security (RLS), so they hold for every
  read path, including live updates. Next.js route handlers cover the few operations that need
  server-only secrets (visitor SOS, rate limits, CSV import, geocoding proxy). The design handoff
  recommends this same combination.
- **Alternatives considered**:
  - Run Ushahidi as the backend: rejected earlier (PHP 7.4 / Laravel 8 end of life, AGPL, and the
    gaps in corroboration, SOS and radius search).
  - Django + GeoDjango + React SPA: strong admin panel, but two codebases and self-built realtime
    and storage.
  - Next.js + self-hosted PostGIS + Auth.js + S3: no vendor account, but auth, storage, realtime
    and RLS-equivalent checks would all be hand-built.

## R2. Language and frontend framework

- **Decision**: TypeScript (strict), Next.js App Router (version 15 or newer, current stable at
  setup), React, Tailwind CSS with the handoff's design tokens as CSS variables.
- **Rationale**: one language end to end, server components for fast first load on slow 3G
  (constitution III), route handlers for server-only logic, first-class Vercel deploy. Tailwind
  maps directly to the handoff's token list.
- **Alternatives considered**: Vite + React SPA (no server layer, so visitor SOS and rate limiting
  would need separate edge functions); SvelteKit (smaller bundles, but the handoff ships a React
  `Icon.tsx` component).

## R3. Map rendering

- **Decision**: MapLibre GL JS with OpenFreeMap vector tiles (no API key), custom style colored to
  the handoff palette (land `#eef2ea`, water `#cde2e6`, parks `#dbe9d5`, roads white). Markers
  render as HTML markers for the selected item and a clustered GeoJSON source for the rest.
- **Rationale**: free, keyless, vector tiles restyle to the design; built-in GeoJSON clustering
  covers FR-013; polygons for affected areas (FR-014) are a native layer type.
- **Alternatives considered**: Leaflet (raster tiles, harder to restyle); Mapbox GL (needs a paid
  token beyond the free tier); Google Maps (key and billing account).

## R4. Geospatial queries

- **Decision**: store locations as PostGIS `geography(Point, 4326)` (and `geography(Polygon)` for
  affected areas). Viewport loads use `ST_Intersects` with `ST_MakeEnvelope`; "near me" uses
  `ST_DWithin` and orders by `ST_Distance` (KNN `<->` index ordering). Exposed as Postgres RPC
  functions.
- **Rationale**: geography type measures true distance in meters on the earth's surface, which
  fixes the Ushahidi bounding-box approximation (constitution IV, FR-038). GiST indexes keep
  viewport queries fast.
- **Alternatives considered**: client-side Haversine on all facilities (fine for 200 rows, but not
  for incidents); geometry type in a projected CRS (needs a projection choice for the whole
  archipelago).

## R5. Authentication and roles

- **Decision**: Supabase Auth with email and password. A `profiles` table holds `role`
  (`citizen`, `moderator`, `responder`, `admin`) and `show_name`. A `security definer` SQL
  function `app_role()` reads the caller's role for RLS policies. Visitors use the anonymous
  (not signed in) key.
- **Rationale**: free, no SMS cost, and RLS policies can call `app_role()` directly. Admins
  assign roles by updating `profiles.role` through an admin-only RPC (FR-005).
- **Alternatives considered**: phone OTP sign-in (matches Filipino phone-first use, but SMS costs
  money and needs a provider); custom JWT claims via auth hook (faster checks, more setup).

## R6. Visitor SOS without an account (spec Q1 = A)

- **Decision**: visitors send SOS through a Next.js route handler (`POST /api/sos`) that validates
  input, applies the rate limit, and inserts with the service-role key. The response returns a
  random `tracking_token`; the browser keeps it in local storage and polls
  `GET /api/sos/{id}?token=` to show the response state. Signed-in users use the same endpoint;
  the handler attaches their user id.
- **Rationale**: the anonymous key never gets insert rights on `sos_requests`, so all SOS writes
  pass rate limiting and validation. The token lets a visitor follow their own request without an
  account and without exposing anyone else's.
- **Alternatives considered**: Supabase anonymous sign-ins (creates throwaway users and extra
  RLS cases); direct anon insert with RLS (no way to rate-limit per device in pure RLS).

## R7. Rate limiting

- **Decision**: a `rate_limit_events` table keyed by `(subject, action, created_at)`, where subject
  is the user id, else a device id cookie plus hashed IP. Route handlers count events in the last
  hour before inserting. Limits: 10 reports per hour, 3 SOS per hour per subject.
- **Rationale**: no extra service (Redis) for a demo; counts are exact and auditable.
- **Alternatives considered**: Upstash Redis ratelimit (another account); Vercel firewall rules
  (paid tier for custom rules).

## R8. Photo upload and compression

- **Decision**: compress in the browser (longest edge 1600 px, JPEG or WebP, target under 600 KB)
  with `browser-image-compression`, then upload to a Supabase Storage bucket `incident-photos`
  through a signed upload URL. The server rejects non-image types and files over 10 MB.
- **Rationale**: compressing before upload is what makes 4 photos practical on slow 3G
  (constitution III, FR-017).
- **Alternatives considered**: server-side resize (uploads full-size files first; worse on slow
  networks).

## R9. Live updates

- **Decision**: Supabase Realtime `postgres_changes` subscriptions on `incidents` (inserts and
  status updates) for everyone, and on `sos_requests` for responders. Realtime applies RLS, so
  non-responders never receive SOS rows. A 60-second refetch is the fallback if the socket drops.
- **Rationale**: meets SC-003 (SOS to responders within 30 s) and SC-007 (updates within 1 min)
  without custom websockets.
- **Alternatives considered**: polling only (simpler, but 30 s SOS latency needs aggressive
  polling); push notifications (out of scope per spec).

## R10. Place search

- **Decision**: a server route `GET /api/geocode?q=` that forwards to OpenStreetMap Nominatim with
  `countrycodes=ph`, a generic app User-Agent, 1 request per second, and a 24-hour cache. The
  client debounces input by 400 ms.
- **Rationale**: free and covers barangay names; the proxy keeps the app within Nominatim's usage
  policy.
- **Alternatives considered**: MapTiler geocoding (API key, free tier limits); a seeded PSGC
  barangay table (accurate names but needs centroid data and import work).

## R11. Directions

- **Decision**: open `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in a new tab.
- **Rationale**: spec assumption says directions hand off to an external service; Google Maps is
  installed on most Filipino phones and the URL needs no key.

## R12. Testing

- **Decision**: Vitest for unit and database-policy tests (run against the dev Supabase project
  with test accounts per role), Playwright for the four constitution critical paths in a browser.
  `npm test` runs both.
- **Rationale**: constitution V requires automated tests for report submit, SOS send, status
  change and SOS role access, runnable with one command. Policy tests call the database with each
  role's session, which proves server-side enforcement.
- **Alternatives considered**: pgTAP (SQL-only tests, separate runner); Cypress (heavier on CI).

## R13. Local development on this Windows machine

- **Finding**: on this PC, Windows Application Control blocked unsigned binaries twice during
  setup: the `specify.exe` launcher and the `pydantic_core` DLL (os error 4551, seen 2026-11-21).
  Next.js (SWC), Tailwind (oxide, lightningcss), Vitest/Vite (esbuild, rollup) and Playwright all
  load unsigned native binaries from npm, so they are likely to be blocked too. Not yet tested.
- **Decision**: run all Node tooling inside Docker (Docker Desktop is installed and runs). A
  `docker-compose.yml` defines `app` (Node 22 dev server on port 3000, source mounted) and `e2e`
  (official Playwright image). The database stays on hosted Supabase, so no Supabase CLI runs on
  the host. If a teammate's machine has no such policy, plain `npm run dev` also works.
- **Rationale**: Linux binaries inside the container are not subject to the Windows policy, and
  every teammate gets the same environment.
- **Alternatives considered**: ask for the policy to be relaxed (the user's call, not the
  project's); WASM fallbacks (`@next/swc-wasm-nodejs`, `@rollup/wasm-node`), which are slower and
  do not cover Tailwind's oxide engine.

## R14. Hosting for the demo

- **Decision**: Vercel (Hobby) for the Next.js app, Supabase (Free) for data. Both have free
  tiers and HTTPS by default (constitution security requirement).
- **Rationale**: push-to-deploy with preview URLs; no servers to manage.
- **Alternatives considered**: Netlify (comparable); a single VPS with Docker (more setup, manual
  HTTPS).
- **Note**: the Supabase free tier pauses a project after a period of inactivity. Open the project
  dashboard before a demo.

## R15. Seed data

- **Decision**: a SQL seed file creates the category taxonomy, about 40 incidents across all
  categories and statuses in Metro Manila, about 25 facilities of every type, sample SOS requests,
  and one account per role. Demo account emails and test passwords live in the seed file and the
  project README, never in chat or in committed real-secret files.
- **Rationale**: constitution workflow rule and FR-047.
