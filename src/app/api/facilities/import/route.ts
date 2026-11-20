import Papa from "papaparse";
import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { getRequestCaller } from "@/lib/auth/caller";
import type { Database } from "@/lib/supabase/database.types";
import { getServiceClient } from "@/lib/supabase/service";
import { facilitySchema } from "@/lib/validation/facility";

const MAX_BYTES = 2 * 1024 * 1024;
type FacilityInsert = Database["public"]["Tables"]["facilities"]["Insert"];

/**
 * POST /api/facilities/import (contracts/http-api.md, FR-039): admins bulk-load facilities from
 * CSV with columns name, type, lat, lng, address, contact_phone, capacity, status.
 */
export async function POST(req: NextRequest) {
  const caller = await getRequestCaller(req);
  if (!caller) return apiError("auth_required", "Sign in as an admin.");
  if (caller.role !== "admin") return apiError("forbidden", "Only admins can import facilities.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return apiError("invalid_input", "Attach a CSV file.", { field: "file" });
  if (file.size > MAX_BYTES) return apiError("file_too_large", "CSV must be 2 MB or smaller.", { field: "file" });

  const parsed = Papa.parse<Record<string, string>>(await file.text(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows: FacilityInsert[] = [];
  const errors: { row: number; message: string }[] = [];
  parsed.data.forEach((raw, i) => {
    const r = facilitySchema.safeParse(raw);
    const rowNo = i + 2; // header is row 1
    if (!r.success) {
      const issue = r.error.issues[0]!;
      errors.push({ row: rowNo, message: `${issue.path.join(".") || "row"}: ${issue.message}` });
      return;
    }
    const f = r.data;
    rows.push({
      name: f.name,
      type: f.type,
      location: `SRID=4326;POINT(${f.lng} ${f.lat})`,
      address: f.address ?? "",
      contact_phone: f.contact_phone ?? null,
      capacity: f.capacity ?? null,
      status: f.status,
      status_updated_at: f.status === "unknown" ? null : new Date().toISOString(),
      status_updated_by: f.status === "unknown" ? null : caller.id,
    });
  });

  if (rows.length) {
    const { error } = await getServiceClient().from("facilities").insert(rows);
    if (error) return apiError("server_error", `Import failed: ${error.message}`);
  }

  return NextResponse.json({ inserted: rows.length, skipped: errors.length, errors });
}
