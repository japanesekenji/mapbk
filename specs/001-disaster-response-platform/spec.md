# Feature Specification: Bakunawa Disaster Response Platform (MVP)

**Feature Branch**: `001-disaster-response-platform`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "I am building a modern web application. BAKUNAWA - Community-Powered
Disaster Intelligence & Emergency Response Platform. Crowdsourced disaster awareness and emergency
response for Filipino communities: interactive hazard map, crowdsourced incident reporting, incident
verification, emergency SOS, emergency facilities and resources, incident list and monitoring.
Reference: Ushahidi platform (reverse-engineered in BAKUNAWA-USHAHIDI-FEATURE-MAP.md) and the
Bakunawa UI design handoff."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View hazards and incidents on a map (Priority: P1)

A resident opens Bakunawa during a typhoon and sees a map centered on their area showing active
incidents, hazards, affected areas and emergency facilities as markers. They turn map layers on or
off by category, limit incidents to a time range, search for a barangay or city, and select a
marker to read its details and verification status.

**Why this priority**: The map is the entry point for every other feature. Even with seeded data
alone, it gives residents situational awareness.

**Independent Test**: Load the app with seeded incidents and facilities. Toggle layers, change the
time range, search a place, and select markers. Confirm the visible markers and detail card match
the seed data.

**Acceptance Scenarios**:

1. **Given** seeded incidents across several categories, **When** a visitor opens the map,
   **Then** markers appear for the visible area, colored by severity (facilities in the facility
   color), with a summary of active incidents by severity.
2. **Given** the "Flood" layer is on, **When** the visitor unchecks it, **Then** flood markers
   disappear and the layer's count stays visible beside its name.
3. **Given** the time range is "24 hours", **When** the visitor selects "7 days", **Then** incidents
   reported in the last 7 days appear.
4. **Given** markers on the map, **When** the visitor selects one, **Then** a detail card shows the
   title, place, time reported, status, description, verification progress (Reported,
   Corroborated, Verified, Resolved), corroboration count and a Directions action.
5. **Given** the visitor allows location access, **When** they press "locate me", **Then** the map
   centers on their position and shows a location marker.
6. **Given** a visitor without the Responder or Admin role, **When** they view the layer list,
   **Then** the SOS layer shows as restricted and SOS requests never appear.

---

### User Story 2 - Report an incident (Priority: P1)

A citizen sees a flooded street. They tap "Report Hazard", choose a category, confirm their GPS
location (adjusting the pin if needed), describe what is happening, attach up to 4 photos, and
submit. The report appears on the map and list as Pending.

**Why this priority**: Crowdsourced reports are the platform's main data source. Without them, the
map shows only facilities.

**Independent Test**: Submit a report with a category, location, description and photo. Confirm it
appears on the map and list with status Pending and the attached photo.

**Acceptance Scenarios**:

1. **Given** a citizen on the report screen, **When** they choose "Flood", confirm the location,
   enter a description, add 2 photos and submit, **Then** the report is saved as Pending and
   appears on the map at that location.
2. **Given** GPS gives a location, **When** the citizen drags the pin to a new spot, **Then** the
   report uses the adjusted location.
3. **Given** the citizen tries to add a fifth photo, **Then** the system blocks it and states the
   4-photo limit.
4. **Given** a required field (category, location or description) is empty, **When** the citizen
   submits, **Then** the system names the missing field and keeps their entries.
5. **Given** the connection drops during submission, **Then** the citizen sees that the report was
   not sent and can retry without re-entering details.

---

### User Story 3 - Send an emergency SOS (Priority: P1)

A family is trapped by rising floodwater. One member opens SOS, chooses "Trapped by flood", sees
that their live location is being shared, sets the number of people to 4, adds a short note, and
sends. Authorized responders see the request with its location and details. The family sees that
the request was received.

**Why this priority**: SOS is the life-safety feature. It must work even if nothing else does.

**Independent Test**: Send an SOS as a citizen. Confirm a Responder sees it with location, type,
people count and notes, and that a Citizen, Moderator or visitor cannot see it.

**Acceptance Scenarios**:

1. **Given** a user on the SOS screen, **When** they choose a type (Medical, Trapped by flood,
   Fire, Other), confirm location, set people count, and confirm the send, **Then** the request is
   recorded and the user sees a confirmation with the time it was received.
2. **Given** a user presses Send SOS, **Then** the system asks for an explicit confirmation before
   sending, to prevent accidental requests.
3. **Given** an SOS was sent, **When** a Responder opens the SOS view, **Then** they see the
   request on the map and in a list, newest first, with location, type, people count, notes and
   time.
4. **Given** a Citizen, Moderator or visitor, **When** they view the map, list, or any data export,
   **Then** no SOS request or SOS count is shown.
5. **Given** a Responder opens an SOS request, **When** they mark it Acknowledged, Responding or
   Closed, **Then** the sender sees the updated state.
6. **Given** a Visitor who is not signed in, **When** they open SOS, enter a contact phone
   number and send, **Then** the request is recorded without requiring sign-up, and Responders
   see it marked as sent by a Visitor.
7. **Given** location access is denied, **Then** the SOS screen lets the user place a pin or type a
   landmark, and shows the hotline note "In a life-threatening emergency, call 911."

---

### User Story 4 - Verify incidents (Priority: P2)

Community members who see the same hazard press "Corroborate" on the incident. Moderators review
Pending reports with their photos and corroboration counts, then mark each one Verified, Rejected
or, once the hazard is over, Resolved.

**Why this priority**: Verification makes the map trustworthy. It depends on reports existing
(Story 2).

**Independent Test**: As two different citizens, corroborate one incident and confirm the count
rises by 2. As a Moderator, mark it Verified, then Resolved, and confirm the status, progress bar
and change history update.

**Acceptance Scenarios**:

1. **Given** a signed-in citizen viewing an incident, **When** they press "Corroborate", **Then**
   the count rises by 1 and the button shows "Corroborated".
2. **Given** the citizen already corroborated, **When** they press the button again, **Then** their
   corroboration is withdrawn and the count drops by 1.
3. **Given** a Pending incident, **When** a Moderator marks it Verified, **Then** the status chip
   reads Verified everywhere it appears, and the change history records the moderator, time and
   previous status.
4. **Given** a non-moderator, **Then** no status-change controls are shown, and any attempt to
   change status is refused.
5. **Given** a Moderator marks a report Rejected, **Then** it is removed from the public map and
   list but kept for the moderator's records.
6. **Given** a moderator queue, **When** a Moderator opens it, **Then** Pending reports are listed
   with photos and corroboration counts, oldest first.

---

### User Story 5 - Find emergency facilities (Priority: P2)

A displaced resident needs shelter. They open Facilities, see the nearest evacuation centers,
hospitals, police and fire stations and relief centers sorted by distance, with each facility's
operating status (Open, Full, Closed) and when it was last updated, and get directions.

**Why this priority**: Facilities answer "where do I go now". Seeded data makes this feature
independent of citizen reports.

**Independent Test**: With seeded facilities and a set user location, open Facilities. Confirm the
list is sorted by distance with statuses and update times, and that an Admin status change appears.

**Acceptance Scenarios**:

1. **Given** the user shares their location, **When** they open Facilities, **Then** facilities are
   listed nearest first, with distance in kilometers, type, status and last-updated time.
2. **Given** a facility type filter of "Evacuation centers", **Then** only evacuation centers appear.
3. **Given** an Admin or Moderator updates a facility status to Full, **Then** the facility shows
   Full with the new update time.
4. **Given** a facility status was last updated more than 24 hours ago, **Then** the status is
   shown with a "may be outdated" label.
5. **Given** a facility marker or row, **When** the user selects Directions, **Then** they are taken
   to turn-by-turn directions to that facility.

---

### User Story 6 - Browse and monitor incidents (Priority: P3)

A barangay official reviews recent incidents in a list. They search by location or keyword, filter
by status (All, Verified, Pending, Resolved), category and time range, sort by newest, and open an
incident to follow its progress until it is resolved.

**Why this priority**: The list adds monitoring on top of the map. It reuses the same data and
filters.

**Independent Test**: With seeded incidents, apply each filter and the search. Confirm the rows and
the "Showing X–Y of Z" total match the filtered data.

**Acceptance Scenarios**:

1. **Given** the incident list, **When** the user picks the "Pending" status filter, **Then** only
   Pending incidents appear and the total updates.
2. **Given** a category filter and a time range, **Then** both apply together.
3. **Given** more than one page of results, **Then** pagination shows the range and total, and
   moves between pages.
4. **Given** a row, **When** the user selects it, **Then** the incident detail opens with its
   status history.
5. **Given** filters that match nothing, **Then** the list shows "No incidents match" and a way to
   clear filters.

### Edge Cases

- A report is submitted at sea or outside the Philippines: the system rejects locations outside the
  Philippine service area and says why.
- GPS accuracy is poor (for example worse than ±100 m): the report and SOS screens show the accuracy
  and prompt the user to adjust the pin.
- The same user submits many reports or SOS requests in a short time: the system limits the rate
  and tells the user when they can send again.
- Two moderators change the same incident's status at the same time: the second sees that the
  status already changed and is shown the current value before confirming.
- A photo is not an image or exceeds 10 MB: the system refuses that file and explains why.
- A user corroborates their own report: the system does not allow it.
- The map area holds hundreds of markers: nearby markers group into clusters with counts.
- A resolved incident flares up again: a Moderator can return it from Resolved to Verified, and the
  history records it.
- No connection at all: the app shows that it is offline. Previously loaded map data stays
  visible, labeled with its last update time.

## Requirements *(mandatory)*

### Functional Requirements

**Access and roles**

- **FR-001**: System MUST support five roles: Visitor (not signed in), Citizen, Moderator,
  Responder and Admin.
- **FR-002**: Visitors MUST be able to view the public map, incident list, incident details and
  facilities without an account.
- **FR-003**: Submitting an incident report and corroborating MUST require a signed-in Citizen
  account. Sending an SOS MUST NOT require an account: Visitors MAY send an SOS by providing a
  contact phone number. Signed-in users' SOS requests use their account's contact details.
- **FR-004**: System MUST enforce every role restriction on every read and write, regardless of
  what the interface shows.
- **FR-005**: Admins MUST be able to assign Moderator and Responder roles to users.

**Interactive hazard map**

- **FR-006**: System MUST show incidents, affected areas and facilities as map markers, loading
  only those within the visible map area.
- **FR-007**: System MUST provide toggleable map layers grouped into four categories, each with a
  count:
  - Natural hazards: Flood, Earthquake, Typhoon/Storm, Landslide, Volcanic activity, Tsunami
  - Human-induced hazards: Fire, Chemical leak, Structural collapse, Road accident,
    Security threat
  - Emergency facilities: Evacuation centers, Hospitals, Police and fire stations, Rescue
    stations, Relief centers
  - Community and response: SOS requests (restricted, off by default), Road closures, Damaged
    infrastructure, Affected areas
- **FR-008**: System MUST color incident markers by severity (Critical, High, Moderate, Low) and use
  a single distinct color for facilities.
- **FR-009**: System MUST filter map incidents by time range: last hour, 24 hours, 7 days, 30 days.
- **FR-010**: System MUST let users search for a barangay, city or municipality and move the map
  there.
- **FR-011**: System MUST show a summary of active incidents (total and count per severity) and a
  list of the most recent reports beside the map. Selecting a recent report selects its marker.
- **FR-012**: System MUST show a "last updated" indicator and refresh map data while the page is
  open, so new reports and status changes appear within 1 minute without reloading.
- **FR-013**: System MUST cluster nearby markers when they would overlap.
- **FR-014**: Affected areas MUST be displayable as outlined regions, not only points.

**Incident reporting**

- **FR-015**: Citizens MUST be able to submit a report with: category (required), location
  (required, from GPS with an adjustable pin), description (required, up to 1,000 characters), and
  up to 4 photos (optional, image files up to 10 MB each).
- **FR-016**: System MUST show the GPS accuracy of the captured location.
- **FR-017**: System MUST reduce photo file size before upload while keeping them legible.
- **FR-018**: New reports MUST start with status Pending and a severity based on the category
  default, which moderators can change.
- **FR-019**: System MUST keep the reporter's entries if submission fails, and allow retry.
- **FR-020**: System MUST NOT show the reporter's name or contact details publicly unless the
  reporter opts in.
- **FR-021**: System MUST limit how many reports and SOS requests one user or device can submit per
  hour.

**Incident verification**

- **FR-022**: Each incident MUST have exactly one status: Pending, Verified, Resolved or Rejected.
- **FR-023**: Signed-in citizens MUST be able to corroborate an incident once, withdraw their
  corroboration, and MUST NOT corroborate their own report.
- **FR-024**: Corroborations MUST NOT change status. The verification progress MUST show the
  "Corroborated" step once an incident has at least 3 corroborations.
- **FR-025**: Only Moderators and Admins MUST be able to change status and severity.
- **FR-026**: System MUST record every status change with who made it, when, the previous status
  and an optional note, and show this history on the incident.
- **FR-027**: Pending incidents MUST be labeled as unverified everywhere they appear.
- **FR-028**: Rejected incidents MUST be hidden from public views and kept for moderators.
- **FR-029**: Moderators MUST have a queue of Pending reports with photos and corroboration counts.

**Emergency SOS**

- **FR-030**: Users MUST be able to send an SOS with: type (Medical, Trapped by flood, Fire, Other),
  live location (or a manual pin or landmark if location is denied), number of people (1 to 50),
  optional notes (up to 500 characters), and a contact phone number (required for Visitors,
  prefilled for signed-in users).
- **FR-030a**: Because Visitors can send an SOS without an account, rate limits (FR-021) and the
  send confirmation (FR-031) MUST apply to Visitor SOS requests per device, and Responders MUST be
  able to see whether an SOS came from a signed-in user or a Visitor.
- **FR-031**: System MUST require an explicit confirmation before sending an SOS.
- **FR-032**: SOS requests MUST be visible only to Responders and Admins, and MUST NOT appear in
  public maps, lists, counts or exports.
- **FR-033**: Responders MUST see SOS requests on a map and in a list, newest first, and receive an
  in-app alert for new requests while signed in.
- **FR-034**: Responders MUST be able to set an SOS to Acknowledged, Responding or Closed. The
  sender MUST see the current state.
- **FR-035**: The SOS screen MUST show the national emergency hotline (911).

**Emergency facilities**

- **FR-036**: System MUST list facilities of types Evacuation center, Hospital, Police station, Fire
  station, Rescue station and Relief center, with name, type, location, contact number and
  operating status (Open, Full, Closed, Unknown).
- **FR-037**: System MUST show when each facility status was last updated, and label statuses older
  than 24 hours as possibly outdated.
- **FR-038**: Users who share their location MUST see facilities sorted by straight-line geographic
  distance (a true circle, not a box approximation), with the distance in kilometers.
- **FR-039**: Admins and Moderators MUST be able to add facilities, edit them, and update their
  status. Admins MUST be able to load many facilities at once from a spreadsheet file.
- **FR-040**: Users MUST be able to open directions to any facility or incident in an external
  maps service.

**Incident list and monitoring**

- **FR-041**: System MUST provide an incident list with search by location or keyword, filters for
  status, category and time range, sorting by newest, and pagination with a "Showing X–Y of Z"
  total.
- **FR-042**: Each row MUST show the title, place, category, severity, status, time reported and
  corroboration count.
- **FR-043**: Users MUST be able to open an incident detail page showing all report fields, photos,
  verification progress and status history.

**General**

- **FR-044**: All screens MUST work on phone-sized screens (360 px wide and up) and on desktop. Phone
  layouts use a bottom tab bar (Map, Incidents, Report, Facilities, Profile).
- **FR-045**: All times MUST display in Philippine Time.
- **FR-046**: System MUST show loading, empty and error states on every data view, with a retry
  action on errors.
- **FR-047**: System MUST ship with demo data: sample incidents in every category and status,
  sample facilities of every type, and one account per role.

### Key Entities

- **User**: a person with an account. Has a display name, contact (email or phone), role, and a
  choice whether to show their name on reports.
- **Incident**: a reported hazard or event. Has a category, title, description, location (point or
  area), place name, severity, status, reporter, photos, corroboration count, time reported and
  time last updated.
- **Category**: one of the hazard types in FR-007, grouped under its parent category, with a
  default severity, color and icon.
- **Photo**: an image attached to an incident, with its upload time.
- **Corroboration**: one user's confirmation of one incident, with the time it was made. One per
  user per incident.
- **Status Change**: a history entry for an incident: previous status, new status, who, when and
  an optional note.
- **SOS Request**: an urgent help request. Has a sender (a user account, or a Visitor identified
  by contact phone number), contact phone, type, location, location accuracy, people
  count, notes, response state (New, Acknowledged, Responding, Closed), assigned responder and
  times.
- **Facility**: an emergency facility. Has a name, type, location, address, contact number,
  operating status and time of last status update.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time citizen can submit a complete incident report (category, location,
  description, 1 photo) in under 90 seconds.
- **SC-002**: A user can send an SOS in under 30 seconds from opening the app.
- **SC-003**: A Responder sees a new SOS within 30 seconds of it being sent.
- **SC-004**: The map shows markers for the visible area within 3 seconds on a mid-range phone over
  a slow 3G connection.
- **SC-005**: A user who shares their location can find the nearest open evacuation center in 3
  taps or fewer.
- **SC-006**: In testing, 0 SOS requests are visible to Visitors, Citizens or Moderators across the
  map, list, counts and exports.
- **SC-007**: Status changes and new reports appear for other users within 1 minute without a page
  reload.
- **SC-008**: 9 of 10 test users correctly tell a Verified incident from a Pending one by looking at
  the map or list.
- **SC-009**: Every status change can be traced to the moderator who made it.

## Assumptions

- Service area is the Philippines. The demo data and default map view center on Metro Manila,
  matching the UI design.
- Severity uses four public levels (Critical, High, Moderate, Low). Each category has a default
  severity, and moderators adjust it.
- The "Corroborated" progress step appears at 3 corroborations; this threshold is a demo default.
- Rejected is a fourth status added beyond the input's Verified, Pending and Resolved, as required
  by the project constitution.
- Directions are handed off to an external maps service; Bakunawa does not do routing.
- Responder alerts are in-app only for the MVP. SMS, push notifications and email alerts are out of
  scope.
- Out of scope for the MVP: SMS/USSD/WhatsApp intake, saved searches and subscriptions, data export
  for the public, official hazard overlays (PHIVOLCS/PAGASA), multiple languages, and offline report
  queueing.
- The UI follows the Bakunawa design handoff (desktop map, desktop incident list, four mobile
  screens) for layout, colors and typography. A Settings/Profile screen exists for sign-in, role
  display and the name-visibility choice.
- Accounts use standard email or phone sign-up with password; no single sign-on for the MVP.
- Facility data for the demo is seeded; real facility lists (government or community-mapped) can
  be loaded later through the spreadsheet import.
- Concepts are adapted from Ushahidi (report status with restricted visibility, location filters,
  moderation locks, change history) without reusing its code.
