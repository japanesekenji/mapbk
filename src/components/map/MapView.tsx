"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Map as MlMap, Marker, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Point, Polygon } from "geojson";
import { Icon, type IconName } from "@/components/icons/Icon";
import { DEFAULT_VIEW, type Bounds, type LatLng } from "@/lib/geo";
import { BASE_STYLE_URL, applyPalette } from "./style";
import { createPinElement, createUserDot, setPinSelected } from "./pin";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  icon: IconName;
  label: string;
};

export type MapArea = { id: string; color: string; geometry: Polygon };

export type MapViewHandle = {
  flyTo: (p: LatLng, zoom?: number) => void;
  fitBounds: (bbox: [number, number, number, number]) => void;
  getBounds: () => Bounds | null;
};

type Props = {
  points: MapPoint[];
  areas?: MapArea[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBoundsChange: (b: Bounds) => void;
  userLocation?: LatLng | null;
  onLocate?: () => void;
  /** Hide built-in zoom and locate buttons (mobile places its own). */
  controls?: "full" | "zoom-only" | "none";
  className?: string;
};

/**
 * MapLibre map (T032): clustered pins for points (FR-013), outlined polygons for affected areas
 * (FR-014), bounds reported on move so the page loads only the visible area (FR-006).
 */
export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { points, areas = [], selectedId, onSelect, onBoundsChange, userLocation, onLocate, controls = "full", className },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLElement; key: string }>());
  const userMarker = useRef<Marker | null>(null);
  const pointIndex = useRef(new Map<string, MapPoint>());
  const latest = useRef({ onSelect, onBoundsChange, selectedId });
  latest.current = { onSelect, onBoundsChange, selectedId };

  useImperativeHandle(ref, () => ({
    flyTo: (p, zoom) => map.current?.flyTo({ center: [p.lng, p.lat], zoom: zoom ?? Math.max(map.current.getZoom(), 14) }),
    fitBounds: (b) => map.current?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40, maxZoom: 15 }),
    getBounds: () => (map.current ? toBounds(map.current) : null),
  }));

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    // Worker files are copied to public/ by scripts/copy-maplibre-worker.mjs.
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    const m = new MlMap({
      container: container.current,
      style: BASE_STYLE_URL,
      center: [DEFAULT_VIEW.lng, DEFAULT_VIEW.lat],
      zoom: DEFAULT_VIEW.zoom,
      minZoom: 5,
      maxBounds: [
        [112, 2],
        [131, 23],
      ],
      attributionControl: { compact: true },
    });
    map.current = m;
    const markerStore = markers.current;

    // style.load fires once the style JSON is in, before tiles and label fonts. Adding our
    // sources here lets pins appear without waiting for the basemap (SC-004 on slow networks).
    m.once("style.load", () => {
      applyPalette(m);
      m.addSource("areas", { type: "geojson", data: emptyFc() });
      m.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        paint: { "fill-color": ["get", "color"], "fill-opacity": 0.15 },
      });
      m.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        paint: { "line-color": ["get", "color"], "line-width": 1.5, "line-opacity": 0.6 },
      });
      m.addSource("points", { type: "geojson", data: emptyFc(), cluster: true, clusterRadius: 46, clusterMaxZoom: 13 });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1b5e32",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 30, 28],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "points",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": "#ffffff" },
      });
      // Invisible layer so querySourceFeatures returns unclustered points to draw as HTML pins.
      m.addLayer({
        id: "points-raw",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 1, "circle-opacity": 0 },
      });

      m.on("click", "clusters", async (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const src = m.getSource("points") as GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
        m.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom });
      });
      m.on("mouseenter", "clusters", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "clusters", () => (m.getCanvas().style.cursor = ""));
      m.on("click", "areas-fill", (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) latest.current.onSelect(id);
      });

      setData(m, pointIndex.current, areasRef.current);
      latest.current.onBoundsChange(toBounds(m));
    });

    m.on("moveend", () => latest.current.onBoundsChange(toBounds(m)));
    m.on("render", () => syncMarkers(m, pointIndex.current, markerStore, latest));

    return () => {
      markerStore.forEach(({ marker }) => marker.remove());
      markerStore.clear();
      m.remove();
      map.current = null;
    };
  }, []);

  const areasRef = useRef(areas);
  areasRef.current = areas;

  // Push data changes into the sources.
  useEffect(() => {
    pointIndex.current = new Map(points.map((p) => [p.id, p]));
    const m = map.current;
    // Only the source must exist; isStyleLoaded() stays false while basemap tiles load.
    if (m?.getSource("points")) setData(m, pointIndex.current, areas);
  }, [points, areas]);

  // Selection highlight.
  useEffect(() => {
    markers.current.forEach(({ el }, id) => setPinSelected(el, id === selectedId));
  }, [selectedId]);

  // User location dot.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!userLocation) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    const dot = userMarker.current ?? new Marker({ element: createUserDot() });
    userMarker.current = dot;
    dot.setLngLat([userLocation.lng, userLocation.lat]).addTo(m);
  }, [userLocation]);

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      {/* Inline style: maplibre-gl.css sets position:relative on the container class. */}
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      {controls !== "none" && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-control">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => map.current?.zoomIn()}
              className="flex h-11 w-11 items-center justify-center text-text-3 hover:bg-hover"
            >
              <Icon name="plus" size={20} />
            </button>
            <span className="h-px bg-divider" />
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => map.current?.zoomOut()}
              className="flex h-11 w-11 items-center justify-center text-text-3 hover:bg-hover"
            >
              <Icon name="minus" size={20} />
            </button>
          </div>
          {controls === "full" && onLocate && (
            <button
              type="button"
              aria-label="Show my location"
              onClick={onLocate}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-green shadow-control hover:bg-hover"
            >
              <Icon name="locate" size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

function emptyFc(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function toBounds(m: MlMap): Bounds {
  const b = m.getBounds();
  return { minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() };
}

function setData(m: MlMap, points: Map<string, MapPoint>, areas: MapArea[]) {
  (m.getSource("points") as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: [...points.values()].map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id },
    })),
  });
  (m.getSource("areas") as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features: areas.map((a) => ({ type: "Feature", geometry: a.geometry, properties: { id: a.id, color: a.color } })),
  });
}

let syncQueued = false;

/** Keep one HTML pin per visible unclustered point (MapLibre's HTML-marker clustering pattern). */
function syncMarkers(
  m: MlMap,
  points: Map<string, MapPoint>,
  store: Map<string, { marker: Marker; el: HTMLElement; key: string }>,
  latest: React.RefObject<{ onSelect: (id: string | null) => void; selectedId: string | null }>,
) {
  if (syncQueued || !m.getSource("points") || !m.isSourceLoaded("points")) return;
  syncQueued = true;
  requestAnimationFrame(() => {
    syncQueued = false;
    const visible = new Set<string>();
    for (const f of m.querySourceFeatures("points")) {
      if (f.properties?.cluster) continue;
      const id = f.properties?.id as string;
      const p = points.get(id);
      if (!p || visible.has(id)) continue;
      visible.add(id);
      const key = `${p.color}|${p.icon}|${p.lat}|${p.lng}`;
      const existing = store.get(id);
      if (existing && existing.key === key) continue;
      existing?.marker.remove();
      const el = createPinElement({ color: p.color, icon: p.icon, label: p.label });
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        latest.current?.onSelect(id);
      });
      setPinSelected(el, latest.current?.selectedId === id);
      const marker = new Marker({ element: el, anchor: "bottom", offset: [0, 4] })
        .setLngLat([p.lng, p.lat])
        .addTo(m);
      store.set(id, { marker, el, key });
    }
    for (const [id, { marker }] of store) {
      if (!visible.has(id)) {
        marker.remove();
        store.delete(id);
      }
    }
  });
}
