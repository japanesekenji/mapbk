"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";

export type PlaceResult = { label: string; lat: number; lng: number; bbox?: [number, number, number, number] };

/** Barangay / city search (FR-010). Debounced 400 ms, calls /api/geocode (research R10). */
export function PlaceSearch({
  onPick,
  placeholder = "Search barangay or city",
  className = "",
  inputClassName = "",
  leading,
  trailing,
}: {
  onPick: (r: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shown = q.trim().length >= 2 ? results : [];

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
        const json = (await res.json()) as { results: PlaceResult[]; degraded?: boolean };
        setResults(json.results ?? []);
        setDegraded(!!json.degraded);
        setOpen(true);
      } catch {
        setDegraded(true);
      }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [q]);

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center gap-2 ${inputClassName}`}>
        {leading ?? <Icon name="search" size={18} color="#627266" />}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => shown.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-body outline-none placeholder:text-muted"
        />
        {trailing}
      </div>
      {open && q.trim().length >= 2 && (shown.length > 0 || degraded) && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-control"
        >
          {degraded && shown.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-text-2">Search is unavailable right now. Pan the map instead.</li>
          )}
          {shown.map((r) => (
            <li key={`${r.lat},${r.lng},${r.label}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(r);
                  setQ(r.label.split(",")[0] ?? r.label);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13.5px] text-body hover:bg-hover"
              >
                <Icon name="pin" size={16} color="#1b5e32" />
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
