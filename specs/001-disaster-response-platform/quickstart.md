# Quickstart: Bakunawa Disaster Response Platform (MVP)

How to run the app and prove each user story works. Stack and reasons: [research.md](./research.md).
Interfaces: [contracts/http-api.md](./contracts/http-api.md),
[contracts/database.md](./contracts/database.md). Schema: [data-model.md](./data-model.md).

## Prerequisites

- Docker Desktop running (all Node tooling runs in containers; see research R13).
- A free Supabase project with the PostGIS extension enabled (Database > Extensions). The team
  creates this account; keep its keys out of git.
- Optional for deploy: a Vercel account linked to the repository.

## Setup

1. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` from the
   Supabase project settings. `db:push` reads `SUPABASE_DB_URL` from this file.
2. Install dependencies inside the container:

   ```powershell
   docker compose run --rm app npm install
   ```

3. Apply migrations and seed data to the Supabase project:

   ```powershell
   docker compose run --rm app npm run db:push
   ```

   ```powershell
   docker compose run --rm app npm run db:seed
   ```

4. Start the dev server:

   ```powershell
   docker compose up app
   ```

   Open http://localhost:3000. Demo accounts (one per role) are listed in the project README.

## Run tests

```powershell
docker compose run --rm app npm test
```

Runs Vitest (unit and database policy tests) and then Playwright in the `e2e` container. All four
constitution critical paths must pass: report submit, SOS send, status change, SOS access by role.

## Validation scenarios

Run these against seeded data. Each maps to a user story in [spec.md](./spec.md).

| # | Story | Steps | Expected |
|---|---|---|---|
| V1 | US1 Map | Open `/` as a Visitor. Uncheck "Flood". Switch time range to 7 days. Click a marker. | Flood pins hide; counts stay; older incidents appear; detail card shows status chip, progress bar, corroboration count, Directions. SOS layer shows a lock and no SOS pins. |
| V2 | US1 Map | At 390 px width, open `/`. | Bottom tab bar, layer chips, SOS pill, bottom sheet replace the desktop header and panels. |
| V3 | US2 Report | Sign in as the citizen account. Report > Flood > keep GPS pin > description > 2 photos > Submit. | Report appears on map and list as Pending within 1 min, with both photos. A 5th photo is refused. |
| V4 | US2 Report | Submit 11 reports within an hour (script or repeated form). | 11th returns "rate limited" with a retry time. |
| V5 | US3 SOS | Sign out. Open `/sos`, choose "Trapped by flood", people 4, phone, Send, confirm. | Confirmation with time received; tracking shows state New. |
| V6 | US3 SOS | Sign in as responder in another browser. Open `/respond`. | The V5 SOS appears within 30 s, marked "Visitor". Set Acknowledged; V5's tracking shows Acknowledged. |
| V7 | US3 SOS access | As Visitor, citizen and moderator, open map, list and call `sos_list` / `sos_in_bbox` from the browser console. | No SOS rows or counts; RPCs return `forbidden`. |
| V8 | US4 Verify | As two different citizens, Corroborate the V3 incident. Try with the reporter's own account. | Count rises to 2; own report is refused. |
| V9 | US4 Verify | As moderator, open `/moderate`, mark V3 Verified, then Resolved. Repeat the first change in a second tab without reloading. | Chip and progress bar update everywhere; history lists both changes with moderator and time; the stale tab gets a "status already changed" message. |
| V10 | US4 Verify | As moderator, mark an incident Rejected. | It disappears from public map and list; still visible in moderator views. |
| V11 | US5 Facilities | Open `/facilities`, allow location (or set a Pasig location in browser dev tools). Filter "Evacuation centers". | Nearest first with km distance, status and update time; stale statuses labeled "may be outdated". |
| V12 | US5 Facilities | As admin, set a facility to Full; import a 3-row CSV. | Status and time update; import reports inserted and skipped rows. |
| V13 | US6 List | Open `/incidents`. Filter Pending, then add a category and 24 hours. Page forward. Search a nonsense word. | Totals and "Showing X–Y of Z" match; empty search shows "No incidents match" with a clear action. |
| V14 | Edge | Report at lat 10, lng 110 (South China Sea). | Refused as outside the Philippine service area. |

## Deploy (demo)

1. Push the repository and import it in Vercel; set the three `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` variables.
2. Open the Supabase dashboard shortly before the demo (free projects pause when idle), then rerun
   `npm run db:seed` if the data was reset.
