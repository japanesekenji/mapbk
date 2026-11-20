"use client";

import { useCallback, useEffect, useState } from "react";
import { FacilityRow, type FacilityListItem } from "@/components/facilities/FacilityRow";
import { Icon } from "@/components/icons/Icon";
import { EmptyState, ErrorState, LoadingRows } from "@/components/layout/States";
import { DEFAULT_VIEW, directionsUrl, type LatLng } from "@/lib/geo";
import { getBrowserClient } from "@/lib/supabase/browser";
import { FACILITY_META, type FacilityType } from "@/lib/taxonomy";

const FILTERS: (FacilityType | "all")[] = ["all", "evacuation_center", "hospital", "police_station", "fire_station", "rescue_station", "relief_center"];

/**
 * T077: nearest facilities first (FR-038). Uses the device location, falling back to Metro
 * Manila when location is denied. SC-005: nearest open evacuation center in 3 taps or fewer.
 */
export default function FacilitiesPage() {
  const [origin, setOrigin] = useState<{ p: LatLng; source: "gps" | "default" } | null>(null);
  const [filter, setFilter] = useState<FacilityType | "all">("all");
  const [rows, setRows] = useState<FacilityListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrigin({ p: DEFAULT_VIEW, source: "default" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ p: { lat: pos.coords.latitude, lng: pos.coords.longitude }, source: "gps" }),
      () => setOrigin({ p: DEFAULT_VIEW, source: "default" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  const load = useCallback(async () => {
    if (!origin) return;
    const { data, error } = await getBrowserClient().rpc("facilities_near", {
      lat: origin.p.lat,
      lng: origin.p.lng,
      radius_km: 50,
      types: filter === "all" ? undefined : [filter],
      max_results: 50,
    });
    if (error) setError(error.message);
    else {
      setError(null);
      setRows(data ?? []);
    }
  }, [origin, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const nearestOpenEvac = rows?.find((r) => r.type === "evacuation_center" && r.status === "open");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 md:py-8">
        <div>
          <h1 className="font-display text-[30px] font-extrabold text-ink">Emergency facilities</h1>
          <p className="text-[14px] text-text-2">
            {origin?.source === "gps"
              ? "Nearest to you first."
              : origin
                ? "Location is off, so distances are from central Metro Manila."
                : "Finding your location…"}
          </p>
        </div>

        {nearestOpenEvac && filter === "all" && (
          <a
            href={directionsUrl(nearestOpenEvac)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-[18px] bg-green p-4 text-white"
          >
            <Icon name="home" size={26} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold uppercase tracking-[.07em] opacity-80">Nearest open evacuation center</span>
              <span className="block truncate text-[16px] font-bold">
                {nearestOpenEvac.name} · {nearestOpenEvac.distance_km?.toFixed(1)} km
              </span>
            </span>
            <Icon name="arrow" size={22} />
          </a>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Facility type">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              onClick={() => setFilter(f)}
              className={`h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-semibold ${
                filter === f ? "bg-green text-white" : "border border-line bg-white text-text-3"
              }`}
            >
              {f === "all" ? "All" : FACILITY_META[f].plural}
            </button>
          ))}
        </div>

        {error && <ErrorState message="Could not load facilities." onRetry={() => void load()} />}
        {!rows ? (
          <LoadingRows rows={5} label="Loading facilities" />
        ) : rows.length === 0 ? (
          <EmptyState title="No facilities nearby" body="Try another type or check back later." />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((f) => (
              <FacilityRow key={f.id} f={f} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
