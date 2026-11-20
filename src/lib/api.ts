import "server-only";

import { NextResponse } from "next/server";
import { HTTP_STATUS, type ApiError, type ErrorCode } from "@/lib/validation/common";

/** JSON error response in the contracts/http-api.md envelope. */
export function apiError(
  code: ErrorCode,
  message: string,
  extra: { field?: string; retry_after_s?: number } = {},
) {
  const body: ApiError = { error: { code, message, ...extra } };
  const headers: Record<string, string> = {};
  if (extra.retry_after_s) headers["Retry-After"] = String(extra.retry_after_s);
  return NextResponse.json(body, { status: HTTP_STATUS[code], headers });
}

export function rateLimited(retryAfter: number) {
  const minutes = Math.ceil(retryAfter / 60);
  return apiError(
    "rate_limited",
    `Too many requests. You can try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    { retry_after_s: retryAfter },
  );
}

/** Parse a JSON body, returning null when it is missing or malformed. */
export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
