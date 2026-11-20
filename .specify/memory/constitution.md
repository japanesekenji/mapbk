# Bakunawa Constitution

## Core Principles

### I. Transparent Verification Status

- Every incident MUST display exactly one verification status: Pending, Verified, Resolved, or
  Rejected.
- New citizen reports MUST start as Pending. Only Moderator or Admin roles MAY change a status.
- Pending reports MUST be visibly labeled as unverified wherever they appear (map, list, detail).
- Community corroborations MUST be counted separately from moderator verification and MUST NOT
  change status on their own. One corroboration per user per incident.
- Every status change MUST record who changed it, when, and the previous status.

Rationale: in a disaster, people act on what they see. Users must always know whether
information is confirmed.

### II. Privacy and Restricted SOS

- SOS requests MUST be visible only to Responder and Admin roles. They MUST NOT appear on the
  public map, list, API, or exports.
- Reporter identity (name, phone, email) MUST NOT be shown publicly unless the reporter opts in.
- Access checks MUST be enforced on the server for every read and write. Hiding UI elements is
  not access control.
- Roles: Guest, Citizen, Moderator, Responder, Admin. Each role gets only the permissions its
  task needs.

Rationale: SOS data holds exact locations of vulnerable people. Exposure puts them at risk.

### III. Mobile-First, Low-Bandwidth

- Every user-facing screen MUST work on a 360 px wide phone browser.
- Reporting an incident and sending an SOS MUST each take at most 3 screens and work on a
  slow 3G connection.
- Photos MUST be resized or compressed before upload.
- The map MUST load incidents only for the visible area, not the full dataset.

Rationale: affected users are mostly on phones, often with damaged or congested networks.

### IV. Minimal MVP Scope

- The MVP covers six features only: hazard map, incident reporting, verification, SOS,
  emergency facilities, and incident list. Anything else requires a constitution amendment or
  an approved spec.
- Use a fixed data schema. No dynamic form builder, multi-tenancy, or plugin system.
- Distance and "near me" queries MUST use true geographic distance (spatial database), not a
  bounding-box approximation.
- Prefer managed services and existing libraries over custom infrastructure.

Rationale: a hackathon build must reach a working demo. Every extra feature delays the core.

### V. Tested Critical Paths

- These paths MUST have automated tests before a feature is considered done: submitting a
  report, sending an SOS, changing a verification status, and role-based access to SOS data.
- Tests MUST run with a single command.
- Other code MAY ship without tests during the MVP.

Rationale: these paths decide whether help arrives and whether private data leaks.

## Security and Data Requirements

- All traffic MUST use HTTPS outside local development.
- Secrets and API keys MUST NOT be committed to the repository.
- Public submission endpoints (report, SOS, photo upload) MUST have rate limits.
- All input MUST be validated on the server. Uploads MUST be limited to image types and a maximum
  size of 10 MB.
- Coordinates MUST be stored as WGS84 latitude/longitude.
- Timestamps MUST be stored in UTC and displayed in Philippine Time (UTC+8).
- Facility records MUST show their operating status (Open, Full, Closed) and when it was last
  updated.

## Development Workflow

- Each feature follows the Spec Kit flow: specify, plan, tasks, implement.
- Each plan MUST include a Constitution Check against the principles above.
- The main branch MUST stay runnable for a demo. Broken builds are fixed before new work.
- Seed data MUST include sample incidents, facilities, and one account per role, so the app can
  be demonstrated without manual setup.

## Governance

- This constitution overrides other project practices where they conflict.
- Amendments require a written change to this file, a version bump, and agreement from the team
  lead.
- Versioning: MAJOR for removing or redefining a principle, MINOR for adding a principle or
  section, PATCH for wording fixes.
- Every spec and plan review MUST confirm compliance. Any deviation MUST be justified in the
  plan's Complexity Tracking section.

**Version**: 1.0.0 | **Ratified**: 2026-11-21 | **Last Amended**: 2026-11-21
