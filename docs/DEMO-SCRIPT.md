# Bakunawa Manual Demo Script

A 5-minute live demo of the flow Report, Validate, Inform, Assist, Monitor on the deployed app
(https://mapbk-tqc79.vercel.app). A 2-minute cut is at the end.

## 1. Setup (the day before and 15 minutes before)

### The day before

- [ ] **Refresh the demo data.** Incident times are relative to when the seed ran, and the map shows
      the last 24 hours, so pins disappear about a day after seeding. Run `scripts/hosted-reseed.sh`
      (section 6); it also restores the private demo password, which the seed resets.
- [ ] **Open the Supabase dashboard** so the free project does not pause during the demo.
- [ ] **Rehearse once end to end.** Then clear rehearsal rate limits (section 6), because SOS allows
      3 per hour per device and reports allow 10 per hour per account.

### 15 minutes before

Open three browser windows side by side (use separate browser profiles or one normal plus one
incognito so the sessions do not mix):

| Window | Who | Signed in as | Start on |
|---|---|---|---|
| A (main, projected) | Resident | Not signed in, later `citizen@bakunawa.test` | `/` (map) |
| B | Responder | `responder@bakunawa.test` | `/respond` |
| C | Moderator | `moderator@bakunawa.test` | `/moderate` |
| Phone (optional) | Resident in danger | Not signed in | `/sos` |

- [ ] The demo password is the `HOSTED_DEMO_PASSWORD` value in `.env.hosted` (not in the README).
- [ ] Allow location access in window A and on the phone when the browser asks.
- [ ] If the venue is far from Metro Manila, the seeded incidents will be off screen after
      "locate me". Stay on the default Metro Manila view, and use **Adjust pin** in the report form
      to place pins near the seeded data.
- [ ] Zoom the browser to 110 to 125% so the audience can read it.

## 2. The story in one line

"During a typhoon, people need to know what is happening near them, whether it is confirmed, where
to go, and how to call for help. Bakunawa puts all four on one map."

## 3. Five-minute demo

| Time | Window | Do | Say |
|---|---|---|---|
| 0:00 | A | Show the map. Point at clustered pins, the outlined Marikina flood area, the severity panel and **Live · just now**. | "This is Metro Manila right now: community reports, affected areas and emergency facilities, updated live." |
| 0:30 | A | Uncheck **Flood** in Map layers, then check it again. Switch the time range from **24 hours** to **7 days**. | "Residents filter by hazard and time. The map only loads what is on screen, so it works on slow phones." |
| 0:50 | A | Click a red pin, for example **Flooding in Brgy. Tatalon**. Point at the **Verified** chip and the 4-step bar. | "Every report shows its verification status. Pending reports are clearly marked unverified, so nobody acts on a rumor." |
| 1:10 | A | **Settings**, sign in as the citizen. Click **Report Hazard**. Choose **Flood**, wait for **GPS locked**, type a short description, add a photo, **Submit report**. | "Reporting takes three fields and a photo. GPS fills the location; the pin can be adjusted." |
| 1:50 | A | The map opens on the new report: point at **Pending**. | "New reports start as Pending until a moderator checks them." |
| 2:00 | C | In **Moderation queue**, find the new report (it is the newest; scroll to the bottom), type a note, click **Verify**. | "Moderators see photos and corroboration counts, then verify or reject. Every change is logged with who and when." |
| 2:20 | A | Open the report's detail page (click its title): **Verified**, and **Status history** with the moderator's name and note. | "That is the Validate step, with a full audit trail." |
| 2:40 | Phone or A (signed out) | Open `/sos`. Choose **Trapped by flood**, show **Sharing live location**, set people to 4, type a phone number, **Send SOS**, then **Yes, send SOS**. | "No account needed in an emergency. One confirmation step prevents accidental sends." |
| 3:20 | B | The request appears at the top of **SOS requests**, marked **Visitor**, with a sound. Click it, show the location, notes and phone, click **Acknowledge**. | "Only authorized responders see SOS requests. The location never appears on the public map." |
| 3:45 | Phone | Reload: the status shows **Acknowledged**. | "The person asking for help knows someone is coming." |
| 4:00 | A | **Facilities**: the green **Nearest open evacuation center** card, then the list with distance, Open/Full status and "may be outdated" labels. Tap **Directions**. | "Where to go: the nearest open center by real distance, with how fresh the status is." |
| 4:30 | A | **Incident List**: click **Pending**, then search a barangay name, for example "Marikina". | "Barangay officials monitor everything in a list until it is resolved." |
| 4:50 | A | Back to the map. | "Report, validate, inform, assist, monitor. Built on open maps and Supabase, deployed today." |

## 4. If something goes wrong

| Problem | Recovery |
|---|---|
| Map shows "Could not load map data" | Supabase project paused or unreachable. Open the dashboard and click restore, then **Try again**. Keep screenshots ready as a fallback. |
| No pins in the 24-hour view | The seed is older than a day. Switch to **30 days**, and reseed after the demo. |
| "GPS weak" or location outside the Philippines | Click **Adjust pin** and tap the map near Quezon City. |
| SOS says "Too many requests" | The 3-per-hour limit from rehearsal. Send it from the phone or another browser, or clear rate limits (section 6). |
| Responder list does not update | Wait up to 15 seconds (fallback refresh) or reload window B. |
| Sign-in fails | Check you are using `HOSTED_DEMO_PASSWORD`, not the README password, and paste it rather than typing it. |
| Wi-Fi drops | Phone hotspot. As a last resort, run the local copy (`npm run dev`) with the README password. |

## 5. Two-minute cut

1. Map: pins, layers, a verified incident (30 s).
2. SOS from the phone without an account, responder acknowledges, phone shows Acknowledged (60 s).
3. Nearest open evacuation center with Directions (20 s).
4. Closing line (10 s).

## 6. Commands

`scripts/hosted-reseed.sh` reads `.env.hosted`, reseeds the hosted project, sets the demo
password back to `HOSTED_DEMO_PASSWORD` (the seed resets it to the public one) and clears rate
limits. Reseeding deletes every incident and SOS request, including ones made while rehearsing.

| Task | Windows (in `bakunawa`, Docker running) | Mac (in the project folder, `brew install libpq` once) |
|---|---|---|
| Check the connection, change nothing | `docker compose run --rm -T -e DRY_RUN=1 app sh scripts/hosted-reseed.sh` | `DRY_RUN=1 sh scripts/hosted-reseed.sh` |
| Reseed and set the demo password | `docker compose run --rm -T app sh scripts/hosted-reseed.sh` | `sh scripts/hosted-reseed.sh` |
| Only clear rate limits | `docker compose run --rm -T app sh scripts/hosted-reseed.sh limits` | `sh scripts/hosted-reseed.sh limits` |

On the Mac, `.env.hosted` is not in Git: create it with the same 5 lines (copy the values from
the Supabase dashboard and your password manager).
