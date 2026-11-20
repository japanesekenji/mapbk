import { z } from "zod";
import { SERVICE_AREA } from "@/lib/geo";

export const FACILITY_TYPES = [
  "evacuation_center",
  "hospital",
  "police_station",
  "fire_station",
  "rescue_station",
  "relief_center",
] as const;
export const FACILITY_STATUSES = ["open", "full", "closed", "unknown"] as const;

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/**
 * One facility row from the CSV import or the admin form. Field rules follow data-model.md
 * facilities.name, facilities.type, facilities.location (lat/lng within the service area),
 * facilities.address, facilities.contact_phone, facilities.capacity and facilities.status.
 */
export const facilitySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(120),
  type: z.enum(FACILITY_TYPES, { error: "Unknown facility type" }),
  lat: z.coerce.number().min(SERVICE_AREA.minLat, "lat outside service area").max(SERVICE_AREA.maxLat, "lat outside service area"),
  lng: z.coerce.number().min(SERVICE_AREA.minLng, "lng outside service area").max(SERVICE_AREA.maxLng, "lng outside service area"),
  address: z.preprocess(blankToUndefined, z.string().trim().max(200).optional()),
  contact_phone: z.preprocess(blankToUndefined, z.string().trim().max(30).optional()),
  capacity: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).optional()),
  status: z.preprocess(blankToUndefined, z.enum(FACILITY_STATUSES).default("unknown")),
});

export type FacilityInput = z.infer<typeof facilitySchema>;
