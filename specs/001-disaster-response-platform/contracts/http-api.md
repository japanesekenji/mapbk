# Contract: Next.js Route Handlers

Server routes under `/api`. They run on Vercel with the Supabase service-role key, which never
reaches the browser. Every handler validates input with the shared zod schemas in
`src/lib/validation/` and returns JSON.

**Common rules**

- Auth: the Supabase session cookie, if present, identifies the user. No session = Visitor.
- Device id: an HttpOnly first-party cookie `bk_device` (random UUID) set on first visit.
- Errors use `{ "error": { "code": string, "message": string, "field"?: string } }`.

| HTTP | `code` | When |
|---|---|---|
| 400 | `invalid_input` | validation failed; `field` names the first bad field |
| 401 | `auth_required` | route needs a signed-in user |
| 403 | `forbidden` | role not allowed |
| 404 | `not_found` | unknown id or bad tracking token |
| 409 | `status_conflict` | (database RPC) status changed by someone else |
| 413 | `file_too_large` | upload over 10 MB |
| 415 | `unsupported_type` | not an allowed image type |
| 422 | `outside_service_area` | location outside the Philippines |
| 429 | `rate_limited` | over the hourly limit; includes `retry_after_s` |

## POST /api/reports

Create an incident report. Requires a signed-in user (FR-003). Rate limit: 10 per hour.

Request:

```json
{
  "category_id": "flood",
  "description": "Knee-deep water on Tatalon St., rising.",
  "location": { "lat": 14.6219, "lng": 121.0146, "accuracy_m": 8 },
  "place_name": "Brgy. Tatalon, Quezon City",
  "photo_paths": ["pending/7f1c.../a.webp"]
}
```

| Field | Rule |
|---|---|
| `category_id` | one of the seeded category ids |
| `description` | 1 to 1,000 chars |
| `location` | lat 4.5 to 21.5, lng 116 to 127; `accuracy_m` optional int |
| `place_name` | optional, up to 120 chars |
| `photo_paths` | 0 to 4 paths returned by `/api/uploads` for this user |

Response `201`:

```json
{ "id": "uuid", "status": "pending", "severity": "high", "reported_at": "2026-11-21T03:12:00Z" }
```

## POST /api/uploads

Get a signed upload URL for one photo. Requires a signed-in user. Rate limit: 40 per hour.

Request: `{ "content_type": "image/webp", "size_bytes": 412000 }`
Response `200`: `{ "path": "pending/<user>/<uuid>.webp", "signed_url": "https://...", "expires_in_s": 300 }`
Errors: `413 file_too_large`, `415 unsupported_type`.

## POST /api/sos

Create an SOS. Works for Visitors and signed-in users (spec Q1 = A). Rate limit: 3 per hour per
user, or per device id plus hashed IP for Visitors.

Request:

```json
{
  "type": "trapped_flood",
  "location": { "lat": 14.5764, "lng": 121.0851, "accuracy_m": 8 },
  "landmark": null,
  "people_count": 4,
  "notes": "Two seniors, one child. Second floor.",
  "contact_phone": "09171234567",
  "confirmed": true
}
```

| Field | Rule |
|---|---|
| `type` | `medical`, `trapped_flood`, `fire`, `other` |
| `location` | required unless `landmark` is given; inside service area |
| `landmark` | up to 200 chars; required when `location` is null |
| `people_count` | 1 to 50 |
| `notes` | optional, up to 500 chars |
| `contact_phone` | required for Visitors; for users defaults to profile phone |
| `confirmed` | must be `true` (explicit confirmation, FR-031) |

Response `201`:

```json
{ "id": "uuid", "tracking_token": "base64url-32-bytes", "state": "new", "created_at": "2026-11-21T03:15:02Z" }
```

The token is shown once; the client stores `{id, tracking_token}` in local storage. Only its hash
is saved.

## GET /api/sos/{id}?token={tracking_token}

Sender's view of their own SOS. No session needed; the token proves ownership.

Response `200`:

```json
{ "id": "uuid", "type": "trapped_flood", "state": "acknowledged", "state_updated_at": "2026-11-21T03:16:40Z" }
```

Returns `404 not_found` for an unknown id or wrong token (same response for both). Responder
identity and other requests' data are never returned.

## GET /api/geocode?q={text}

Place search for barangays, cities and municipalities (FR-010). Public. Forwards to Nominatim with
`countrycodes=ph`, max 1 upstream request per second, 24-hour cache.

Response `200`:

```json
{ "results": [ { "label": "Tatalon, Quezon City, Metro Manila", "lat": 14.62, "lng": 121.01,
  "bbox": [120.99, 14.61, 121.03, 14.63] } ] }
```

`q` must be 2 to 100 chars. Upstream failure returns `200` with an empty list and
`"degraded": true`.

## POST /api/facilities/import

Bulk-load facilities from CSV (FR-039). Admin only. `multipart/form-data` with field `file`
(text/csv, up to 2 MB).

Columns: `name, type, lat, lng, address, contact_phone, capacity, status`.

Response `200`:

```json
{ "inserted": 23, "skipped": 2, "errors": [ { "row": 7, "message": "lat outside service area" } ] }
```
