import { z } from "zod";
import { locationSchema, phoneSchema } from "./common";

export const SOS_TYPES = ["medical", "trapped_flood", "fire", "other"] as const;

/**
 * POST /api/sos body (contracts/http-api.md). Field rules follow data-model.md sos_requests.type,
 * sos_requests.location, sos_requests.landmark, sos_requests.people_count, sos_requests.notes
 * and sos_requests.contact_phone. contact_phone is required for Visitors, checked in the route.
 */
export const sosSchema = z
  .object({
    type: z.enum(SOS_TYPES, { error: "Choose the type of emergency" }),
    location: locationSchema.nullish(),
    landmark: z.string().trim().min(1).max(200).nullish(),
    people_count: z.number().int().min(1, "At least 1 person").max(50, "Up to 50 people"),
    notes: z.string().trim().max(500, "Keep notes under 500 characters").nullish(),
    contact_phone: phoneSchema.nullish(),
    confirmed: z.literal(true, { error: "Confirm before sending" }),
  })
  .refine((v) => v.location || v.landmark, {
    message: "Share your location or describe a landmark",
    path: ["location"],
  });

export type SosInput = z.infer<typeof sosSchema>;
