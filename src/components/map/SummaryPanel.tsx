"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { StatusChip } from "@/components/incidents/StatusChip";
import { LoadingRows } from "@/components/layout/States";
import { CATEGORY_ICON, SEVERITY_META, type Severity } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/time";
import type { IncidentPublic, IncidentSummary } from "@/lib/types";

const ORDER: Severity[] = ["critical", "high", "moderate", "low"];

/** Right panel (T038, handoff 1a): active total, severity bars, recent reports. */
export function SummaryPanel({
  summary,
  recent,
  onPick,
  loading,
}: {
  summary: IncidentSummary | null;
  recent: IncidentPublic[];
  onPick: (id: string) => void;
  loading: boolean;
}) {
  const max = Math.max(1, ...ORDER.map((s) => summary?.[s] ?? 0));
  return (
    <aside className="flex w-[330px] shrink-0 flex-col gap-4 overflow-y-auto">
      <section className="rounded-[20px] border border-line bg-white p-5">
        <h2 className="text-[13px] font-semibold text-text-3">Active incidents in view</h2>
        <p className="font-display text-[76px] font-extrabold leading-none tracking-[-.02em] text-green">
          {summary ? summary.total : "–"}
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {ORDER.map((s) => {
            const n = summary?.[s] ?? 0;
            return (
              <li key={s} className="flex items-center gap-2.5 text-[13.5px] text-text-4">
                <span className="h-[9px] w-[9px] rounded-full" style={{ background: SEVERITY_META[s].color }} aria-hidden />
                <span className="w-[74px]">{SEVERITY_META[s].label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-divider">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(n / max) * 100}%`, background: SEVERITY_META[s].color }}
                  />
                </span>
                <span className="w-7 text-right font-semibold">{n}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="rounded-[20px] border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[17px] font-bold text-ink">Recent reports</h2>
          <Link href="/incidents" className="text-[13px] font-semibold text-green hover:underline">
            View all →
          </Link>
        </div>
        {loading && recent.length === 0 ? (
          <LoadingRows rows={4} label="Loading recent reports" />
        ) : recent.length === 0 ? (
          <p className="py-4 text-[13.5px] text-text-2">No reports in this area and time range.</p>
        ) : (
          <ul className="flex flex-col">
            {recent.map((i) => {
              const color = SEVERITY_META[i.severity].color;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onPick(i.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left hover:bg-hover"
                  >
                    <span
                      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${color}1f`, color }}
                    >
                      <Icon name={CATEGORY_ICON[i.category_id] ?? "alert"} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-ink">{i.title}</span>
                      <span className="block truncate text-[12.5px] text-text-2">
                        {i.place_name} · {timeAgo(i.reported_at)}
                      </span>
                    </span>
                    <StatusChip status={i.status} compact />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </aside>
  );
}
