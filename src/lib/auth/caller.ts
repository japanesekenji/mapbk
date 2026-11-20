import "server-only";

import type { NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import type { AppRole } from "@/lib/taxonomy";

export type Caller = { id: string; role: AppRole; phone: string | null; display_name: string };

/**
 * The signed-in caller of a route handler, from the session cookie or an
 * `Authorization: Bearer <access token>` header (API clients and tests). Null for Visitors.
 */
export async function getRequestCaller(req: NextRequest): Promise<Caller | null> {
  const auth = req.headers.get("authorization");
  let userId: string | null = null;

  if (auth?.startsWith("Bearer ")) {
    const { data } = await getServiceClient().auth.getUser(auth.slice(7));
    userId = data.user?.id ?? null;
  } else {
    const supabase = await getServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }
  if (!userId) return null;

  const { data: profile } = await getServiceClient()
    .from("profiles")
    .select("id, role, phone, display_name")
    .eq("id", userId)
    .single();
  return profile ?? null;
}
