/** Philippine service area used to validate every location (data-model.md incidents.location). */
export const SERVICE_AREA = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 } as const;

/** Default map view: Metro Manila, matching the design handoff. */
export const DEFAULT_VIEW = { lat: 14.5995, lng: 121.0365, zoom: 11.2 } as const;

export type LatLng = { lat: number; lng: number };
export type Bounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };

export function inServiceArea({ lat, lng }: LatLng): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= SERVICE_AREA.minLat &&
    lat <= SERVICE_AREA.maxLat &&
    lng >= SERVICE_AREA.minLng &&
    lng <= SERVICE_AREA.maxLng
  );
}

/** Clamp a viewport to the service area so queries never scan beyond the Philippines. */
export function clampBounds(b: Bounds): Bounds {
  return {
    minLng: Math.max(b.minLng, SERVICE_AREA.minLng),
    minLat: Math.max(b.minLat, SERVICE_AREA.minLat),
    maxLng: Math.min(b.maxLng, SERVICE_AREA.maxLng),
    maxLat: Math.min(b.maxLat, SERVICE_AREA.maxLat),
  };
}

/** Great-circle distance in km (display only; the database computes sorting distances). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number) {
  return (d * Math.PI) / 180;
}

/** Turn-by-turn directions in Google Maps (research R11). */
export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatCoords({ lat, lng }: LatLng): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
}
