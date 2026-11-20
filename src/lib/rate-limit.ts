import "server-only";

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export type RateAction = "report" | "sos" | "upload";

/** Hourly limits from research R7 and data-model.md rate_limit_events. */
export const RATE_LIMITS: Record<RateAction, number> = { report: 10, sos: 3, upload: 40 };

export const DEVICE_COOKIE = "bk_device";

/** Client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Rate-limit subject (data-model.md rate_limit_events.subject): the user id when signed in,
 * else the device cookie plus a SHA-256 of the IP, so a Visitor cannot reset it by clearing
 * cookies alone.
 */
export function rateSubject(req: NextRequest, userId: string | null): string {
  if (userId) return userId;
  const device = req.cookies.get(DEVICE_COOKIE)?.value ?? "none";
  const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 32);
  return `device:${device.slice(0, 64)}|ip:${ipHash}`;
}

/** Records one event. Returns 0 when allowed, else seconds until the caller may try again. */
export async function checkAndRecord(subject: string, action: RateAction): Promise<number> {
  const { data, error } = await getServiceClient().rpc("rate_limit_hit", {
    p_subject: subject,
    p_action: action,
    p_limit: RATE_LIMITS[action],
  });
  if (error) throw new Error(`rate limit check failed: ${error.message}`);
  return data ?? 0;
}
