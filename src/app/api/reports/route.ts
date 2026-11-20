import { NextResponse, type NextRequest } from "next/server";
import { apiError, rateLimited, readJson } from "@/lib/api";
import { getRequestCaller } from "@/lib/auth/caller";
import { checkAndRecord } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";
import { isOutsideServiceArea, zodToApiError } from "@/lib/validation/common";
import { reportSchema } from "@/lib/validation/report";

/**
 * POST /api/reports (contracts/http-api.md): create an incident report as Pending.
 * Signed-in only, 10 per hour, photos moved from the caller's pending uploads.
 */
export async function POST(req: NextRequest) {
  const caller = await getRequestCaller(req);
  if (!caller) return apiError("auth_required", "Sign in to report a hazard.");

  const parsed = reportSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json(zodToApiError(parsed.error), { status: 400 });
  const body = parsed.data;

  if (isOutsideServiceArea(body.location)) {
    return apiError("outside_service_area", "This location is outside the Philippines service area.", {
      field: "location",
    });
  }
  // Photos must be the caller's own pending uploads.
  if (body.photo_paths.some((p) => !p.startsWith(`pending/${caller.id}/`))) {
    return apiError("invalid_input", "Invalid photo", { field: "photo_paths" });
  }

  const db = getServiceClient();
  const { data: category } = await db
    .from("categories")
    .select("id, label, default_severity, \"group\"")
    .eq("id", body.category_id)
    .maybeSingle();
  if (!category || category.group === "facility") {
    return apiError("invalid_input", "Choose what is happening", { field: "category_id" });
  }

  const wait = await checkAndRecord(caller.id, "report");
  if (wait) return rateLimited(wait);

  const place = body.place_name?.trim() || null;
  const title = (place ? `${category.label}, ${place.split(",")[0]}` : category.label).slice(0, 80);

  const { data: incident, error } = await db
    .from("incidents")
    .insert({
      category_id: category.id,
      title,
      description: body.description,
      location: `SRID=4326;POINT(${body.location.lng} ${body.location.lat})`,
      location_accuracy_m: body.location.accuracy_m ?? null,
      place_name: place,
      severity: category.default_severity,
      status: "pending",
      reporter_id: caller.id,
    })
    .select("id, status, severity, reported_at")
    .single();
  if (error || !incident) return apiError("server_error", "Could not save the report. Try again.");

  // Move uploaded photos under the incident and record them. A failed photo does not fail the report.
  const storage = db.storage.from("incident-photos");
  const saved: string[] = [];
  for (const from of body.photo_paths) {
    const to = `incidents/${incident.id}/${from.split("/").pop()}`;
    const { error: moveErr } = await storage.move(from, to);
    if (!moveErr) saved.push(to);
  }
  if (saved.length) {
    await db.from("incident_photos").insert(saved.map((storage_path) => ({ incident_id: incident.id, storage_path })));
  }

  return NextResponse.json({ ...incident, photos_saved: saved.length }, { status: 201 });
}
