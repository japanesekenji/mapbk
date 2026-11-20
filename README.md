# Bakunawa

Community-powered disaster intelligence and emergency response for Filipino communities.
Residents view hazards and emergency facilities on a map, report incidents with GPS and photos,
corroborate reports, and send SOS requests. Moderators verify incidents; responders handle SOS.

Specs, plan and task list: [`specs/001-disaster-response-platform/`](specs/001-disaster-response-platform/).

## Features

| Feature | Where | Who |
|---|---|---|
| Hazard map with layers, time range, place search, live updates | `/` | Everyone |
| Report a hazard with GPS, adjustable pin and up to 4 photos | `/report` | Signed-in users |
| Corroborate reports; moderators verify, resolve or reject with history | `/incidents/[id]`, `/moderate` | Users / moderators |
| Emergency SOS without an account, with tracking | `/sos` | Everyone |
| SOS console with live alerts and response states | `/respond` | Responders, admins |
| Nearest facilities by true distance, operating status | `/facilities` | Everyone |
| Facility status, CSV import, role assignment | `/admin` | Moderators (status), admins |
| Incident list with search, filters, pagination | `/incidents` | Everyone |

## Stack

Next.js 16 (App Router, TypeScript, Tailwind CSS 4), MapLibre GL with OpenFreeMap tiles, and
Supabase (Postgres + PostGIS, Auth, Storage, Realtime). Decisions and alternatives:
[research.md](specs/001-disaster-response-platform/research.md).

## Local development

All Node tooling runs in Docker. On the original dev PC, Windows Application Control blocks
unsigned native binaries (the Spec Kit launcher and a Python DLL were blocked on 2026-11-21), and
Next.js, Tailwind, Vitest and Playwright all ship such binaries. Inside the container they run as
Linux binaries: `docker compose run --rm app node -e "console.log(process.platform)"` prints
`linux` (checked 2026-11-21, task T002).

Prerequisite: Docker Desktop running.

1. Build the image and install dependencies:

   ```powershell
   docker compose build app
   ```

   ```powershell
   docker compose run --rm app npm install
   ```

2. Start local Supabase (first run pulls images, a few minutes):

   ```powershell
   docker run --rm --network host -v "${PWD}:/app" -v bakunawa_node_modules:/app/node_modules -v /var/run/docker.sock:/var/run/docker.sock -w /app bakunawa-app npx supabase start
   ```

   The Supabase CLI checks the database on `127.0.0.1`, so `supabase start` needs the host network.
   Other CLI commands work from the normal container.

3. Copy `.env.example` to `.env.local` and paste the values from:

   ```powershell
   docker compose run --rm app npm run sb:status
   ```

4. Apply migrations and demo data:

   ```powershell
   docker compose run --rm app npm run db:reset
   ```

5. Start the app and open http://localhost:3000:

   ```powershell
   docker compose up app
   ```

`docker/dev-entrypoint.sh` relays `localhost:54321` and `localhost:54322` inside the container to
the host, so the browser, server code, tests and CLI all use the same Supabase URL.

### Hosted Supabase

Put the hosted project's URL, anon key, service-role key and database URL in `.env.local`, then
run `npm run db:push` and `npm run db:seed` in the container.

## Demo accounts

Test accounts created by `supabase/seed.sql` for local and demo projects only:

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@bakunawa.test` | `Bakunawa-demo-2026` |
| Citizen (second) | `citizen2@bakunawa.test` | `Bakunawa-demo-2026` |
| Moderator | `moderator@bakunawa.test` | `Bakunawa-demo-2026` |
| Responder | `responder@bakunawa.test` | `Bakunawa-demo-2026` |
| Admin | `admin@bakunawa.test` | `Bakunawa-demo-2026` |

Change or remove these before using a public deployment for anything real.

## Tests

`docker compose exec app npm test` runs, in order:

| Suite | What it covers |
|---|---|
| `test:unit` | Geo, time and validation helpers |
| `test:db` | RLS and RPC rules per role: SOS access, status changes, corroboration, privileges |
| `test:api` | Route handlers over HTTP: reports, uploads, SOS, facilities import (needs the dev server) |
| `test:e2e` | Playwright: report, SOS, moderation, accessibility (axe) on desktop and phone viewports |

Database and API tests change seed data; run `npm run db:reset` for a clean demo afterwards.
Scenario-by-scenario results: [demo-validation.md](specs/001-disaster-response-platform/checklists/demo-validation.md).

## Known limitations

- **Slow networks.** Map pins take about 24 s to appear on Chrome's "Slow 3G" profile (9 s on
  "Fast 3G", 3.7 s on 4G) because MapLibre GL is large. The spec's 3-second target (SC-004) is
  not met. Ways to close the gap: a server-rendered list of nearby incidents shown before the map,
  a lighter raster map for slow connections, or caching the app with a service worker.
- **Place search** uses the public Nominatim service (1 request per second). Use a paid geocoder
  for real traffic.
- **Not deployed yet.** Deploying needs a hosted Supabase project and a Vercel account.

## Scripts (run inside the container)

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run typecheck` | Route type generation + `tsc` |
| `npm run lint` | ESLint |
| `npm run db:reset` | Recreate local database from migrations and seed |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `npm run db:push` / `db:seed` | Apply migrations / seed to the database in `SUPABASE_DB_URL` |
| `npm test` | Unit, database, API and Playwright tests |
| `node scripts/perf.mjs <url> <runs> <profile>` | Time to map pins under network throttling |
| `node scripts/shot.mjs <path> <out.png> <w> <h> [email]` | Headless screenshot, optionally signed in |
