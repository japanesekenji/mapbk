# Demo Validation: Quickstart Scenarios V1 to V14

**Feature**: [spec.md](../spec.md) | **Guide**: [quickstart.md](../quickstart.md)
**Run on**: 2026-11-21, local Supabase (Postgres 17) + Next.js 16.4.6 dev server in Docker,
headless Chromium 1.65.1. Each scenario lists the automated test or manual check that covers it.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| V1 | Map: layers, time range, marker detail, SOS layer locked for visitors | Pass | Headless screenshots of `/` at 1440x900 with and without `?select=` (layer counts, severity summary, detail card with progress bar). `tests/db/sos-access.test.ts` proves no SOS rows for visitors. Layer toggle and time range were checked visually, not by an automated test. |
| V2 | Mobile map at 390 px: tab bar, chips, SOS pill, bottom sheet | Pass | Headless screenshot of `/` at 390x844 with a selected incident. |
| V3 | Citizen report with GPS and 2 photos shows as Pending; 5th photo refused | Pass | `tests/e2e/report.spec.ts` "citizen submits a flood report with photos" |
| V4 | 11th report in an hour is rate limited | Pass | `tests/api/reports.test.ts` "allows 10 reports per hour and refuses the 11th" |
| V5 | Visitor SOS without an account | Pass | `tests/e2e/sos.spec.ts`, `tests/api/sos.test.ts` (Visitor block) |
| V6 | Responder sees the SOS within 30 s marked Visitor; acknowledges; sender sees it | Pass | `tests/e2e/sos.spec.ts` (asserts under 30 s and the "Visitor" label) |
| V7 | No SOS data for visitor, citizen or moderator by any path | Pass | `tests/db/sos-access.test.ts` (17 tests: table, view, RPCs, direct insert) |
| V8 | Corroboration by two citizens; reporter refused | Pass | `tests/db/corroboration.test.ts`, `tests/e2e/moderate.spec.ts` "a second citizen corroborates; the reporter cannot" |
| V9 | Moderator verifies then resolves; history; stale tab gets conflict message | Pass | `tests/e2e/moderate.spec.ts` "moderator verifies then resolves a report"; `tests/db/status-change.test.ts` "reports status_conflict". The conflict message in the UI was not exercised in a browser test. |
| V10 | Rejected incident leaves public views, stays for moderators | Pass | `tests/db/status-change.test.ts` "removes rejected incidents from public views" |
| V11 | Facilities nearest first with km, status, update time, staleness | Pass | `tests/api/facilities.test.ts` (`facilities_near` ordering and `is_stale`); headless screenshot of `/facilities` at 390x844 |
| V12 | Admin sets a facility to Full; CSV import reports inserted and skipped rows | Pass | `tests/api/facilities.test.ts` ("lets moderators update status", "imports valid rows and reports skipped ones") |
| V13 | Incident list filters, pagination, empty state | Pass, partly manual | Headless screenshots of `/incidents?range=7d` (desktop) and `/incidents?q=zzzz` (mobile empty state with Clear filters). No automated test for pagination. |
| V14 | Report outside the Philippines refused | Pass | `tests/api/reports.test.ts` "rejects a location outside the Philippines"; `tests/unit/lib.test.ts` |

## Constitution critical paths (Principle V)

All four have automated tests and pass with `npm test` in the app container:
report submission (V3, V4), SOS send (V5, V6), status change (V9, V10), SOS access by role (V7).

Full run on 2026-11-21: unit 10, database 33, API 23, Playwright 19 passed (5 skipped by
design: tests pinned to one viewport skip on the other).

## Success criteria not met or not measured

- **SC-004 (pins in 3 s on slow 3G): not met.** Measured with `scripts/perf.mjs` against a
  production build, 390 px viewport, 4x CPU throttling, 3 runs each: Chrome "Slow 3G" 24.5 s,
  "Fast 3G" 9.2 s, 4G 3.7 s. About 850 KB of the app's own JavaScript is transferred, most of it
  MapLibre GL; 3 s at 400 kbps allows roughly 150 KB. Options are in the README.
- **SC-001, SC-002, SC-008 (user timing and comprehension)**: need test users; not measured.
- **Deploy (T090)**: not done; needs the team's Vercel and hosted Supabase accounts.
