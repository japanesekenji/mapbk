"use client";

import { Icon } from "@/components/icons/Icon";
import { ALL_LAYERS } from "@/lib/taxonomy";
import { TIME_RANGES, type TimeRange } from "@/lib/time";

export type StatusFilter = "all" | "verified" | "pending" | "resolved";
export type ListFilters = { q: string; status: StatusFilter; category: string; range: TimeRange | "all" };

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
];

const CATEGORIES = ALL_LAYERS.filter((l) => l.kind === "incident");

/** T084: search, status segments, category and time dropdowns, sort label (handoff 1b). */
export function ListToolbar({ value, onChange }: { value: ListFilters; onChange: (v: ListFilters) => void }) {
  const select = "h-11 rounded-xl border border-line bg-white px-3 text-[14px] font-semibold text-text-3";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-white px-3 md:w-[340px]">
        <Icon name="search" size={18} color="#7a8a7f" />
        <input
          type="search"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          placeholder="Search by location or keyword"
          aria-label="Search by location or keyword"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted"
        />
      </label>
      <div role="radiogroup" aria-label="Status" className="flex h-11 items-center rounded-xl border border-line bg-white p-[3px]">
        {STATUS_TABS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={value.status === s.key}
            onClick={() => onChange({ ...value, status: s.key })}
            className={`h-full rounded-[9px] px-3 text-[13.5px] font-semibold ${
              value.status === s.key ? "bg-green-tint text-green" : "text-text-3 hover:bg-hover"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <select aria-label="Category" value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} className={select}>
        <option value="all">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <select
        aria-label="Time range"
        value={value.range}
        onChange={(e) => onChange({ ...value, range: e.target.value as ListFilters["range"] })}
        className={select}
      >
        {TIME_RANGES.map((t) => (
          <option key={t.key} value={t.key}>{t.key === "1h" ? "Last hour" : `Last ${t.label}`}</option>
        ))}
        <option value="all">All time</option>
      </select>
      <span className="ml-auto hidden text-[13.5px] text-text-2 md:inline">Sort: Newest</span>
    </div>
  );
}
