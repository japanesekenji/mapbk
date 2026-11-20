import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Server Supabase client bound to the caller's session cookie. Queries run with the caller's
 * role, so RLS applies exactly as it does in the browser.
 */
export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only. proxy.ts refreshes them.
          }
        },
      },
    },
  );
}

/** The signed-in user's id and role, or null for a Visitor. */
export async function getCaller() {
  const supabase = await getServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, phone, display_name")
    .eq("id", data.user.id)
    .single();
  return profile ? { ...profile, email: data.user.email ?? null } : null;
}
