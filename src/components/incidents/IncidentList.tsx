"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IncidentCardMobile, IncidentTable } from "@/components/incidents/IncidentTable";
import { ListToolbar, type ListFilters, type StatusFilter } from "@/components/incidents/ListToolbar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/layout/States";
import { useLiveRefresh } from "@/lib/realtime";
import { getBrowserClient } from "@/lib/supabase/browser";
import { rangeStart, type TimeRange } from "@/lib/time";
import type { IncidentPublic } from "@/lib/types";

const PAGE_SIZE = 11;
const DEFAULTS: ListFilters = { q: "", status: "all", category: "all", range: "24h" };

/** T085: incident list with filters in the URL, pagination, empty state and live refresh (FR-041). */
export function IncidentList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters: ListFilters = useMemo(
    () => ({
      q: params.get("q") ?? DEFAULTS.q,
      status: (params.get("status") as StatusFilter) ?? DEFAULTS.status,
      category: params.get("category") ?? DEFAULTS.category,
      range: (params.get("range") as TimeRange | "all") ?? DEFAULTS.range,
    }),
    [params],
  );
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const [q, setQ] = useState(filters.q);
  const [data, setData] = useState<{ rows: IncidentPublic[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setParams = useCallback(
    (next: Partial<ListFilters> & { page?: number }) => {
      const merged = { ...filters, ...next };
      const sp = new URLSearchParams();
      if (merged.q) sp.set("q", merged.q);
      if (merged.status !== DEFAULTS.status) sp.set("status", merged.status);
      if (merged.category !== DEFAULTS.category) sp.set("category", merged.category);
      if (merged.range !== DEFAULTS.range) sp.set("range", merged.range);
      const p = next.page ?? 1;
      if (p > 1) sp.set("page", String(p));
      router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
    },
    [filters, pathname, router],
  );

  // Debounce typing into the URL.
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => setParams({ q }), 350);
    return () => clearTimeout(t);
  }, [q, filters.q, setParams]);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient().rpc("list_incidents", {
      q: filters.q || undefined,
      statuses: filters.status === "all" ? undefined : [filters.status],
      category_ids: filters.category === "all" ? undefined : [filters.category],
      since: filters.range === "all" ? undefined : rangeStart(filters.range),
      page,
      page_size: PAGE_SIZE,
    });
    if (error) setError(error.message);
    else {
      setError(null);
      setData(data as { rows: IncidentPublic[]; total: number });
    }
  }, [filters, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useLiveRefresh("incidents", load);

  const total = data?.total ?? 0;
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = filters.q || filters.status !== "all" || filters.category !== "all" || filters.range !== DEFAULTS.range;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[1376px] flex-col gap-5 px-4 py-5 md:px-8 md:pb-6 md:pt-7">
        <div>
          <h1 className="font-display text-[30px] font-extrabold text-ink md:text-[32px]">
            <span className="md:hidden">Incidents</span>
            <span className="hidden md:inline">Incident list</span>
          </h1>
          <p className="text-[14px] text-text-2">
            Recent reports with verification and resolution status.{data ? ` ${total} ${total === 1 ? "match" : "matches"}.` : ""}
          </p>
        </div>

        <ListToolbar value={{ ...filters, q }} onChange={(v) => (v.q !== q ? setQ(v.q) : setParams(v))} />

        {error && <ErrorState message="Could not load incidents." onRetry={() => void load()} />}

        {!data ? (
          <div className="rounded-[20px] border border-line bg-white p-5"><LoadingRows rows={6} /></div>
        ) : data.rows.length === 0 ? (
          <div className="rounded-[20px] border border-line bg-white">
            <EmptyState
              title="No incidents match"
              body="Try a different search, status or time range."
              action={
                filtered ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      router.replace(pathname);
                    }}
                    className="mt-1 h-10 rounded-xl border-[1.5px] border-green px-4 text-[14px] font-semibold text-green"
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-[20px] border border-line bg-white md:block">
              <div className="min-w-[960px]">
                <IncidentTable rows={data.rows} />
              </div>
            </div>
            <ul className="flex flex-col gap-2.5 md:hidden">
              {data.rows.map((r) => (
                <li key={r.id}><IncidentCardMobile r={r} /></li>
              ))}
            </ul>
          </>
        )}

        {data && total > 0 && (
          <nav aria-label="Pagination" className="flex items-center justify-between text-[13.5px] text-text-2">
            <span>
              Showing {from}–{to} of {total}
            </span>
            <span className="flex gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => (
                  <span key={p} className="flex gap-1">
                    {i > 0 && p - arr[i - 1]! > 1 && <span className="px-1">…</span>}
                    <button
                      type="button"
                      aria-current={p === page ? "page" : undefined}
                      onClick={() => setParams({ page: p })}
                      className={`h-8 w-8 rounded-lg text-[13.5px] font-semibold ${
                        p === page ? "bg-green text-white" : "border border-line bg-white text-text-3"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </span>
          </nav>
        )}
      </div>
    </div>
  );
}
