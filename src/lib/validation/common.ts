import { z } from "zod";
import { SERVICE_AREA } from "@/lib/geo";

/** Error codes from contracts/http-api.md "Common rules". */
export type ErrorCode =
  | "invalid_input"
  | "auth_required"
  | "forbidden"
  | "not_found"
  | "status_conflict"
  | "file_too_large"
  | "unsupported_type"
  | "outside_service_area"
  | "rate_limited"
  | "server_error";

export const HTTP_STATUS: Record<ErrorCode, number> = {
  invalid_input: 400,
  auth_required: 401,
  forbidden: 403,
  not_found: 404,
  status_conflict: 409,
  file_too_large: 413,
  unsupported_type: 415,
  outside_service_area: 422,
  rate_limited: 429,
  server_error: 500,
};

export type ApiError = {
  error: { code: ErrorCode; message: string; field?: string; retry_after_s?: number };
};

/**
 * PH mobile (09XXXXXXXXX) or E.164 (+639XXXXXXXXX), per data-model.md profiles.phone.
 * Spaces and dashes are stripped first.
 */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(\+[1-9][0-9]{7,14}|09[0-9]{9})$/, "Enter a mobile number like 09171234567"),
  );

/** WGS84 point. Service-area failures are reported separately as outside_service_area. */
export const locationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy_m: z.number().int().min(0).max(100_000).optional(),
});

export type LocationInput = z.infer<typeof locationSchema>;

export function isOutsideServiceArea(loc: { lat: number; lng: number }) {
  return (
    loc.lat < SERVICE_AREA.minLat ||
    loc.lat > SERVICE_AREA.maxLat ||
    loc.lng < SERVICE_AREA.minLng ||
    loc.lng > SERVICE_AREA.maxLng
  );
}

/** First issue of a failed parse, as an API error body. */
export function zodToApiError(err: z.ZodError): ApiError {
  const issue = err.issues[0];
  return {
    error: {
      code: "invalid_input",
      message: issue?.message ?? "Invalid input",
      field: issue?.path.join(".") || undefined,
    },
  };
}
