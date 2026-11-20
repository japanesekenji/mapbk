"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { ErrorState } from "@/components/layout/States";
import { canSeeSos, useProfile } from "@/lib/auth/useProfile";
import { distanceKm, formatDistance, type Bounds, type LatLng } from "@/lib/geo";
import { useLiveRefresh } from "@/lib/realtime";
import {
  ALL_LAYERS,
  CATEGORY_ICON,
  FACILITY_COLOR,
  FACILITY_LAYER,
  FACILITY_META,
  LAYER_GROUPS,
  SEVERITY_META,
  type LayerId,
} from "@/lib/taxonomy";
import type { TimeRange } from "@/lib/time";
import type { Selection } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { LayerPanel } from "./LayerPanel";
import { MapView, type MapArea, type MapPoint, type MapViewHandle } from "./MapView";
import { PlaceSearch } from "./PlaceSearch";
import { SelectionDetail, type CorroborationProps } from "./SelectionDetail";
import { SummaryPanel } from "./SummaryPanel";
import { useMapData } from "./useMapData";
import type { Polygon } from "geojson";

const DEFAULT_LAYERS: Record<LayerId, boolean> = Object.fromEntries(
  ALL_LAYERS.map((l) => [l.id, l.kind !== "sos"]),
);

type Chip = "all" | "hazards" | "facilities" | "response";

/**
 * Map screen (T039): desktop three-column layout (handoff 1a) and full-bleed mobile layout
 * (handoff 1c) sharing one map instance.
 */
export function MapScreen({
  extraPoints = [],
  corroborationFor,
}: {
  /** Extra pins (responder SOS layer), already filtered by role. */
  extraPoints?: MapPoint[];
  /** Corroboration state and action for the selected incident (wired in US4). */
  corroborationFor?: (incidentId: string) => CorroborationProps | undefined;
}) {
  const params = useSearchParams();
  const { profile } = useProfile();
  const mapRef = useRef<MapViewHandle>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [range, setRange] = useState<TimeRange>("24h");
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [chip, setChip] = useState<Chip>("all");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const s = params.get("select");
    return s ? `i:${s}` : null;
  });
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);

  const data = useMapData(bounds, range);
  useLiveRefresh("incidents", data.reload);

  const sosAllowed = canSeeSos(profile?.role);

  const { points, areas, counts } = useMemo(() => {
    const counts: Record<LayerId, number> = {};
    const points: MapPoint[] = [];
    const areas: MapArea[] = [];
    for (const i of data.incidents) {
      counts[i.category_id] = (counts[i.category_id] ?? 0) + 1;
      if (!layers[i.category_id]) continue;
      const color = SEVERITY_META[i.severity].color;
      if (i.area_geojson) areas.push({ id: `i:${i.id}`, color, geometry: i.area_geojson as unknown as Polygon });
      if (i.lat == null || i.lng == null) continue;
      points.push({
        id: `i:${i.id}`,
        lat: i.lat,
        lng: i.lng,
        color,
        icon: CATEGORY_ICON[i.category_id] ?? "alert",
        label: `${i.title}, ${i.status}`,
      });
    }
    for (const f of data.facilities) {
      const layer = FACILITY_LAYER[f.type];
      counts[layer] = (counts[layer] ?? 0) + 1;
      if (!layers[layer]) continue;
      points.push({
        id: `f:${f.id}`,
        lat: f.lat,
        lng: f.lng,
        color: FACILITY_COLOR,
        icon: FACILITY_META[f.type].icon,
        label: `${f.name}, ${f.status}`,
      });
    }
    if (layers.sos && sosAllowed) points.push(...extraPoints);
    return { points, areas, counts };
  }, [data.incidents, data.facilities, layers, extraPoints, sosAllowed]);

  const selection: Selection | null = useMemo(() => {
    if (!selectedId) return null;
    const [kind, id] = [selectedId.slice(0, 1), selectedId.slice(2)];
    if (kind === "i") {
      const item = data.incidents.find((x) => x.id === id);
      return item ? { kind: "incident", item } : null;
    }
    if (kind === "f") {
      const item = data.facilities.find((x) => x.id === id);
      return item ? { kind: "facility", item } : null;
    }
    return null;
  }, [selectedId, data.incidents, data.facilities]);

  const selectionDistance = useMemo(() => {
    if (!selection || !userLocation) return undefined;
    const p = { lat: selection.item.lat ?? 0, lng: selection.item.lng ?? 0 };
    return formatDistance(distanceKm(userLocation, p));
  }, [selection, userLocation]);

  const pick = useCallback((id: string | null) => setSelectedId(id), []);

  // A link with ?select=<id> (for example after submitting a report) centers that incident once.
  const flewToParam = useRef(false);
  useEffect(() => {
    if (flewToParam.current || !params.get("select") || selection?.kind !== "incident") return;
    const { lat, lng } = selection.item;
    if (lat != null && lng != null) {
      flewToParam.current = true;
      mapRef.current?.flyTo({ lat, lng }, 15);
    }
  }, [selection, params]);

  const pickIncident = useCallback(
    (id: string) => {
      setSelectedId(`i:${id}`);
      const it = data.incidents.find((x) => x.id === id);
      if (it?.lat != null && it.lng != null) mapRef.current?.flyTo({ lat: it.lat, lng: it.lng });
    },
    [data.incidents],
  );

  function locate() {
    setLocateError(null);
    if (!("geolocation" in navigator)) {
      setLocateError("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(p);
        mapRef.current?.flyTo(p, 14);
      },
      () => setLocateError("Location permission was denied. Search for your barangay instead."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function applyChip(c: Chip) {
    setChip(c);
    const groups: Record<Chip, string[]> = {
      all: LAYER_GROUPS.map((g) => g.title),
      hazards: ["Natural hazards", "Human-induced hazards"],
      facilities: ["Emergency facilities"],
      response: ["Community & response"],
    };
    const allowed = new Set(
      LAYER_GROUPS.filter((g) => groups[c].includes(g.title)).flatMap((g) => g.layers.map((l) => l.id)),
    );
    setLayers(Object.fromEntries(ALL_LAYERS.map((l) => [l.id, allowed.has(l.id) && (l.kind !== "sos" || sosAllowed)])));
  }

  const recent = data.incidents.slice(0, 5);
  const corroboration = selection?.kind === "incident" ? corroborationFor?.(selection.item.id) : undefined;

  return (
    <div className="flex min-h-0 flex-1 gap-4 md:p-4">
      <div className="hidden md:flex">
        <LayerPanel
          enabled={layers}
          counts={counts}
          onToggle={(id) => setLayers((l) => ({ ...l, [id]: !l[id] }))}
          canSeeSos={sosAllowed}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="hidden md:block">
          <FilterBar
            range={range}
            onRange={setRange}
            onPlace={(r) => (r.bbox ? mapRef.current?.fitBounds(r.bbox) : mapRef.current?.flyTo(r))}
            lastUpdated={data.lastUpdated}
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden md:rounded-[20px] md:border md:border-line">
          <MapView
            ref={mapRef}
            points={points}
            areas={areas}
            selectedId={selectedId}
            onSelect={pick}
            onBoundsChange={setBounds}
            userLocation={userLocation}
            onLocate={locate}
          />

          {data.error && (
            <div className="absolute left-1/2 top-4 z-20 w-[min(92%,420px)] -translate-x-1/2 rounded-2xl bg-white shadow-card">
              <ErrorState message="Could not load map data." onRetry={() => void data.reload()} />
            </div>
          )}
          {locateError && (
            <p role="alert" className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl bg-white px-4 py-2 text-[13px] text-sos shadow-control">
              {locateError}
            </p>
          )}

          {/* Desktop detail card, bottom-left (handoff 1a). */}
          {selection && (
            <div className="absolute bottom-4 left-4 z-10 hidden w-[452px] rounded-[20px] bg-white p-4 shadow-card md:block">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close details"
                className="absolute right-3 top-3 hidden"
              />
              <SelectionDetail selection={selection} corroboration={corroboration} distanceLabel={selectionDistance} />
            </div>
          )}

          {/* Mobile overlays (handoff 1c). */}
          <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2.5 p-3 md:hidden">
            <PlaceSearch
              onPick={(r) => (r.bbox ? mapRef.current?.fitBounds(r.bbox) : mapRef.current?.flyTo(r))}
              placeholder="Search location"
              inputClassName="h-[52px] rounded-[26px] bg-white px-3 shadow-control"
              leading={<Image src="/brand/bakunawa-mark.png" alt="" width={30} height={29} />}
              trailing={
                <Link href="/profile" aria-label="Profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-green-tint text-green">
                  <Icon name="user" size={18} />
                </Link>
              }
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  ["all", "All layers", "layers"],
                  ["hazards", "Hazards", "alert"],
                  ["facilities", "Facilities", "home"],
                  ["response", "Response", "people"],
                ] as const
              ).map(([k, label, icon]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={chip === k}
                  onClick={() => applyChip(k)}
                  className={`flex h-[38px] shrink-0 items-center gap-1.5 rounded-[19px] px-3.5 text-[13.5px] font-semibold shadow-control ${
                    chip === k ? "bg-green text-white" : "bg-white text-text-3"
                  }`}
                >
                  <Icon name={icon} size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={`absolute inset-x-0 z-10 flex items-end justify-between px-3 md:hidden ${
              selection ? "bottom-[calc(100%-100%)]" : "bottom-3"
            }`}
            style={selection ? { bottom: "var(--sheet-h, 0px)" } : undefined}
          >
            <Link
              href="/sos"
              className="mb-3 flex h-[50px] items-center gap-2 rounded-full bg-sos px-5 text-[16px] font-bold text-white shadow-sos"
            >
              <Icon name="alert" size={20} /> SOS
            </Link>
            <button
              type="button"
              onClick={locate}
              aria-label="Show my location"
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-green shadow-control"
            >
              <Icon name="locate" size={22} />
            </button>
          </div>

          {selection && (
            <MobileSheet onClose={() => setSelectedId(null)}>
              <SelectionDetail selection={selection} corroboration={corroboration} distanceLabel={selectionDistance} />
            </MobileSheet>
          )}
        </div>
      </div>

      <div className="hidden xl:flex">
        <SummaryPanel summary={data.summary} recent={recent} onPick={pickIncident} loading={data.loading} />
      </div>
    </div>
  );
}

/** Mobile bottom sheet (handoff 1c): white, radius 26, 40x4 handle. */
function MobileSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      ref={(el) => {
        if (el) el.parentElement?.style.setProperty("--sheet-h", `${el.offsetHeight}px`);
      }}
      className="absolute inset-x-0 bottom-0 z-20 max-h-[70%] overflow-y-auto rounded-t-[26px] bg-white px-4 pb-4 pt-2.5 shadow-card md:hidden"
    >
      <button type="button" onClick={onClose} aria-label="Close details" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[#dfe6dd]" />
      {children}
    </div>
  );
}
