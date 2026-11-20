import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, rateLimited, readJson } from "@/lib/api";
import { getRequestCaller } from "@/lib/auth/caller";
import { DEVICE_COOKIE, checkAndRecord, rateSubject } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";
import { isOutsideServiceArea, zodToApiError } from "@/lib/validation/common";
import { sosSchema } from "@/lib/validation/sos";

/**
 * POST /api/sos (contracts/http-api.md, spec Q1 = A): Visitors and signed-in users can send an
 * SOS. 3 per hour per user, or per device plus hashed IP for Visitors. Returns a one-time
 * tracking token; only its SHA-256 is stored.
 */
export async function POST(req: NextRequest) {
  const caller = await getRequestCaller(req);
  const parsed = sosSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json(zodToApiError(parsed.error), { status: 400 });
  const body = parsed.data;

  if (body.location && isOutsideServiceArea(body.location)) {
    return apiError("outside_service_area", "This location is outside the Philippines service area.", {
      field: "location",
    });
  }

  const phone = body.contact_phone ?? caller?.phone ?? null;
  if (!phone) {
    return apiError("invalid_input", "Enter a mobile number so responders can call you back.", {
      field: "contact_phone",
    });
  }

  const wait = await checkAndRecord(rateSubject(req, caller?.id ?? null), "sos");
  if (wait) return rateLimited(wait);

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await getServiceClient()
    .from("sos_requests")
    .insert({
      sender_id: caller?.id ?? null,
      sender_kind: caller ? "user" : "visitor",
      contact_phone: phone,
      type: body.type,
      location: body.location ? `SRID=4326;POINT(${body.location.lng} ${body.location.lat})` : null,
      location_accuracy_m: body.location?.accuracy_m ?? null,
      landmark: body.landmark ?? null,
      people_count: body.people_count,
      notes: body.notes || null,
      tracking_token_hash: createHash("sha256").update(token).digest("hex"),
      device_id: (req.cookies.get(DEVICE_COOKIE)?.value ?? "none").slice(0, 200),
    })
    .select("id, state, created_at")
    .single();
  if (error || !data) return apiError("server_error", "Your SOS was not sent. Try again or call 911.");

  return NextResponse.json({ ...data, tracking_token: token }, { status: 201 });
}
