import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Shared helpers for database and API tests. Requires local Supabase with seed data. */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const APP_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Seeded demo accounts (supabase/seed.sql). Test values only. */
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Bakunawa-demo-2026";
export const USERS = {
  citizen: { id: "11111111-1111-4111-8111-111111111111", email: "citizen@bakunawa.test" },
  citizen2: { id: "22222222-2222-4222-8222-222222222222", email: "citizen2@bakunawa.test" },
  moderator: { id: "33333333-3333-4333-8333-333333333333", email: "moderator@bakunawa.test" },
  responder: { id: "44444444-4444-4444-8444-444444444444", email: "responder@bakunawa.test" },
  admin: { id: "55555555-5555-4555-8555-555555555555", email: "admin@bakunawa.test" },
} as const;
export type DemoUser = keyof typeof USERS;

const noPersist = { auth: { persistSession: false, autoRefreshToken: false } };

/** Anonymous (Visitor) client. */
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, noPersist);
}

/** Client signed in as a demo user, plus its access token for API calls. */
export async function userClient(who: DemoUser) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email: USERS[who].email, password: DEMO_PASSWORD });
  if (error || !data.session) throw new Error(`sign-in failed for ${who}: ${error?.message}`);
  return { client, token: data.session.access_token };
}

/** Service-role client for test setup and cleanup only. */
export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, noPersist);
}

export async function api(path: string, init: RequestInit & { token?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.json !== undefined) headers.set("Content-Type", "application/json");
  const res = await fetch(`${APP_URL}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  let body: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

/** Clear rate-limit history for a subject so tests start from zero. */
export async function resetRateLimit(subject: string) {
  await serviceClient().from("rate_limit_events").delete().eq("subject", subject);
}
