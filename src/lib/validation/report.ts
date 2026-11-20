import { z } from "zod";
import { locationSchema } from "./common";

/** Allowed photo types and size (contracts/database.md "Storage", constitution security section). */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS = 4;

/**
 * POST /api/reports body (contracts/http-api.md). Field rules follow data-model.md
 * incidents.category_id, incidents.description, incidents.location,
 * incidents.location_accuracy_m and incidents.place_name.
 */
export const reportSchema = z.object({
  category_id: z.string().regex(/^[a-z_]+$/, "Choose what is happening"),
  description: z
    .string()
    .trim()
    .min(1, "Describe what is happening")
    .max(1000, "Keep the description under 1,000 characters"),
  location: locationSchema,
  place_name: z.string().trim().max(120).optional(),
  photo_paths: z
    .array(z.string().regex(/^pending\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/, "Invalid photo"))
    .max(MAX_PHOTOS, `Add up to ${MAX_PHOTOS} photos`)
    .default([]),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const uploadSchema = z.object({
  content_type: z.string(),
  size_bytes: z.number().int().positive(),
});
