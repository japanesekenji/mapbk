import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * T089 regression guard: API roles have no write privileges on views and every public table
 * has RLS enabled. Reads the catalog with psql through SUPABASE_DB_URL.
 */
function sql(query: string): string[] {
  const out = execFileSync("psql", [process.env.SUPABASE_DB_URL!, "-At", "-c", query], { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

describe("database privileges", () => {
  it("grants no INSERT/UPDATE/DELETE on views to anon or authenticated", () => {
    const rows = sql(`
      select g.table_name || ':' || g.grantee || ':' || g.privilege_type
      from information_schema.role_table_grants g
      join information_schema.views v on v.table_schema = g.table_schema and v.table_name = g.table_name
      where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
        and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')`);
    expect(rows).toEqual([]);
  });

  it("enables RLS on every public table", () => {
    expect(sql(`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`)).toEqual([]);
  });

  it("pins search_path on every security definer function", () => {
    expect(
      sql(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef and p.proconfig is null`),
    ).toEqual([]);
  });

  it("gives anon no direct write access to SOS requests or incidents", () => {
    const rows = sql(`
      select table_name || ':' || privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon'
        and table_name in ('sos_requests', 'incidents') and privilege_type <> 'SELECT'`);
    expect(rows).toEqual([]);
  });
});
