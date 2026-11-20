import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api";
import { getServiceClient } from "@/lib/supabase/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/sos/{id}?token= (contracts/http-api.md): the sender's view of their own SOS.
 * The token proves ownership. Unknown ids and wrong tokens get the same 404, and only the
 * request's own type and state are returned.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/sos/[id]">) {
  const { id } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const notFound = () => apiError("not_found", "SOS request not found.");
  if (!UUID.test(id) || !token) return notFound();

  const { data } = await getServiceClient()
    .from("sos_requests")
    .select("id, type, state, state_updated_at, tracking_token_hash")
    .eq("id", id)
    .maybeSingle();

  const given = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const stored = Buffer.from(data?.tracking_token_hash ?? "0".repeat(64));
  if (!data || !timingSafeEqual(given, stored)) return notFound();

  return NextResponse.json(
    { id: data.id, type: data.type, state: data.state, state_updated_at: data.state_updated_at },
    { headers: { "Cache-Control": "no-store" } },
  );
}
