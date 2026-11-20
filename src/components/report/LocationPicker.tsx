"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MlMap, Marker, setWorkerUrl } from "maplibre-gl";
import { Icon } from "@/components/icons/Icon";
import { BASE_STYLE_URL, applyPalette } from "@/components/map/style";
import { DEFAULT_VIEW, formatCoords, inServiceArea } from "@/lib/geo";

export type PickedLocation = { lat: number; lng: number; accuracy_m?: number; place_name?: string };

/** Poor GPS accuracy threshold (spec edge cases). */
const POOR_ACCURACY_M = 100;

/**
 * T048: GPS capture with accuracy display (FR-016), draggable pin on a mini map, reverse-geocoded
 * place name. Also used by the SOS screen as its manual-pin fallback.
 */
export function LocationPicker({
  value,
  onChange,
  accent = "#c8362b",
  autoLocate = true,
}: {
  value: PickedLocation | null;
  onChange: (v: PickedLocation | null) => void;
  accent?: string;
  autoLocate?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "ok">("idle");
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  async function lookupPlace(lat: number, lng: number) {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const json = (await res.json()) as { label: string | null };
      return json.label ?? undefined;
    } catch {
      return undefined;
    }
  }

  async function setPoint(lat: number, lng: number, accuracy_m?: number) {
    onChange({ lat, lng, accuracy_m, place_name: latest.current?.place_name });
    const place_name = await lookupPlace(lat, lng);
    onChange({ lat, lng, accuracy_m, place_name });
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("ok");
        void setPoint(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy));
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  // Map with a draggable pin.
  useEffect(() => {
    if (!container.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const start = latest.current ?? DEFAULT_VIEW;
    const m = new MlMap({
      container: container.current,
      style: BASE_STYLE_URL,
      center: [start.lng, start.lat],
      zoom: latest.current ? 15 : 11,
      attributionControl: false,
      interactive: true,
    });
    map.current = m;
    m.on("load", () => applyPalette(m));
    const el = document.createElement("span");
    el.innerHTML = `<svg width="34" height="42" viewBox="0 0 34 42" aria-hidden="true"><path d="M17 41s15-14.5 15-24A15 15 0 0 0 2 17c0 9.5 15 24 15 24z" fill="${accent}" stroke="#fff" stroke-width="3"/><circle cx="17" cy="17" r="5" fill="#fff"/></svg>`;
    const mk = new Marker({ element: el, anchor: "bottom", draggable: false }).setLngLat([start.lng, start.lat]);
    if (latest.current) mk.addTo(m);
    mk.on("dragend", () => {
      const p = mk.getLngLat();
      void setPoint(p.lat, p.lng, undefined);
    });
    m.on("click", (e) => {
      if (!mk.isDraggable()) return;
      mk.setLngLat(e.lngLat);
      void setPoint(e.lngLat.lat, e.lngLat.lng, undefined);
    });
    marker.current = mk;
    if (autoLocate && !latest.current) locate();
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin and view in sync with the value.
  useEffect(() => {
    const m = map.current;
    const mk = marker.current;
    if (!m || !mk || !value) return;
    mk.setLngLat([value.lng, value.lat]).addTo(m);
    if (!adjusting) m.jumpTo({ center: [value.lng, value.lat], zoom: Math.max(m.getZoom(), 15) });
  }, [value, adjusting]);

  useEffect(() => {
    marker.current?.setDraggable(adjusting);
  }, [adjusting]);

  const outside = value ? !inServiceArea(value) : false;
  const poor = (value?.accuracy_m ?? 0) > POOR_ACCURACY_M;

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white">
      <div className="relative h-[150px]">
        <div ref={container} style={{ position: "absolute", inset: 0 }} />
        {adjusting && (
          <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-text-3 shadow-control">
            Drag the pin or tap the map
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-tint text-green">
          <Icon name="pin" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            {value?.place_name ?? (value ? formatCoords(value) : status === "locating" ? "Finding your location…" : "No location yet")}
          </p>
          <p className={`text-[12.5px] ${poor || outside ? "text-[#7a5600]" : "text-text-2"}`}>
            {status === "denied" && !value
              ? "Location is off. Tap Adjust pin to place it on the map."
              : outside
                ? "This spot is outside the Philippines service area."
                : value?.accuracy_m != null
                  ? `GPS ${poor ? "weak" : "locked"} · ±${value.accuracy_m} m${poor ? ". Adjust the pin if needed." : ""}`
                  : value
                    ? "Pin placed manually"
                    : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => {
              if (!value && map.current) {
                const c = map.current.getCenter();
                void setPoint(c.lat, c.lng, undefined);
              }
              setAdjusting((a) => !a);
            }}
            className="text-[13px] font-semibold text-green"
          >
            {adjusting ? "Done" : "Adjust pin"}
          </button>
          {status !== "locating" && (
            <button type="button" onClick={locate} className="text-[12px] font-semibold text-text-2">
              Use GPS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
