"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { clampBounds, type Bounds } from "@/lib/geo";
import { rangeStart, type TimeRange } from "@/lib/time";
import type { FacilityRow, IncidentPublic, IncidentSummary, SosPin } from "@/lib/types";

type State = {
  incidents: IncidentPublic[];
  facilities: FacilityRow[];
  sos: SosPin[];
  summary: IncidentSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
};

/**
 * Loads incidents, facilities and the severity summary for the visible area and time range
 * (FR-006, FR-009, FR-011). Bounds changes are debounced 300 ms; stale responses are dropped.
 */
export function useMapData(bounds: Bounds | null, range: TimeRange, withSos = false) {
  const [state, setState] = useState<State>({
    incidents: [],
    facilities: [],
    sos: [],
    summary: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!bounds) return;
    const id = ++seq.current;
    const b = clampBounds(bounds);
    const args = { min_lng: b.minLng, min_lat: b.minLat, max_lng: b.maxLng, max_lat: b.maxLat };
    const since = rangeStart(range);
    const supabase = getBrowserClient();
    setState((s) => ({ ...s, loading: true }));
    const [inc, fac, sum, sos] = await Promise.all([
      supabase.rpc("incidents_in_bbox", { ...args, since }),
      supabase.rpc("facilities_in_bbox", args),
      supabase.rpc("incident_summary", { ...args, since }),
      // Only requested for responders and admins; the database refuses everyone else.
      withSos ? supabase.rpc("sos_in_bbox", args) : Promise.resolve({ data: [] as SosPin[], error: null }),
    ]);
    if (id !== seq.current) return;
    const error = inc.error?.message ?? fac.error?.message ?? sum.error?.message ?? null;
    setState((s) => ({
      incidents: inc.data ?? s.incidents,
      facilities: fac.data ?? s.facilities,
      sos: (sos.data as SosPin[] | null) ?? [],
      summary: (sum.data as IncidentSummary | null) ?? s.summary,
      loading: false,
      error,
      lastUpdated: error ? s.lastUpdated : Date.now(),
    }));
  }, [bounds, range, withSos]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  return { ...state, reload: load };
}
