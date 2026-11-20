"use client";

import { useEffect, useState } from "react";
import { TIME_RANGES, type TimeRange } from "@/lib/time";
import { PlaceSearch, type PlaceResult } from "./PlaceSearch";

/** Filter bar above the map (T035): place search, time range, live indicator (FR-009, FR-012). */
export function FilterBar({
  range,
  onRange,
  onPlace,
  lastUpdated,
}: {
  range: TimeRange;
  onRange: (r: TimeRange) => void;
  onPlace: (r: PlaceResult) => void;
  lastUpdated: number | null;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-3">
      <PlaceSearch
        onPick={onPlace}
        className="max-w-[300px] flex-1"
        inputClassName="h-11 rounded-xl border border-line bg-white px-3"
      />
      <TimeRangeTabs range={range} onRange={onRange} />
      <LiveIndicator lastUpdated={lastUpdated} />
    </div>
  );
}

export function TimeRangeTabs({ range, onRange }: { range: TimeRange; onRange: (r: TimeRange) => void }) {
  return (
    <div role="radiogroup" aria-label="Time range" className="flex h-11 items-center rounded-xl border border-line bg-white p-[3px]">
      {TIME_RANGES.map((t) => {
        const active = t.key === range;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onRange(t.key)}
            className={`h-full whitespace-nowrap rounded-[9px] px-3 text-[13.5px] font-semibold ${
              active ? "bg-green-tint text-green" : "text-text-3 hover:bg-hover"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function LiveIndicator({ lastUpdated }: { lastUpdated: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const mins = lastUpdated ? Math.max(0, Math.floor((now - lastUpdated) / 60_000)) : null;
  return (
    <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-[13px] text-text-2" aria-live="polite">
      <span className="h-2 w-2 rounded-full bg-live shadow-[0_0_0_4px_#d5ecd9]" aria-hidden />
      Live · {mins === null ? "loading" : mins < 1 ? "just now" : `${mins} min ago`}
    </span>
  );
}
